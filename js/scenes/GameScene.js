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
        this.lives = FloQuest.ScoreManager.getLivesForDifficulty();
        this.levelRunning = false;

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

        // Ending sprites — fired once at level complete, start of final walk_right cycles
        this._endingSprites = (this._bgData && this._bgData.endingSprites) || [];

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

        // DEBUG: light controls panel — gated by ?debug in URL
        var debugEnabled = new URLSearchParams(window.location.search).has('debug');
        if (debugEnabled) {
            var ambVal = ambR || 10;
            var lightMultVal = (lt.lightMultiplier != null ? lt.lightMultiplier : 1.0) * brightness;
            var forceOn = !!window._floquestForceCorrect;
            var debugPanel = document.createElement('div');
            debugPanel.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;background:#222;border:1px solid #555;border-radius:6px;padding:10px;font:12px monospace;color:#ccc;opacity:0.9;min-width:220px;';
            debugPanel.innerHTML = [
                '<div style="color:#888;font-size:10px;margin-bottom:6px;">DEBUG</div>',
                '<div style="margin-bottom:6px;">',
                '  <label>Ambient: <span id="dbgAmbVal">' + ambHex + '</span></label><br>',
                '  <input type="range" id="dbgAmb" min="0" max="255" value="' + ambVal + '" style="width:100%;">',
                '</div>',
                '<div style="margin-bottom:6px;">',
                '  <label>Level lights mult: <span id="dbgLvlVal">' + lightMultVal.toFixed(1) + '</span></label><br>',
                '  <input type="range" id="dbgLvl" min="0" max="50" value="' + Math.round(lightMultVal * 10) + '" step="1" style="width:100%;">',
                '</div>',
                '<button id="dbgToggle" style="width:100%;padding:4px;background:#333;color:#0f0;border:1px solid #0f0;font:bold 12px monospace;cursor:pointer;border-radius:3px;margin-bottom:4px;">Lights: ON</button>',
                '<button id="dbgForceCorrect" style="width:100%;padding:4px;background:#333;color:' + (forceOn ? '#ff0' : '#888') + ';border:1px solid ' + (forceOn ? '#ff0' : '#555') + ';font:bold 12px monospace;cursor:pointer;border-radius:3px;">Force Correct: ' + (forceOn ? 'ON' : 'OFF') + '</button>',
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

            document.getElementById('dbgForceCorrect').onclick = function() {
                window._floquestForceCorrect = !window._floquestForceCorrect;
                var on = window._floquestForceCorrect;
                this.textContent = 'Force Correct: ' + (on ? 'ON' : 'OFF');
                this.style.color = on ? '#ff0' : '#888';
                this.style.borderColor = on ? '#ff0' : '#555';
            };

            this._debugLightBtn = debugPanel;
        }

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

            // Tween position if needed — resolve on tween onComplete so the player snaps
            // to the exact target before the next step reads player.x (prevents cumulative drift).
            if (dx !== 0 || dy !== 0) {
                var targetX = scene.player.x + dx;
                var targetY = scene.player.y + dy;
                scene.tweens.add({
                    targets: scene.player,
                    x: targetX,
                    y: targetY,
                    duration: duration,
                    ease: 'Linear',
                    onComplete: function() {
                        scene.player.x = targetX;
                        scene.player.y = targetY;
                        resolve();
                    }
                });
            } else {
                scene.time.delayedCall(duration, resolve);
            }
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
            // scene._log('walkOneCycle DONE', 'moved ' + Math.round(scene.player.x - startX) + 'px');
        });
    }

    get isWalking() {
        return FloQuest.Player.isWalking(this.player);
    }

    // ===============================================================
    // Skip mode — always-on: click on answer jumps the player to the
    // natural lock position of the visible question.
    // ===============================================================

    /**
     * Show a question and arm skip tracking for it.
     * lockX = the X at which this question would naturally lock in (end of its decision window).
     * timerMs = countdown duration for the visible timer (omit / 0 / false = hide timer).
     */
    _showQuestionWithSkip(qIndex, lockX, timerMs) {
        var CFG = FloQuest.Config;
        this.questionUI.showQuestion(this.questions, qIndex, this.lives, CFG.TOTAL_QUESTIONS, timerMs || 0);
        this._currentQIndex = qIndex;
        this._currentQLockX = lockX;
        this._skipClicked = false;
        if (FloQuest.ScoreManager.getSkipAnimations()) {
            var self = this;
            this._skipPromise = this.questionUI.waitForAnswer().then(function() {
                self._skipClicked = true;
            });
        } else {
            this._skipPromise = null;
        }
    }

    /**
     * Run a step racing against skip. Returns true if skipped (and kills the tween).
     * If skip is disarmed (_skipPromise null), runs as a plain step.
     */
    async _stepRaceSkip(anim, cycles, dx, dy) {
        if (!this._skipPromise) {
            await this.step(anim, cycles, dx, dy);
            return false;
        }
        if (this._skipClicked) return true;
        var stepPromise = this.step(anim, cycles, dx, dy);
        var skipWon = await Promise.race([
            stepPromise.then(function() { return false; }),
            this._skipPromise.then(function() { return true; })
        ]);
        if (skipWon) this.tweens.killTweensOf(this.player);
        return skipWon;
    }

    /** Walk N walk_right cycles, interruptible by skip. Returns true if skipped. */
    async _walkRightSkipable(steps) {
        var WPX = FloQuest.Config.WALK_RIGHT_PX;
        for (var i = 0; i < steps; i++) {
            if (await this._stepRaceSkip('walk_right', 1, WPX, 0)) return true;
        }
        return false;
    }

    /** Post-skip teleport: jump the player to the current question's natural lock X, centered Y. */
    _handleSkipTeleport() {
        this.player.x = this._currentQLockX;
        this.player.y = FloQuest.CorridorSystem.getCenterY();
        this.player.setDepth(2);
        this.player.play('anim_walk_right', true);
        this.questionUI.hideTimer();
        this._log('SKIP Q' + (this._currentQIndex + 1) + ' → x=' + Math.round(this.player.x));
    }

    /**
     * Fade out, teleport to targetX (centered Y, depth 2, idle), fade in.
     * Used after timeout/death before retrying the current question.
     */
    async _respawn(targetX) {
        var CENTER_Y = FloQuest.CorridorSystem.getCenterY();
        await this.tweenPromise({ targets: this.player, alpha: 0, duration: 400 });
        this.player.x = targetX;
        this.player.y = CENTER_Y;
        this.player.setDepth(2);
        this.player.play('anim_idle');
        await this.tweenPromise({ targets: this.player, alpha: 1, duration: 400 });
    }

    /**
     * Re-show a question and run its full 13 s decision window
     * (idle 10 s + idle_to_walk_right + 3 walk_right). Used after respawn.
     */
    async _retryDecisionWindow(qIndex, lockX) {
        this._showQuestionWithSkip(qIndex, lockX, 13000);
        var skipped = false;
        if (await this._stepRaceSkip('idle', 5, 0, 0)) skipped = true;
        if (!skipped && await this._stepRaceSkip('idle_to_walk_right', 1, 0, 0)) skipped = true;
        if (!skipped && await this._walkRightSkipable(3)) skipped = true;
        if (skipped) this._handleSkipTeleport();
    }

    /** Transition to GameOverScene with fade. */
    async _goGameOver() {
        this.levelRunning = false;
        this.questionUI.hide();
        this.cameras.main.fadeOut(500);
        await this.delay(500);
        this.scene.start('GameOverScene', { level: this.levelNum });
    }

    /**
     * Compute the 3-sub-step diagonal movement for a corridor.
     * Horizontal is split equally across transIn + walk + transOut (DIAG_DX/3 each).
     * Vertical is (corridorY - centerY) / 3 per sub-step — variable, based on target corridor.
     */
    _diagMovement(corridorIndex) {
        var CFG = FloQuest.Config;
        var c = FloQuest.CorridorSystem.getCorridor(corridorIndex);
        var totalDy = c.y - FloQuest.CorridorSystem.getCenterY();
        return {
            dx: CFG.DIAG_DX / 3,
            dy: totalDy / 3,
            walk: c.walkType,
            transIn: c.transIn,
            transOut: c.transOut,
            returnIn: c.returnIn,
            returnWalk: c.returnWalk,
            returnOut: c.returnOut
        };
    }

    // ===============================================================
    // Level flow
    // ===============================================================

    async runLevel() {
        var CFG = FloQuest.Config;
        this.levelRunning = true;
        this.lives = FloQuest.ScoreManager.getLivesForDifficulty();

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

        // === Phase B — Question loop with corridor movement ===
        // Cycle per question (13 steps, 900px — 13 seconds):
        //   3 × walk_right             (decision window, Q_n visible) → LOCK          3s / 300px
        //   3 × diag to corridor       (transIn + walk + transOut)                    3s / DIAG
        //   4 × walk_right in corridor                                                4s / 400px
        //   3 × diag back to center    (returnIn + returnWalk + returnOut)            3s / DIAG
        // Q1 special: show + idle(5 cycles = 10s reading time) + idle_to_walk_right + 3 walk_right
        //   → Q1 visible ~13s, matching Q2+.
        // Skip mode (if option enabled): answer click teleports to the visible question's natural lock X.
        var WPX = CFG.WALK_RIGHT_PX;
        var DIAG = CFG.DIAG_DX;
        var CORRIDOR_STEPS = 4;  // walk_right cycles inside the corridor
        var cycleStride = 3 * WPX + DIAG + CORRIDOR_STEPS * WPX + DIAG;  // 900px

        console.log('[LOOP] START x=' + Math.round(this.player.x) +
            ' | cycle stride=' + cycleStride + 'px' +
            ' (3×' + WPX + ' + ' + DIAG + ' + ' + CORRIDOR_STEPS + '×' + WPX + ' + ' + DIAG + ')');

        // Timer duration: 13s for full display (idle+decision for Q1, corridor+decision for Q_{n+1}).
        var TIMER_FULL = 13000;

        // --- Q1: show now (still idle from picking_to_idle), 10s idle, transition, 3 walk_right ---
        var q1LockX = this.player.x + 3 * WPX;
        this._showQuestionWithSkip(0, q1LockX, TIMER_FULL);

        var q1Skipped = false;
        if (await this._stepRaceSkip('idle', 5, 0, 0)) q1Skipped = true;
        if (!q1Skipped && await this._stepRaceSkip('idle_to_walk_right', 1, 0, 0)) q1Skipped = true;
        if (!q1Skipped && await this._walkRightSkipable(3)) q1Skipped = true;

        if (q1Skipped) this._handleSkipTeleport();

        // --- Main loop: lock in Q_n, then branch on correct / wrong / timeout ---
        for (var q = 0; q < CFG.TOTAL_QUESTIONS; q++) {
            if (!this.levelRunning) return;

            var answer = this.questionUI.lockIn();
            if (window._floquestForceCorrect) {
                answer.correct = true;
                answer.timedOut = false;
            }
            var curLockX = this.player.x;
            var hasNext = q + 1 < CFG.TOTAL_QUESTIONS;

            this._log('Q' + (q + 1) + ' LOCK',
                'corridor=' + answer.corridor + ' correct=' + answer.correct +
                (answer.timedOut ? ' TIMEOUT' : ''));

            // ----- TIMEOUT — fall_in_hole in place, respawn, retry -----
            if (answer.timedOut) {
                this._skipPromise = null;
                FloQuest.AudioManager.play('trap');
                await this.step('fall_in_hole', 1, 0, 0);
                await this.delay(400);
                this.lives--;
                FloQuest.ScoreManager.recordError();
                this._log('TIMEOUT done, lives=' + this.lives);
                if (this.lives <= 0) { await this._goGameOver(); return; }
                await this._respawn(curLockX - 3 * WPX);
                await this._retryDecisionWindow(q, curLockX);
                q--;
                continue;
            }

            var ci = answer.corridor;
            var m = this._diagMovement(ci);

            // ----- WRONG — diag to corridor + 2 walk_right + death/falling + respawn + retry -----
            if (!answer.correct) {
                this._skipPromise = null;

                // Death point is 5 s from now (transIn 1 s + walk 1 s + transOut 1 s + 2× walk_right 2 s).
                // Trap sprites anticipate by trapOffset[ci] frames.
                var trapPromise = this._scheduleTrapAnimations(ci, 5000, q);

                // Player moves to the corridor's layer while it traverses the lane.
                this.player.setDepth(ci + 1 + 0.5);

                await this.step(m.transIn,  1, m.dx, m.dy);
                await this.step(m.walk,     1, m.dx, m.dy);
                await this.step(m.transOut, 1, m.dx, m.dy);
                await this.step('walk_right', 1, WPX, 0);
                await this.step('walk_right', 1, WPX, 0);

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
                    await this.delay(300);
                } else {
                    await this.step('walk_to_death', 1, 0, 0);
                    await this.step('death', 1, 0, 0);
                    await this.delay(500);
                }

                await trapPromise;
                this._resetTrapSprites();

                this.lives--;
                FloQuest.ScoreManager.recordError();
                this._log('WRONG done, lives=' + this.lives);
                if (this.lives <= 0) { await this._goGameOver(); return; }

                await this._respawn(curLockX - 3 * WPX);
                await this._retryDecisionWindow(q, curLockX);
                q--;
                continue;
            }

            // ----- CORRECT — full corridor cycle + 3 walk_right decision for Q_{n+1} -----
            if (hasNext) {
                var nextLockX = curLockX + cycleStride;
                this._showQuestionWithSkip(q + 1, nextLockX, TIMER_FULL);
            } else {
                this._skipPromise = null;
            }

            // Player moves to the corridor's layer while it traverses the lane.
            this.player.setDepth(ci + 1 + 0.5);

            var ops = [
                { anim: m.transIn,    dx: m.dx, dy: m.dy },
                { anim: m.walk,       dx: m.dx, dy: m.dy },
                { anim: m.transOut,   dx: m.dx, dy: m.dy }
            ];
            for (var cs = 0; cs < CORRIDOR_STEPS; cs++) {
                ops.push({ anim: 'walk_right', dx: WPX, dy: 0 });
            }
            ops.push({ anim: m.returnIn,   dx: m.dx, dy: -m.dy });
            ops.push({ anim: m.returnWalk, dx: m.dx, dy: -m.dy });
            ops.push({ anim: m.returnOut,  dx: m.dx, dy: -m.dy });

            var skipped = false;
            for (var i = 0; i < ops.length; i++) {
                if (await this._stepRaceSkip(ops[i].anim, 1, ops[i].dx, ops[i].dy)) {
                    skipped = true;
                    break;
                }
            }

            // Back at centre — restore default depth (skip teleport also restores).
            this.player.setDepth(2);

            if (skipped) {
                this._handleSkipTeleport();
            } else if (hasNext) {
                if (await this._walkRightSkipable(3)) {
                    this._handleSkipTeleport();
                }
            }
        }

        // === Level complete ===
        this._log('=== LEVEL COMPLETE ===');
        this.questionUI.hide();

        // Ending sprites fire now, in parallel with the final walk_right reveal.
        var endingPromise = this._scheduleEndingAnimations();

        // 5 walk_right to reveal the "goal reached" graphic at the end of the level.
        await this.step('walk_right', 5, 5 * WPX, 0);

        await endingPromise;

        if (this.isWalking) {
            await this.step('walk_right_to_idle', 1, 0, 0);
        }
        this.player.play('anim_idle');

        FloQuest.ScoreManager.completeLevel();
        FloQuest.ScoreManager.saveProgress();

        // Narrative ending screen — wait for user to click "Continua"
        var endingText = this.levelData.ending || '';
        if (endingText) {
            var self = this;
            await new Promise(function(resolve) {
                self.questionUI.showNarrative(endingText, 'Continua', resolve, {
                    header: 'Livello ' + self.levelNum + ' — ' + self.levelData.name,
                    lives: self.lives
                });
            });
            this.questionUI.hide();
        }

        this.cameras.main.fadeOut(500);
        await this.delay(500);
        this.scene.start('LevelCompleteScene', { level: this.levelNum });
    }

    // ===============================================================
    // Trap sprite animations
    // ===============================================================

    /**
     * Schedule trap sprite animations relative to the upcoming death point.
     * Each trap sprite fires `trapOffset[corridor]` frames BEFORE impact so its
     * visual coincides with the player's death animation.
     * trapCorridor = 4 means "fires in any corridor".
     * trapQuestion (1..10) pins a trap to a specific question; 0/missing = any.
     * Returns a Promise that resolves when every scheduled trap has finished.
     */
    _scheduleTrapAnimations(corridor, msToDeathAnim, questionIndex) {
        var scene = this;
        var FPS = FloQuest.Config.ANIM_FPS;
        var promises = [];
        var qNum = questionIndex + 1;

        this._trapSprites.forEach(function(trap) {
            var el = trap.el;
            if (el.trapCorridor !== 4 && el.trapCorridor !== corridor) return;
            if (el.trapQuestion && el.trapQuestion !== qNum) return;

            var offsets = el.trapOffset || [0, 0, 0, 0];
            var offsetFrames = offsets[corridor] || 0;
            var anticipationMs = (offsetFrames / FPS) * 1000;
            var delayMs = Math.max(0, msToDeathAnim - anticipationMs);

            promises.push(new Promise(function(resolve) {
                scene.time.delayedCall(delayMs, function() {
                    if (el.trapHidden !== false) trap.sprite.setVisible(true);

                    if (el.trapAnimType === 'tween' && el.trapTween) {
                        var tweenConfig = {
                            targets: trap.sprite,
                            duration: el.trapTweenDuration || 500,
                            ease: el.trapTweenEase || 'Linear',
                            onComplete: resolve
                        };
                        el.trapTween.forEach(function(tw) { tweenConfig[tw.prop] = tw.to; });
                        scene.tweens.add(tweenConfig);
                    } else if (trap.animKey) {
                        trap.sprite.play(trap.animKey);
                        trap.sprite.once('animationcomplete', resolve);
                    } else {
                        resolve();
                    }
                });
            }));
        });

        return promises.length > 0 ? Promise.all(promises) : Promise.resolve();
    }

    /**
     * Fire every ending sprite at once (frame anim or tween).
     * Returns a Promise that resolves when all have finished.
     */
    _scheduleEndingAnimations() {
        var scene = this;
        var promises = [];

        this._endingSprites.forEach(function(ending) {
            var el = ending.el;
            promises.push(new Promise(function(resolve) {
                if (el.endingHidden !== false) ending.sprite.setVisible(true);

                if (el.endingAnimType === 'tween' && el.endingTween) {
                    var tweenConfig = {
                        targets: ending.sprite,
                        duration: el.endingTweenDuration || 500,
                        ease: el.endingTweenEase || 'Linear',
                        onComplete: resolve
                    };
                    el.endingTween.forEach(function(tw) { tweenConfig[tw.prop] = tw.to; });
                    scene.tweens.add(tweenConfig);
                } else if (ending.animKey) {
                    ending.sprite.play(ending.animKey);
                    ending.sprite.once('animationcomplete', resolve);
                } else {
                    resolve();
                }
            }));
        });

        return promises.length > 0 ? Promise.all(promises) : Promise.resolve();
    }

    /** Reset every trap sprite to its initial state (for retry). */
    _resetTrapSprites() {
        this._trapSprites.forEach(function(trap) {
            var el = trap.el;
            var s = trap.sprite;
            if (el.trapHidden !== false) s.setVisible(false);
            s.x = trap.origX;
            s.y = trap.origY;
            if (el.trapAnimType === 'tween' && el.trapTween) {
                // Editor position wins for x/y; tw.from resets other tweened props (alpha, scale, rotation, …).
                el.trapTween.forEach(function(tw) {
                    if (tw.from != null && tw.prop !== 'x' && tw.prop !== 'y') {
                        s[tw.prop] = tw.from;
                    }
                });
            }
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
