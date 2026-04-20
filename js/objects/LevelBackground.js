var FloQuest = FloQuest || {};

/**
 * LevelBackground — loads and renders level layouts from editor JSON.
 *
 * JSON format (from level_editor.html):
 *   { skyHeight, elements: [...], textures: { id: { name, w, h } } }
 *
 * Element types:
 *   rect   — { x, y, w, h, texId, layer, tile:true }
 *   sprite — { x, y, w, h, texId, layer, tile:false }
 *   light  — { x, y, lightMode, lightColor, lightIntensity, lightRadius?, lightDirX/Y/Z? }
 */
FloQuest.LevelBackground = {

    /** Call from scene.preload(). Loads the level JSON then queues its textures. */
    preload: function(scene, levelNum) {
        var journeyId = FloQuest.ScoreManager.currentJourney || 1;
        var jsonKey = 'level_layout_' + journeyId + '_' + levelNum;
        scene.load.json(jsonKey, 'levels/' + journeyId + '/' + levelNum + '.json');

        // After JSON loads, queue the texture images it references
        scene.load.once('filecomplete-json-' + jsonKey, function() {
            var data = scene.cache.json.get(jsonKey);
            if (!data || !data.textures) return;

            var loaded = {};
            Object.entries(data.textures).forEach(function(entry) {
                var texId = entry[0];
                var tex = entry[1];
                var imgKey = 'lvl_' + tex.name;
                if (!loaded[imgKey]) {
                    if (tex.frameWidth) {
                        scene.load.spritesheet(imgKey, 'img/bg/' + tex.name + '.png', {
                            frameWidth: tex.frameWidth,
                            frameHeight: tex.frameHeight
                        });
                    } else {
                        scene.load.image(imgKey, 'img/bg/' + tex.name + '.png');
                    }
                    loaded[imgKey] = true;
                }
            });
        });
    },

    /** Call from scene.create(). Renders all elements and adds lights. Returns created objects. */
    create: function(scene, levelNum) {
        var journeyId = FloQuest.ScoreManager.currentJourney || 1;
        var jsonKey = 'level_layout_' + journeyId + '_' + levelNum;
        var data = scene.cache.json.get(jsonKey);

        if (!data) {
            console.warn('LevelBackground: no layout data for level ' + levelNum);
            return { elements: [], lights: [] };
        }

        var skyHeight = data.skyHeight || 0;
        var elements = data.elements || [];
        var texMap = data.textures || {};
        var lighting = data.lighting || {};

        // Build texId → Phaser image key mapping
        var keyMap = {};
        Object.entries(texMap).forEach(function(entry) {
            keyMap[entry[0]] = 'lvl_' + entry[1].name;
        });

        var created = { sprites: [], lights: [], trapSprites: [], endingSprites: [], pickSprite: null, skyHeight: skyHeight, lighting: lighting };

        // Sort non-light elements by layer
        var visual = elements.filter(function(el) { return el.type !== 'light'; });
        visual.sort(function(a, b) { return (a.layer || 0) - (b.layer || 0); });

        // Helper: parse hex tint string to Phaser color number
        function parseTint(tint) {
            if (!tint) return null;
            return parseInt(tint.replace('#', ''), 16);
        }

        // Helper: apply tint to a game object if set
        function applyTint(obj, el) {
            var t = parseTint(el.tint);
            if (t !== null) obj.setTint(t);
        }

        // Helper: apply flip and rotation (switches to center origin when needed)
        function applyTransform(obj, el) {
            if (!el.flipX && !el.flipY && !el.rotation) return;
            obj.setOrigin(0.5, 0.5);
            obj.setPosition(el.x + el.w / 2, el.y + el.h / 2);
            if (el.flipX) obj.setFlipX(true);
            if (el.flipY) obj.setFlipY(true);
            if (el.rotation) obj.setAngle(el.rotation);
        }

        // Render visual elements
        visual.forEach(function(el) {
            var imgKey = keyMap[el.texId];
            var texInfo = texMap[el.texId];
            if (!imgKey || !scene.textures.exists(imgKey)) {
                // No texture — draw colored placeholder
                var g = scene.add.graphics().setDepth(el.layer || 0);
                g.fillStyle(0x2a1a2a, 0.5);
                g.fillRect(el.x, el.y, el.w, el.h);
                created.sprites.push(g);
                return;
            }

            var isTrap = !!el.trap;
            var isEnding = !!el.ending && !isTrap;

            // Animated spritesheet
            if (texInfo && texInfo.frameWidth) {
                // Trap/ending sprites get a one-shot anim; normal sprites loop
                var animKey = 'lvlanim_' + el.texId;
                var oneShot = isTrap || isEnding;
                var oneShotKey = isTrap ? ('lvlanim_trap_' + el.id) : ('lvlanim_ending_' + el.id);
                var playKey = oneShot ? oneShotKey : animKey;

                if (!scene.anims.exists(playKey)) {
                    var totalFrames = scene.textures.get(imgKey).frameTotal;
                    var fc = totalFrames > 1 ? totalFrames - 1 : 1;
                    scene.anims.create({
                        key: playKey,
                        frames: scene.anims.generateFrameNumbers(imgKey, { start: 0, end: fc - 1 }),
                        frameRate: texInfo.frameRate || 10,
                        repeat: oneShot ? 0 : -1
                    });
                }
                var animSprite = scene.add.sprite(el.x, el.y, imgKey, 0)
                    .setOrigin(0, 0)
                    .setDisplaySize(el.w, el.h)
                    .setDepth(el.layer || 0);
                applyTint(animSprite, el);
                applyTransform(animSprite, el);

                if (el.pick) {
                    animSprite.play(playKey);
                    created.pickSprite = animSprite;
                } else if (isTrap) {
                    if (el.trapHidden !== false) animSprite.setVisible(false);
                    created.trapSprites.push({
                        sprite: animSprite,
                        el: el,
                        animKey: playKey,
                        origX: el.x, origY: el.y
                    });
                } else if (isEnding) {
                    if (el.endingHidden !== false) animSprite.setVisible(false);
                    created.endingSprites.push({
                        sprite: animSprite,
                        el: el,
                        animKey: playKey,
                        origX: el.x, origY: el.y
                    });
                } else {
                    animSprite.play(playKey);
                }
                created.sprites.push(animSprite);
                return;
            }

            if (el.tile) {
                // Phaser 4: TileSprite nativo con UV wrapping — un solo oggetto
                var ts = scene.add.tileSprite(el.x, el.y, el.w, el.h, imgKey)
                    .setOrigin(0, 0)
                    .setDepth(el.layer || 0);
                applyTint(ts, el);
                created.sprites.push(ts);
            } else {
                var sprite = scene.add.image(el.x, el.y, imgKey)
                    .setOrigin(0, 0)
                    .setDisplaySize(el.w, el.h)
                    .setDepth(el.layer || 0);
                applyTint(sprite, el);
                applyTransform(sprite, el);

                if (el.pick) {
                    created.pickSprite = sprite;
                } else if (isTrap) {
                    // Trap sprite (static image or tween-only): hide if configured, apply tween from values
                    if (el.trapHidden !== false) sprite.setVisible(false);
                    if (el.trapAnimType === 'tween' && el.trapTween) {
                        // Editor position (el.x/el.y) wins for x/y — tw.from applies only to other props.
                        el.trapTween.forEach(function(tw) {
                            if (tw.from != null && tw.prop !== 'x' && tw.prop !== 'y') {
                                sprite[tw.prop] = tw.from;
                            }
                        });
                    }
                    created.trapSprites.push({
                        sprite: sprite,
                        el: el,
                        animKey: null,
                        origX: el.x, origY: el.y
                    });
                } else if (isEnding) {
                    if (el.endingHidden !== false) sprite.setVisible(false);
                    if (el.endingAnimType === 'tween' && el.endingTween) {
                        el.endingTween.forEach(function(tw) {
                            if (tw.from != null && tw.prop !== 'x' && tw.prop !== 'y') {
                                sprite[tw.prop] = tw.from;
                            }
                        });
                    }
                    created.endingSprites.push({
                        sprite: sprite,
                        el: el,
                        animKey: null,
                        origX: el.x, origY: el.y
                    });
                }

                created.sprites.push(sprite);
            }
        });

        // Generate glow texture (once per scene)
        var glowKey = '_lvl_glow';
        if (!scene.textures.exists(glowKey)) {
            var glowSize = 256;
            var canvas = document.createElement('canvas');
            canvas.width = glowSize; canvas.height = glowSize;
            var gctx = canvas.getContext('2d');
            var grad = gctx.createRadialGradient(glowSize/2, glowSize/2, 0, glowSize/2, glowSize/2, glowSize/2);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.3, 'rgba(255,255,255,0.4)');
            grad.addColorStop(0.6, 'rgba(255,255,255,0.1)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            gctx.fillStyle = grad;
            gctx.fillRect(0, 0, glowSize, glowSize);
            scene.textures.addCanvas(glowKey, canvas);
        }

        // Add lights
        var lightMult = lighting.lightMultiplier != null ? lighting.lightMultiplier : 1.0;
        var lightEls = elements.filter(function(el) { return el.type === 'light'; });
        lightEls.forEach(function(el) {
            if (el.lightMode === 'directional') {
                created.lights.push({
                    type: 'directional',
                    dirX: el.lightDirX || 0,
                    dirY: el.lightDirY || 0,
                    dirZ: el.lightDirZ || 0.5,
                    color: el.lightColor || '#fff2dd',
                    intensity: (el.lightIntensity || 1.0) * lightMult
                });
            } else {
                // Point light — Phaser light system
                var hex = (el.lightColor || '#fff2dd').replace('#', '');
                var colorNum = parseInt(hex, 16);
                var radius = el.lightRadius || 400;
                var intensity = (el.lightIntensity || 1.0) * lightMult;
                var light = scene.lights.addLight(
                    el.x, el.y, radius, colorNum, intensity
                );
                created.lights.push({ type: 'point', light: light });

                // Visual glow sprite (additive blend, not affected by light pipeline)
                var glowSprite = scene.add.image(el.x, el.y, glowKey)
                    .setDisplaySize(radius * 2, radius * 2)
                    .setBlendMode(Phaser.BlendModes.ADD)
                    .setAlpha(Math.min(0.5, intensity * 0.2))
                    .setDepth(6);
                glowSprite.setLighting(false);
                glowSprite.setTint(colorNum);
                created.sprites.push(glowSprite);
            }
        });

        return created;
    }
};
