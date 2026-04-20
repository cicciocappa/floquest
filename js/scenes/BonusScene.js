var FloQuest = FloQuest || {};

/**
 * BonusScene — climbing-wall bonus round triggered after levels 3/6/9.
 *
 * Layout:
 *   [ QuestionUI (HTML, left) ]  [ climbing wall + character (Phaser, right) ]
 *
 * Flow:
 *   INTRO narrative + [Inizia] → 60s timer starts, wall begins scrolling.
 *   Loop of 12 binary questions with INVERTED logic: the player must pick
 *     the factually WRONG answer (the one at the index ≠ q.correct).
 *     - Factually wrong picked → streak++, next question.
 *     - Factually right picked → streak := 0, wall snaps back, restart from Q1.
 *   Resolution:
 *     - 12 consecutive wrong picks (streak === BONUS_QUESTIONS) → BONUS_COMPLETE points.
 *     - Timer expires → streak × BONUS_PER_STREAK points.
 *   Result narrative + [Continua] → route to data.nextScene with data.nextLevel.
 */
FloQuest.BonusScene = class BonusScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BonusScene' });
    }

    init(data) {
        this._afterLevel = (data && data.afterLevel) || 3;
        this._nextLevel = (data && data.nextLevel) || (this._afterLevel + 1);
        this._nextScene = (data && data.nextScene) || 'LevelIntroScene';
        this._done = false;
    }

    preload() {
        var jid = FloQuest.ScoreManager.currentJourney || 1;
        var journey = FloQuest.Journeys[jid - 1];
        var bonuses = (journey && journey.bonusLevels) || [];
        var cfg = null;
        for (var i = 0; i < bonuses.length; i++) {
            if (bonuses[i].after === this._afterLevel) { cfg = bonuses[i]; break; }
        }
        this._bonusCfg = cfg || { wall: null, wallHeight: FloQuest.Config.BONUS_WALL_HEIGHT_DEFAULT, intro: '', ending: '' };
        this._bonusIndex = FloQuest.Config.BONUS_AFTER_LEVELS.indexOf(this._afterLevel) + 1; // 1..3

        if (this._bonusCfg.wall) {
            this.load.image(this._wallKey(), this._bonusCfg.wall);
        }
    }

    _wallKey() {
        var jid = FloQuest.ScoreManager.currentJourney || 1;
        return 'bonus_wall_' + jid + '_' + this._bonusIndex;
    }

    create() {
        var self = this;
        var W = FloQuest.Config.VIEWPORT_W;
        var H = FloQuest.Config.VIEWPORT_H;
        var CFG = FloQuest.Config;

        // Load bonus questions for this bonus slot (fetched from Worker API at journey start)
        var pool = FloQuest.BonusQuestions || {};
        this._questions = pool[String(this._bonusIndex)] || [];
        if (this._questions.length < CFG.BONUS_QUESTIONS) {
            console.warn('BonusScene: only', this._questions.length, 'bonus questions for slot', this._bonusIndex);
        }

        this.cameras.main.setBackgroundColor('#0a0a10');
        FloQuest.Player.setupNormalMaps(this);
        this.lights.enable();
        this.lights.setAmbientColor(0xffffff);

        // --- Climbing wall (right half) ---
        this._wallViewW = CFG.BONUS_WALL_WIDTH;
        this._wallViewH = H;
        this._wallHeight = this._bonusCfg.wallHeight || CFG.BONUS_WALL_HEIGHT_DEFAULT;
        this._scrollSpeed = this._wallHeight / CFG.BONUS_DURATION; // px/sec

        this._layoutColumn();

        // Wall tile sprite (texture tiles vertically)
        var wallTex = this.textures.exists(this._wallKey()) ? this._wallKey() : null;
        if (wallTex) {
            this._wall = this.add.tileSprite(this._colCx, H / 2, this._wallViewW, this._wallViewH, wallTex);
        } else {
            // Fallback procedural wall: solid gold-ish colour
            var g = this.add.graphics();
            g.fillStyle(0x3a2a18);
            g.fillRect(0, 0, this._wallViewW, 128);
            g.lineStyle(2, 0x1a0f06);
            for (var y = 0; y < 128; y += 32) g.lineBetween(0, y, this._wallViewW, y);
            g.generateTexture('__bonus_wall_fallback', this._wallViewW, 128);
            g.destroy();
            this._wall = this.add.tileSprite(this._colCx, H / 2, this._wallViewW, this._wallViewH, '__bonus_wall_fallback');
        }

        // Climbing character in centre of the column, fixed
        var hasClimb = this.textures.exists('climb');
        this._char = this.add.sprite(this._colCx, H / 2, hasClimb ? 'climb' : 'idle');
        this._char.setScale(CFG.SPRITE_SCALE);
        this._char.setLighting(true);
        this._char.setDepth(2);
        if (this.anims.exists('anim_climb')) {
            this._char.play('anim_climb');
        } else {
            this._char.play('anim_idle');
            console.warn('BonusScene: anim_climb not available, falling back to idle');
        }

        // Timer + streak HUD above the wall
        this._timerText = this.add.text(this._colCx, 40, '60s', {
            fontSize: '36px', fontFamily: 'VCR, monospace', color: '#c9a84c', fontStyle: 'bold'
        }).setOrigin(0.5);
        this._streakText = this.add.text(this._colCx, 80, '0 / ' + CFG.BONUS_QUESTIONS, {
            fontSize: '20px', fontFamily: 'VCR, monospace', color: '#ffffff'
        }).setOrigin(0.5);

        // --- Question UI (left half, narrative-mode initially) ---
        this.questionUI = FloQuest.QuestionUI.create();
        this.questionUI._panel.classList.add('slideshow-mode');

        // Keyboard: 1-2 select (inverted logic still fires selectAnswer normally)
        this.input.keyboard.on('keydown', function(event) {
            if (event.key === '1' || event.key === '2') {
                self.questionUI.selectAnswer(parseInt(event.key) - 1);
            }
        });

        // Wall scroll state (advance from 0 to wallHeight). Reset on error.
        this._scrollStartMs = 0;      // set when run() starts the round
        this._scrollOffset = 0;

        // Timer state
        this._deadlineMs = 0;
        this._timerRunning = false;

        // Resize handler
        this._resizeHandler = function() { self._layoutColumn(); };
        this.scale.on('resize', this._resizeHandler);
        window.addEventListener('resize', this._resizeHandler);

        // Cleanup on shutdown
        this.events.on('shutdown', function() {
            window.removeEventListener('resize', self._resizeHandler);
            if (self.questionUI) {
                self.questionUI._panel.classList.remove('slideshow-mode');
                self.questionUI.destroy();
            }
        });

        FloQuest.MusicPlayer.stop();
        this.cameras.main.fadeIn(300);

        // Drive frame-by-frame wall scroll + timer tick
        this.events.on('update', this._tick, this);

        this.run();
    }

    _layoutColumn() {
        var W = FloQuest.Config.VIEWPORT_W;
        this._colCx = Math.min(W - this._wallViewW / 2 - 40, W * 0.75);
        if (this._wall) this._wall.setPosition(this._colCx, FloQuest.Config.VIEWPORT_H / 2);
        if (this._char) this._char.setPosition(this._colCx, FloQuest.Config.VIEWPORT_H / 2);
        if (this._timerText) this._timerText.setPosition(this._colCx, 40);
        if (this._streakText) this._streakText.setPosition(this._colCx, 80);
    }

    _tick(time, delta) {
        if (this._timerRunning && this._wall) {
            // Continuous scroll: tilePositionY advances so content moves UP past the character
            // (character appears to climb upward).
            this._scrollOffset += (this._scrollSpeed * delta / 1000);
            this._wall.tilePositionY = -this._scrollOffset;
        }
        if (this._timerRunning) {
            var remaining = Math.max(0, this._deadlineMs - time);
            var secs = Math.ceil(remaining / 1000);
            this._timerText.setText(secs + 's');
            this._timerText.setColor(secs <= 5 ? '#ff4444' : (secs <= 15 ? '#ffaa44' : '#c9a84c'));
        }
    }

    _resetWall() {
        this._scrollOffset = 0;
        if (this._wall) this._wall.tilePositionY = 0;
    }

    _waitNarrative(text, btnLabel) {
        var self = this;
        return new Promise(function(resolve) {
            self.questionUI.showNarrative(text, btnLabel, resolve, {
                header: 'Livello Bonus ' + self._bonusIndex,
                lives: null
            });
        });
    }

    _delay(ms) {
        var self = this;
        return new Promise(function(resolve) { self.time.delayedCall(ms, resolve); });
    }

    _askQuestion(qIndex) {
        var self = this;
        var CFG = FloQuest.Config;
        return new Promise(function(resolve) {
            self.questionUI.showQuestion(
                self._questions, qIndex, null, CFG.BONUS_QUESTIONS,
                false /* no per-question timer */, CFG.BONUS_ANSWERS);
            self.questionUI.waitForAnswer().then(function() {
                var res = self.questionUI.lockIn();
                // INVERTED LOGIC: res.correct === true means user picked the factually RIGHT answer → mistake.
                resolve({ pickedFactuallyRight: res.correct });
            });
        });
    }

    async run() {
        var CFG = FloQuest.Config;

        // INTRO
        await this._waitNarrative(this._bonusCfg.intro || 'Scala la parete: scegli sempre la risposta FALSA!', 'Inizia');

        // Start the timer
        this._streak = 0;
        this._streakText.setText('0 / ' + CFG.BONUS_QUESTIONS);
        this._deadlineMs = this.time.now + CFG.BONUS_DURATION * 1000;
        this._timerRunning = true;
        this._scrollOffset = 0;

        // Listen for timeout via a delayedCall so we can cancel if completed
        var timedOut = false;
        var self = this;
        var timeoutCall = this.time.delayedCall(CFG.BONUS_DURATION * 1000, function() {
            timedOut = true;
            self.questionUI.acceptingInput = false;
            if (self.questionUI._answerResolve) {
                var r = self.questionUI._answerResolve;
                self.questionUI._answerResolve = null;
                r(-1);
            }
        });

        var q = 0;
        if (this._questions.length === 0) {
            timedOut = true;
        }
        while (!timedOut && this._streak < CFG.BONUS_QUESTIONS) {
            var result = await this._askQuestion(q % this._questions.length);
            if (timedOut) break;

            if (result.pickedFactuallyRight) {
                // Mistake — reset streak and wall
                FloQuest.AudioManager.play('wrong');
                this._streak = 0;
                this._resetWall();
                this._streakText.setText('0 / ' + CFG.BONUS_QUESTIONS);
                q = 0;
            } else {
                // Good pick (factually wrong)
                FloQuest.AudioManager.play('correct');
                this._streak++;
                this._streakText.setText(this._streak + ' / ' + CFG.BONUS_QUESTIONS);
                q = (q + 1) % this._questions.length;
            }
        }

        this._timerRunning = false;
        if (timeoutCall) timeoutCall.remove();

        var completed = (this._streak >= CFG.BONUS_QUESTIONS);
        var gained = FloQuest.ScoreManager.completeBonus(this._streak, completed);
        FloQuest.ScoreManager.saveProgress();

        FloQuest.AudioManager.play(completed ? 'levelup' : 'wrong');

        var msg = completed
            ? (this._bonusCfg.ending || 'Hai raggiunto la cima!') + '\n\n+' + gained + ' punti!'
            : 'Tempo scaduto! Serie migliore: ' + this._streak + '/' + CFG.BONUS_QUESTIONS + '\n+' + gained + ' punti.';
        await this._waitNarrative(msg, 'Continua');

        this.cameras.main.fadeOut(500);
        await this._delay(500);
        this.scene.start(this._nextScene, { level: this._nextLevel });
    }
};
