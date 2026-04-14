var FloQuest = FloQuest || {};

FloQuest.Player = (function() {

    var ANIM_DATA = {
        idle:                  { frames: 60,  cols: 8,  rows: 8,  loop: true  },
        walk_right:            { frames: 30,  cols: 8,  rows: 4,  loop: true  },
        walk_up:               { frames: 30,  cols: 8,  rows: 4,  loop: true  },
        walk_down:             { frames: 30,  cols: 8,  rows: 4,  loop: true  },
        walk_up60:             { frames: 30,  cols: 8,  rows: 4,  loop: true  },
        walk_down60:           { frames: 30,  cols: 8,  rows: 4,  loop: true  },
        picking:               { frames: 224, cols: 16, rows: 14, loop: false },
        death:                 { frames: 64,  cols: 8,  rows: 8,  loop: false },
        falling:               { frames: 100, cols: 8,  rows: 13, loop: true  },
        idle_to_walk_right:    { frames: 7,   cols: 4,  rows: 2,  loop: false },
        walk_right_to_idle:    { frames: 7,   cols: 4,  rows: 2,  loop: false },
        walk_right_to_picking: { frames: 8,   cols: 4,  rows: 2,  loop: false },
        picking_to_idle:       { frames: 8,   cols: 4,  rows: 2,  loop: false },
        walk_right_to_up:      { frames: 30,  cols: 8,  rows: 4,  loop: false },
        walk_up_to_right:      { frames: 30,  cols: 8,  rows: 4,  loop: false },
        walk_right_to_down:    { frames: 30,  cols: 8,  rows: 4,  loop: false },
        walk_down_to_right:    { frames: 30,  cols: 8,  rows: 4,  loop: false },
        walk_right_to_up60:    { frames: 30,  cols: 8,  rows: 4,  loop: false },
        walk_up60_to_right:    { frames: 30,  cols: 8,  rows: 4,  loop: false },
        walk_right_to_down60:  { frames: 30,  cols: 8,  rows: 4,  loop: false },
        walk_down60_to_right:  { frames: 30,  cols: 8,  rows: 4,  loop: false },
        walk_to_death:         { frames: 8,   cols: 4,  rows: 2,  loop: false },
        walk_to_falling:       { frames: 8,   cols: 4,  rows: 2,  loop: false },
        fall_in_hole:          { frames: 64,  cols: 8,  rows: 8,  loop: false }
    };

    return {
        ANIM_DATA: ANIM_DATA,

        /** Call from BootScene.preload() to load all spritesheets */
        preload: function(scene) {
            var keys = Object.keys(ANIM_DATA);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                scene.load.spritesheet(key, 'img/' + key + '_color.png', {
                    frameWidth: 128, frameHeight: 128
                });
                scene.load.image(key + '_n', 'img/' + key + '_normal.png');
            }
        },

        /** Call from BootScene.create() after textures are loaded */
        setupNormalMaps: function(scene) {
            var keys = Object.keys(ANIM_DATA);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var texture = scene.textures.get(key);
                var normalTex = scene.textures.get(key + '_n');
                if (texture && normalTex) {
                    texture.setDataSource(normalTex.getSourceImage());
                }
            }
        },

        /** Call from BootScene.create() to register all animations */
        createAnimations: function(scene) {
            var keys = Object.keys(ANIM_DATA);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var data = ANIM_DATA[key];
                var texture = scene.textures.get(key);
                var frameCount = texture.frameTotal - 1;
                var end = Math.min(data.frames - 1, frameCount - 1);
                if (end < 0) { console.warn('No frames for', key); continue; }
                scene.anims.create({
                    key: 'anim_' + key,
                    frames: scene.anims.generateFrameNumbers(key, { start: 0, end: end }),
                    frameRate: FloQuest.Config.ANIM_FPS,
                    repeat: data.loop ? -1 : 0
                });
            }
        },

        /** Create the lit player sprite at the given position */
        createSprite: function(scene, x, y) {
            var sprite = scene.add.sprite(x, y, 'idle');
            sprite.setScale(FloQuest.Config.SPRITE_SCALE);
            sprite.setLighting(true);
            sprite.setDepth(2);
            sprite.play('anim_idle');
            return sprite;
        },

        /** Check if the sprite is currently playing a walk animation */
        isWalking: function(sprite) {
            var anim = sprite.anims.currentAnim;
            return anim ? anim.key.indexOf('walk') !== -1 : false;
        }
    };
})();
