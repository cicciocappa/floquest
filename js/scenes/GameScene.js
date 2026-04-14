var FloQuest = FloQuest || {};

FloQuest.GameScene = class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        // Store data for use in preload (init runs before preload)
        this._initData = data;
    }

    preload() {
        var levelNum = (this._initData && this._initData.level) || 1;

        // Load level layout JSON + its textures
        FloQuest.LevelBackground.preload(this, levelNum);
    }

    create(data) {
        var CFG = FloQuest.Config;

        this.levelNum = (this._initData && this._initData.level) || data.level || 1;
        this.levelData = FloQuest.Levels[this.levelNum - 1];
        this.questions = FloQuest.Questions[this.levelNum];

        // Game state
        this.lives = CFG.LIVES_PER_LEVEL;
        this.levelRunning = false;
        this.firstTryMap = {};
        this.questionStartTime = 0;

        // Trap animation type for this level
        this.trapAnimType = this.levelData.trapAnim || CFG.TRAP_ANIM[this.levelData.trap] || 'death';

        var W = CFG.VIEWPORT_W;
        var H = CFG.VIEWPORT_H;
        var CENTER_Y = H / 2;

        // Ensure normal maps are attached (Phaser 4 built-in lighting)
        FloQuest.Player.setupNormalMaps(this);

        // Lighting — enable before background so level lights can be added
        this.lights.enable();

        // Background (adds level elements + lights from JSON)
        this._drawBackground();

        // Trap sprites from level layout
        this._trapSprites = (this._bgData && this._bgData.trapSprites) || [];

        // Pick sprite (object the player picks up at level start)
        this._pickSprite = (this._bgData && this._bgData.pickSprite) || null;

        // Apply lighting config from level JSON, scaled by user brightness
        var lt = (this._bgData && this._bgData.lighting) || {};
        var ambHex = (lt.ambientColor || '#0a0a10').replace('#', '');
        var brightness = FloQuest.ScoreManager.getBrightness();

        // Scale ambient color by brightness factor
        var ambR = parseInt(ambHex.substring(0, 2), 16);
        var ambG = parseInt(ambHex.substring(2, 4), 16);
        var ambB = parseInt(ambHex.substring(4, 6), 16);
        ambR = Math.min(255, Math.round(ambR * brightness));
        ambG = Math.min(255, Math.round(ambG * brightness));
        ambB = Math.min(255, Math.round(ambB * brightness));
        this.lights.setAmbientColor(Phaser.Display.Color.GetColor(ambR, ambG, ambB));

        // Scale all level light intensities by brightness factor
        if (brightness !== 1.0 && this._bgData) {
            this._bgData.lights.forEach(function(entry) {
                if (entry.type === 'point' && entry.light) {
                    entry.light.intensity *= brightness;
                }
            });
        }

        // Configure corridors based on level skyHeight
        var skyH = (this._bgData && this._bgData.skyHeight) || 0;
        FloQuest.CorridorSystem.configure(skyH);
        CENTER_Y = FloQuest.CorridorSystem.getCenterY();

        // Player light — optional per level (e.g. disabled for torch-lit temples, enabled for outdoor)
        if (lt.playerLight) {
            var plHex = (lt.playerLightColor || '#fff2dd').replace('#', '');
            this.playerLight = this.lights.addLight(
                200, CENTER_Y,
                lt.playerLightRadius || 400,
                parseInt(plHex, 16),
                lt.playerLightIntensity || 1.0
            );
        } else {
            this.playerLight = null;
        }

        // Player
        this.player = FloQuest.Player.createSprite(this, 200, CENTER_Y);

        // Camera — follow player horizontally, bounded to world
        this.cameras.main.setBounds(0, 0, CFG.WORLD_W, H);
        this.cameras.main.startFollow(this.player, true, 0.1, 0);
        this.cameras.main.setFollowOffset(-200, 0);

        // Question UI (HTML overlay, no scene reference needed)
        this.questionUI = FloQuest.QuestionUI.create();

        // Keyboard input — 1-4 to select answers
        var self = this;
        this.input.keyboard.on('keydown', function(event) {
            if (event.key >= '1' && event.key <= '4') {
                self.questionUI.selectAnswer(parseInt(event.key) - 1);
            }
        });

        // DEBUG: light controls panel
        var ambVal = ambR || 10;
        var lightMultVal = (lt.lightMultiplier != null ? lt.lightMultiplier : 1.0) * brightness;
        var debugPanel = document.createElement('div');
        debugPanel.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;background:#222;border:1px solid #555;border-radius:6px;padding:10px;font:12px monospace;color:#ccc;opacity:0.9;min-width:220px;';
        debugPanel.innerHTML = [
            '<div style="color:#888;font-size:10px;margin-bottom:6px;">LIGHT DEBUG</div>',
            '<div style="margin-bottom:6px;">',
            '  <label>Ambient: <span id="dbgAmbVal">' + ambHex + '</span></label><br>',
            '  <input type="range" id="dbgAmb" min="0" max="255" value="' + ambVal + '" style="width:100%;">',
            '</div>',
            '<div style="margin-bottom:6px;">',
            '  <label>Level lights mult: <span id="dbgLvlVal">' + lightMultVal.toFixed(1) + '</span></label><br>',
            '  <input type="range" id="dbgLvl" min="0" max="50" value="' + Math.round(lightMultVal * 10) + '" step="1" style="width:100%;">',
            '</div>',
            '<button id="dbgToggle" style="width:100%;padding:4px;background:#333;color:#0f0;border:1px solid #0f0;font:bold 12px monospace;cursor:pointer;border-radius:3px;">Lights: ON</button>',
        ].join('');
        document.body.appendChild(debugPanel);

        var lvlLightBaseIntensities = [];
        self.lights.lights.forEach(function(l) {
            if (l !== self.playerLight) lvlLightBaseIntensities.push({ light: l, base: l.intensity });
        });

        document.getElementById('dbgAmb').oninput = function() {
            var v = parseInt(this.value);
            self.lights.setAmbientColor(Phaser.Display.Color.GetColor(v, v, Math.min(255, v + 6)));
            document.getElementById('dbgAmbVal').textContent = v.toString(16).padStart(2, '0').repeat(3);
        };
        document.getElementById('dbgLvl').oninput = function() {
            var mult = parseInt(this.value) / 10;
            document.getElementById('dbgLvlVal').textContent = mult.toFixed(1);
            lvlLightBaseIntensities.forEach(function(entry) { entry.light.intensity = entry.base * mult; });
        };

        var lightsOn = true;
        document.getElementById('dbgToggle').onclick = function() {
            var btn = this;
            if (lightsOn) {
                self.lights.setAmbientColor(0xffffff);
                lvlLightBaseIntensities.forEach(function(entry) { entry.light.intensity = 0; });
                btn.textContent = 'Lights: OFF'; btn.style.color = '#f44'; btn.style.borderColor = '#f44';
            } else {
                document.getElementById('dbgAmb').dispatchEvent(new Event('input'));
                document.getElementById('dbgLvl').dispatchEvent(new Event('input'));
                btn.textContent = 'Lights: ON'; btn.style.color = '#0f0'; btn.style.borderColor = '#0f0';
            }
            lightsOn = !lightsOn;
        };

        this._debugLightBtn = debugPanel;

        // Clean up when scene shuts down
        this.events.on('shutdown', function() {
            if (self._debugLightBtn) { self._debugLightBtn.remove(); self._debugLightBtn = null; }
            if (self._introPanel) { self._introPanel.remove(); self._introPanel = null; }
            if (self.questionUI) self.questionUI.destroy();
            // Remove level background textures so next level can load its own
            self.textures.remove('lvl_picking');
            for (var i = 0; i < self._tileCount; i++) {
                self.textures.remove('lvl_tile' + i);
            }
        });

        // Start level music based on environment
        FloQuest.MusicPlayer.play(this.levelData.environment || 'temple');

        // Start
        this.cameras.main.fadeIn(300);
        this.runLevel();
    }

    update() {
        // Track light to player (if enabled)
        if (this.playerLight) {
            this.playerLight.x = this.player.x;
            this.playerLight.y = this.player.y - 30;
        }

        // Update question timer display
        this.questionUI.updateTimer();
    }

    // ===============================================================
    // Debug logging helper
    // ===============================================================

    _log(event, extra) {
        var parts = '[GameScene] ' + event;
        if (this.player) {
            var camX = Math.round(this.cameras.main.scrollX);
            var px = Math.round(this.player.x);
            var py = Math.round(this.player.y);
            parts += '  |  player=(' + px + ', ' + py + ')' +
                '  cam.scrollX=' + camX +
                '  viewport=(' + camX + '–' + (camX + FloQuest.Config.VIEWPORT_W) + ')';
        }
        if (extra) parts += '  ' + extra;
        console.log(parts);
    }

    // ===============================================================
    // Animation helpers
    // ===============================================================

    delay(ms) {
        return new Promise(function(resolve) { this.time.delayedCall(ms, resolve); }.bind(this));
    }

    tweenPromise(config) {
        var scene = this;
        return new Promise(function(resolve) {
            scene.tweens.add(Object.assign({}, config, { onComplete: resolve }));
        });
    }

    /**
     * Play an animation for a given number of cycles, optionally moving the player.
     * Returns a promise that resolves when done.
     */
    step(animKey, cycles, dx, dy, continueAnim) {
        var scene = this;
        return new Promise(function(resolve) {
            var data = FloQuest.Player.ANIM_DATA[animKey];
            if (!data) { console.warn('Unknown anim:', animKey); resolve(); return; }

            var phaserAnim = scene.anims.get('anim_' + animKey);
            if (!phaserAnim) { console.warn('Anim not created:', animKey); resolve(); return; }

            var actualFrames = phaserAnim.frames.length;
            var totalFrames = data.loop ? actualFrames * cycles : actualFrames;
            var duration = (totalFrames / FloQuest.Config.ANIM_FPS) * 1000;

            // Play or continue the animation
            if (continueAnim && scene.player.anims.currentAnim &&
                scene.player.anims.currentAnim.key === 'anim_' + animKey) {
                // keep playing
            } else {
                scene.player.play('anim_' + animKey);
            }

            // Tween position if needed
            if (dx !== 0 || dy !== 0) {
                scene.tweens.add({
                    targets: scene.player,
                    x: scene.player.x + dx,
                    y: scene.player.y + dy,
                    duration: duration,
                    ease: 'Linear'
                });
            }

            scene.time.delayedCall(duration, function() {
                scene._log('step DONE: ' + animKey + ' x' + cycles,
                    'dx=' + Math.round(dx || 0) + ' dy=' + Math.round(dy || 0));
                resolve();
            });
        });
    }

    /** Walk one cycle to the right (1 second, WALK_RIGHT_PX pixels) */
    walkOneCycle() {
        this.player.play('anim_walk_right', true);
        var scene = this;
        var startX = this.player.x;
        return this.tweenPromise({
            targets: this.player,
            x: this.player.x + FloQuest.Config.WALK_RIGHT_PX,
            duration: 1000,
            ease: 'Linear'
        }).then(function() {
            scene._log('walkOneCycle DONE',
                'moved ' + Math.round(scene.player.x - startX) + 'px');
        });
    }

    get isWalking() {
        return FloQuest.Player.isWalking(this.player);
    }

    // ===============================================================
    // Level flow
    // ===============================================================

    async runLevel() {
        var CFG = FloQuest.Config;
        this.levelRunning = true;
        this.lives = CFG.LIVES_PER_LEVEL;

        this._log('=== LEVEL START === level=' + this.levelNum);

        // === Phase A — Intro ===
        this._log('Phase A — Intro BEGIN');

        // Show level intro panel and get a promise that resolves on "INIZIA" click
        var introReady = this._showIntroPanel();

        await this.step('idle', 2, 0, 0);
        await this.step('idle_to_walk_right', 1, 0, 0);
        await this.step('walk_right', CFG.WALK_CYCLES_APPROACH,
            CFG.WALK_RIGHT_PX * CFG.WALK_CYCLES_APPROACH, 0);
        await this.step('walk_right_to_picking', 1, 0, 0);

        // Animate pick sprite: delay until the player lifts it (~100 frames into picking)
        if (this._pickSprite) {
            var ps = this._pickSprite;
            var pickStartY = ps.y;
            var pickStartX = ps.x;
            var delayMs = (76 / CFG.ANIM_FPS) * 1000;
            var liftMs = (124 / CFG.ANIM_FPS) * 1000;
            this.tweens.add({
                targets: ps,
                y: pickStartY - 120,
                x: pickStartX - 30,
                delay: delayMs,
                duration: liftMs,
                ease: function(t) { return 1 - Math.pow(1 - t, 2.9); },
                onComplete: function() { ps.setVisible(false); }
            });
        }

        await this.step('picking', 1, 0, 0);
        await this.step('picking_to_idle', 1, 0, 0);

        // Ensure pick sprite is hidden after picking
        if (this._pickSprite) this._pickSprite.setVisible(false);

        // Wait for player to click "INIZIA" (instant if already clicked)
        await introReady;
        this._log('Phase A — Intro END');

        // === Phase B — Question loop ===
        var q = 0;
        while (q < CFG.TOTAL_QUESTIONS) {
            if (!this.levelRunning) return;

            this._log('Phase B — Question ' + (q + 1) + '/' + CFG.TOTAL_QUESTIONS + ' BEGIN');
            var result = await this.runQuestion(q);
            this._log('Phase B — Question ' + (q + 1) + ' result=' + result);

            if (result === 'correct') {
                q++;
            } else if (result === 'gameover') {
                this._log('=== GAME OVER ===');
                this.questionUI.hide();
                this.cameras.main.fadeOut(400);
                await this.delay(400);
                this.scene.start('GameOverScene', { level: this.levelNum });
                return;
            }
            // result === 'retry' → same question
        }

        // === Phase C — Bonus (placeholder for future implementation) ===
        // await this.runBonus();

        // === Level complete ===
        this._log('=== LEVEL COMPLETE ===');
        this.questionUI.hide();
        if (this.isWalking) {
            await this.step('walk_right_to_idle', 1, 0, 0);
        }
        this.player.play('anim_idle');

        FloQuest.ScoreManager.completeLevel();
        FloQuest.ScoreManager.saveProgress();

        this.cameras.main.fadeOut(500);
        await this.delay(500);
        this.scene.start('LevelCompleteScene', { level: this.levelNum });
    }

    // ===============================================================
    // Single question (B.1 → B.5)
    // ===============================================================

    async runQuestion(qIndex) {
        var CFG = FloQuest.Config;
        var WPX = CFG.WALK_RIGHT_PX;
        var CENTER_Y = FloQuest.CorridorSystem.getCenterY();

        // ----- B.1 — Question visible + Walk (= decision time) -----
        this._log('B.1 — Show question + Walk BEGIN');

        // Save position where the question appears (for timeout respawn)
        this.questionAppearX = this.player.x;

        // Show question (first time or after respawn)
        // For Q2+ after correct answer, it was already shown during B.5
        if (!this.questionUI.isVisible()) {
            this.questionUI.showQuestion(this.questions, qIndex, this.lives, CFG.TOTAL_QUESTIONS);
        }

        // Shorter walk if player already pre-selected during B.5
        var preSelected = this.questionUI.selectedCorridor !== -1;
        var walkCycles = preSelected ? CFG.WALK_CYCLES_PRE_SELECTED : CFG.WALK_CYCLES_QUESTION;

        // Transition from idle → walk if needed
        if (!this.isWalking) {
            await this.step('idle_to_walk_right', 1, 0, 0);
        }

        // Start timer
        this.questionUI.startTimer(walkCycles * 1000);
        this.questionStartTime = Date.now();

        this._log('B.1 — Walking ' + walkCycles + ' cycles (preSelected=' + preSelected + ')');

        // Walk cycle-by-cycle — player can select/change answer the whole time
        for (var i = 0; i < walkCycles; i++) {
            await this.walkOneCycle();
        }

        // === Point of no return — lock in answer ===
        this.questionUI._timerRunning = false;
        var answer = this.questionUI.lockIn();
        this.questionUI.hide();

        this._log('B.1 — LOCK IN', 'corridor=' + answer.corridor +
            ' correct=' + answer.correct + ' timedOut=' + !!answer.timedOut);

        if (!this.levelRunning) return 'gameover';

        // ----- TIMEOUT — fall in hole on the spot, respawn at question position -----
        if (answer.timedOut) {
            this._log('TIMEOUT — fall_in_hole in place');
            FloQuest.AudioManager.play('trap');
            this.firstTryMap[qIndex] = true;

            await this.step('fall_in_hole', 1, 0, 0);
            await this.delay(500);

            this.lives--;
            this._log('TIMEOUT — death done, lives=' + this.lives);

            if (this.lives <= 0) return 'gameover';

            // Respawn at position where the question appeared
            this._log('TIMEOUT — respawn at questionAppearX=' + Math.round(this.questionAppearX));
            await this.tweenPromise({ targets: this.player, alpha: 0, duration: 400 });
            this.player.x = this.questionAppearX;
            this.player.y = CENTER_Y;
            this.player.play('anim_idle');
            await this.tweenPromise({ targets: this.player, alpha: 1, duration: 400 });

            // Re-show same question
            this.questionUI.showQuestion(
                this.questions, qIndex, this.lives, CFG.TOTAL_QUESTIONS);

            return 'retry';
        }

        // ----- B.2 — Move to corridor -----
        this._log('B.2 — Move to corridor ' + (answer.corridor + 1) + ' BEGIN');
        this.preCorridorX = this.player.x;

        var ci = answer.corridor;
        var c = FloQuest.CorridorSystem.getCorridor(ci);
        var mov = FloQuest.CorridorSystem.calcMovement(ci);

        // If wrong answer, schedule trap animations NOW (before B.2 movement).
        // The trap will fire after (timeToDeathPoint - anticipation) ms,
        // so it visually arrives just as the player reaches the death spot.
        this._trapAnimPromise = Promise.resolve();
        if (!answer.correct) {
            var b2Frames = 30 + 30 + 30 * c.approachCycles + 30; // walk_right + transIn + walk + transOut
            var b3Frames = 60; // walk_right x2
            var framesToDeath = b2Frames + b3Frames;
            var msToDeathAnim = (framesToDeath / FloQuest.Config.ANIM_FPS) * 1000;
            this._scheduleTrapAnimations(ci, msToDeathAnim);
        }

        // Set player depth to match corridor layer (top of that layer)
        this.player.setDepth(ci + 1 + 0.5);

        await this.step('walk_right', 1, WPX, 0, true);
        await this.step(c.transIn, 1, mov.transIn.dx, mov.transIn.dy);
        if (c.approachCycles > 0) {
            await this.step(c.walkType, c.approachCycles, mov.walk.dx, mov.walk.dy);
        }
        await this.step(c.transOut, 1, mov.transOut.dx, mov.transOut.dy);
        this._log('B.2 — Arrived at corridor ' + (ci + 1));

        // ----- B.3 — Suspense walk in corridor -----
        this._log('B.3 — Suspense walk BEGIN');
        await this.step('walk_right', 2, WPX * 2, 0);
        this._log('B.3 — Suspense walk END');

        // ----- B.4 — Outcome -----
        if (answer.correct) {
            this._log('B.4 — CORRECT');
            return await this._handleCorrect(qIndex, ci, c, mov);
        } else {
            this._log('B.4 — WRONG (trap=' + this.trapAnimType + ')');
            return await this._handleWrong(qIndex, ci, c, mov);
        }
    }

    // ---------------------------------------------------------------
    // Correct answer
    // ---------------------------------------------------------------

    async _handleCorrect(qIndex, ci, corridor, mov) {
        var CFG = FloQuest.Config;
        var WPX = CFG.WALK_RIGHT_PX;

        FloQuest.AudioManager.play('correct');

        // Score
        var timeMs = Date.now() - this.questionStartTime;
        var firstTry = !this.firstTryMap[qIndex];
        var points = FloQuest.ScoreManager.calculateQuestionScore(timeMs, firstTry);
        FloQuest.ScoreManager.addScore(points);

        // Safe passage walk
        this._log('B.4 — Safe passage walk');
        await this.step('walk_right', 2, WPX * 2, 0);

        // ----- B.5 — Return to center (show next question early) -----
        this._log('B.5 — Return to center BEGIN');
        if (qIndex < CFG.TOTAL_QUESTIONS - 1) {
            this.questionUI.showQuestion(
                this.questions, qIndex + 1, this.lives, CFG.TOTAL_QUESTIONS);
        }

        await this.step(corridor.returnIn, 1, mov.transIn.dx, -mov.transIn.dy);
        if (corridor.approachCycles > 0) {
            await this.step(corridor.returnWalk, corridor.approachCycles,
                mov.walk.dx, -mov.walk.dy);
        }
        await this.step(corridor.returnOut, 1, mov.transOut.dx, -mov.transOut.dy);

        // Restore default player depth
        this.player.setDepth(2);

        this._log('B.5 — Return to center END');
        return 'correct';
    }

    // ---------------------------------------------------------------
    // Wrong answer — trap + respawn
    // ---------------------------------------------------------------

    async _handleWrong(qIndex, corridor) {
        var CFG = FloQuest.Config;
        var CENTER_Y = FloQuest.CorridorSystem.getCenterY();

        this.firstTryMap[qIndex] = true;

        // Play player death/falling animation
        // (trap animations were already scheduled before B.2 started)
        FloQuest.AudioManager.play('trap');
        if (this.trapAnimType === 'falling') {
            await this.step('walk_to_falling', 1, 0, 0);
            this.player.play('anim_falling');
            await this.tweenPromise({
                targets: this.player,
                y: this.player.y + 400,
                duration: 2000,
                ease: 'Quad.easeIn'
            });
            await this.delay(500);
        } else {
            await this.step('walk_to_death', 1, 0, 0);
            await this.step('death', 1, 0, 0);
            await this.delay(1200);
        }

        // Wait for trap animations to finish too
        await this._trapAnimPromise;

        this.lives--;
        this._log('B.4 — Trap done, lives=' + this.lives);

        if (this.lives <= 0) {
            return 'gameover';
        }

        // Reset trap sprites to initial state
        this._resetTrapSprites();

        // Respawn at position where the question appeared (before B.1 walk)
        this._log('B.4 — Respawn at x=' + Math.round(this.questionAppearX));
        await this.tweenPromise({ targets: this.player, alpha: 0, duration: 400 });
        this.player.x = this.questionAppearX;
        this.player.y = CENTER_Y;
        this.player.setDepth(2);
        this.player.play('anim_idle');
        await this.tweenPromise({ targets: this.player, alpha: 1, duration: 400 });

        // Re-show same question (reshuffled)
        this.questionUI.showQuestion(
            this.questions, qIndex, this.lives, CFG.TOTAL_QUESTIONS);

        return 'retry';
    }

    // ===============================================================
    // Trap sprite animations
    // ===============================================================

    /**
     * Schedule trap animations so they fire at the right moment relative to the
     * player death animation.  Called at lock-in (before B.2 movement starts).
     *
     * msToDeathAnim = time from NOW until the player reaches the death point.
     * trapOffset[corridor] = how many frames BEFORE the death the trap should start.
     *
     * So each trap fires after:  msToDeathAnim - (offsetFrames / FPS * 1000)  ms.
     * If the result is <= 0, the trap fires immediately.
     *
     * Stores the combined promise in this._trapAnimPromise.
     */
    _scheduleTrapAnimations(corridor, msToDeathAnim) {
        var scene = this;
        var FPS = FloQuest.Config.ANIM_FPS;
        var promises = [];

        this._trapSprites.forEach(function(trap) {
            var el = trap.el;
            // Filter: trapCorridor 4 = all corridors, otherwise must match
            if (el.trapCorridor !== 4 && el.trapCorridor !== corridor) return;

            // Calculate when to fire: death time minus the anticipation offset
            var offsets = el.trapOffset || [0, 0, 0, 0];
            var offsetFrames = offsets[corridor] || 0;
            var anticipationMs = (offsetFrames / FPS) * 1000;
            var delayMs = Math.max(0, msToDeathAnim - anticipationMs);

            var p = new Promise(function(resolve) {
                scene.time.delayedCall(delayMs, function() {
                    // Make visible if hidden
                    if (el.trapHidden !== false) trap.sprite.setVisible(true);

                    if (el.trapAnimType === 'tween' && el.trapTween) {
                        // Tween animation
                        var tweenConfig = {
                            targets: trap.sprite,
                            duration: el.trapTweenDuration || 500,
                            ease: el.trapTweenEase || 'Linear',
                            onComplete: resolve
                        };
                        el.trapTween.forEach(function(tw) {
                            tweenConfig[tw.prop] = tw.to;
                        });
                        scene.tweens.add(tweenConfig);
                    } else if (trap.animKey) {
                        // Frame-by-frame animation (one-shot)
                        trap.sprite.play(trap.animKey);
                        trap.sprite.once('animationcomplete', resolve);
                    } else {
                        resolve();
                    }
                });
            });
            promises.push(p);
        });

        this._trapAnimPromise = promises.length > 0 ? Promise.all(promises) : Promise.resolve();
    }

    /**
     * Reset all trap sprites to their initial state after a trap sequence.
     */
    _resetTrapSprites() {
        this._trapSprites.forEach(function(trap) {
            var el = trap.el;
            var s = trap.sprite;

            // Hide if configured
            if (el.trapHidden !== false) s.setVisible(false);

            // Reset position
            s.x = trap.origX;
            s.y = trap.origY;

            // Reset tween properties to initial values
            if (el.trapAnimType === 'tween' && el.trapTween) {
                el.trapTween.forEach(function(tw) {
                    if (tw.from != null) s[tw.prop] = tw.from;
                });
            }

            // Reset frame-by-frame animation to first frame
            if (trap.animKey) {
                s.anims.stop();
                s.setFrame(0);
            }
        });
    }

    // ===============================================================
    // Level intro panel
    // ===============================================================

    /**
     * Show the level intro panel with narration and "INIZIA" button.
     * Returns a Promise that resolves when the player clicks the button.
     * If clicked before picking ends, the panel is removed immediately.
     */
    _showIntroPanel() {
        var self = this;

        var panel = document.createElement('div');
        panel.id = 'intro-panel';
        document.body.appendChild(panel);

        var nameEl = document.createElement('div');
        nameEl.className = 'intro-level-name';
        nameEl.textContent = this.levelData.name;
        panel.appendChild(nameEl);

        var themeEl = document.createElement('div');
        themeEl.className = 'intro-level-theme';
        themeEl.textContent = this.levelData.theme;
        panel.appendChild(themeEl);

        var narEl = document.createElement('div');
        narEl.className = 'intro-narration';
        narEl.textContent = this.levelData.narration || this.levelData.description;
        panel.appendChild(narEl);

        var btn = document.createElement('button');
        btn.className = 'intro-start-btn';
        btn.textContent = 'INIZIA';
        panel.appendChild(btn);

        this._introPanel = panel;

        return new Promise(function(resolve) {
            btn.addEventListener('click', function() {
                self._hideIntroPanel();
                resolve();
            });
        });
    }

    _hideIntroPanel() {
        if (this._introPanel) {
            this._introPanel.remove();
            this._introPanel = null;
        }
    }

    // ===============================================================
    // Bonus phase (placeholder — structure ready for implementation)
    // ===============================================================

    async runBonus() {
        // Future: 60-second timer, 16 binary questions, pick the WRONG answer
        // Coins accumulate; wrong answer empties the bag and restarts
        // Score bonus based on coins at the end
    }

    // ===============================================================
    // Background (DEBUG — with grid labels and corridor Y markers)
    // ===============================================================

    _drawBackground() {
        var CFG = FloQuest.Config;
        var W = CFG.WORLD_W;
        var H = CFG.VIEWPORT_H;

        // Dark base fill
        var g = this.add.graphics().setDepth(0);
        g.fillStyle(0x0d0d18);
        g.fillRect(0, 0, W, H);

        // Load level layout from JSON
        this._bgData = FloQuest.LevelBackground.create(this, this.levelNum);
    }
};
