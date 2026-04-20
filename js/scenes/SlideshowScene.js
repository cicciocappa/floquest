var FloQuest = FloQuest || {};

/**
 * SlideshowScene — gameplay for animations mode "Nessuna".
 *
 * Two panels side by side (desktop) or stacked (portrait mobile):
 *   - left/top: 640×640 slide image (intro, q1..q10, death, timeout, ending)
 *   - right/bottom: HTML QuestionUI panel
 *
 * Flow:
 *   INTRO → narrative + [Inizia]
 *   Q1..Q10 → question + 4 answers, 15s timer
 *     correct → next Q
 *     wrong/timeout → death/timeout slide + [Riprova] (or [Continua] → GameOver)
 *   ENDING → ending slide + narrative + [Continua] → LevelCompleteScene
 */
FloQuest.SlideshowScene = class SlideshowScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SlideshowScene' });
    }

    init(data) {
        this._levelNum = (data && data.level) || 1;
        this._gameOver = false;
    }

    preload() {
        var jid = FloQuest.ScoreManager.currentJourney || 1;
        var lvl = this._levelNum;
        var folder = 'levels/' + jid + '/slides' + lvl + '/';
        this.load.image(this._slideKey('intro'), folder + 'intro.png');
        this.load.image(this._slideKey('death'), folder + 'death.png');
        this.load.image(this._slideKey('timeout'), folder + 'timeout.png');
        this.load.image(this._slideKey('ending'), folder + 'ending.png');
        for (var i = 1; i <= 10; i++) {
            this.load.image(this._slideKey('q' + i), folder + 'q' + i + '.png');
        }
    }

    _slideKey(name) {
        var jid = FloQuest.ScoreManager.currentJourney || 1;
        return 'slide_' + jid + '_' + this._levelNum + '_' + name;
    }

    create() {
        this.levelData = FloQuest.Levels[this._levelNum - 1];
        this.questions = FloQuest.Questions[this._levelNum];

        this.cameras.main.setBackgroundColor('#0a0a10');

        // Build image container (clipped to 640×640)
        this._imgW = 640;
        this._imgH = 640;
        this._imgContainer = this.add.container(0, 0);

        var maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
        maskGfx.fillStyle(0xffffff);
        maskGfx.fillRect(-this._imgW / 2, -this._imgH / 2, this._imgW, this._imgH);
        this._maskGfx = maskGfx;
        this._imgContainer.setMask(maskGfx.createGeometryMask());

        // Frame border
        this._imgFrame = this.add.graphics();
        this._currentSlide = null;

        this._repositionImage();
        var self = this;
        this._resizeHandler = function() { self._repositionImage(); };
        this.scale.on('resize', this._resizeHandler);
        window.addEventListener('resize', this._resizeHandler);

        // Question UI overlay with slideshow-mode class
        this.questionUI = FloQuest.QuestionUI.create();
        this.questionUI._panel.classList.add('slideshow-mode');

        // Keyboard: 1-4 select answer (also commits, via selectAnswer)
        this.input.keyboard.on('keydown', function(event) {
            if (event.key >= '1' && event.key <= '4') {
                self.questionUI.selectAnswer(parseInt(event.key) - 1);
            }
        });

        // Music based on environment
        FloQuest.MusicPlayer.play(this.levelData.environment || 'temple');

        // Cleanup on shutdown
        this.events.on('shutdown', function() {
            window.removeEventListener('resize', self._resizeHandler);
            if (self._questionTimeout) { self._questionTimeout.remove(); self._questionTimeout = null; }
            if (self.questionUI) {
                self.questionUI._panel.classList.remove('slideshow-mode');
                self.questionUI.destroy();
            }
        });

        this.cameras.main.fadeIn(300);
        this.runLevel();
    }

    _repositionImage() {
        var W = FloQuest.Config.VIEWPORT_W;
        var H = FloQuest.Config.VIEWPORT_H;
        var portrait = window.innerWidth < window.innerHeight;

        var cx, cy;
        if (portrait) {
            cx = W / 2;
            cy = 60 + this._imgH / 2;
        } else {
            cx = Math.min(W - this._imgW / 2 - 40, W * 0.72);
            cy = H / 2;
        }
        this._imgContainer.setPosition(cx, cy);
        this._maskGfx.setPosition(cx, cy);

        // Redraw frame
        this._imgFrame.clear();
        this._imgFrame.lineStyle(4, 0xc9a84c, 0.8);
        this._imgFrame.strokeRect(cx - this._imgW / 2 - 2, cy - this._imgH / 2 - 2, this._imgW + 4, this._imgH + 4);
    }

    async _showSlide(slideName) {
        var key = this._slideKey(slideName);
        if (!this.textures.exists(key)) {
            console.warn('SlideshowScene: missing slide', slideName, '→', key);
            return;
        }
        var newImg = this.add.image(0, 0, key);
        var tex = newImg.texture.getSourceImage();
        var scale = Math.min(this._imgW / tex.width, this._imgH / tex.height);
        newImg.setScale(scale);
        this._imgContainer.add(newImg);

        var oldImg = this._currentSlide;
        this._currentSlide = newImg;
        await FloQuest.SlideTransitions.run(this, oldImg, newImg, this._imgW, this._imgH, 600);
    }

    _delay(ms) {
        var self = this;
        return new Promise(function(resolve) { self.time.delayedCall(ms, resolve); });
    }

    _waitNarrative(text, btnLabel, opts) {
        var self = this;
        opts = opts || {};
        return new Promise(function(resolve) {
            self.questionUI.showNarrative(text, btnLabel, function() {
                resolve();
            }, {
                header: opts.header || ('Livello ' + self._levelNum + ' — ' + self.levelData.name),
                lives: (typeof opts.lives === 'number') ? opts.lives : FloQuest.ScoreManager.lives
            });
        });
    }

    _askQuestion(qIndex) {
        var self = this;
        var lives = FloQuest.ScoreManager.lives;
        var TIMER_MS = 15000;

        return new Promise(function(resolve) {
            self.questionUI.showQuestion(self.questions, qIndex, lives, FloQuest.Config.TOTAL_QUESTIONS, TIMER_MS);
            var startTime = performance.now();
            var done = false;

            var finish = function(result) {
                if (done) return;
                done = true;
                if (self._questionTimeout) { self._questionTimeout.remove(); self._questionTimeout = null; }
                resolve(result);
            };

            self._questionTimeout = self.time.delayedCall(TIMER_MS, function() {
                self.questionUI.acceptingInput = false;
                var res = self.questionUI.lockIn();
                finish({ correct: false, timedOut: true, corridor: res.corridor, timeMs: TIMER_MS });
            });

            self.questionUI.waitForAnswer().then(function() {
                self.questionUI.acceptingInput = false;
                var res = self.questionUI.lockIn();
                var timeMs = performance.now() - startTime;
                finish({ correct: res.correct, timedOut: false, corridor: res.corridor, timeMs: timeMs });
            });
        });
    }

    async _runQuestion(qIndex) {
        while (true) {
            await this._showSlide('q' + (qIndex + 1));
            var result = await this._askQuestion(qIndex);

            if (result.correct) {
                FloQuest.AudioManager.play('correct');
                FloQuest.ScoreManager.markQuestionAnswered(qIndex);
                return true;
            }

            // Wrong or timeout
            FloQuest.AudioManager.play(result.timedOut ? 'wrong' : 'trap');
            FloQuest.ScoreManager.recordError();
            var outOfLives = FloQuest.ScoreManager.loseLife();
            var slide = result.timedOut ? 'timeout' : 'death';
            await this._showSlide(slide);

            if (outOfLives) {
                await this._waitNarrative(
                    result.timedOut ? 'Il tempo è scaduto. Non hai più vite.' : 'Sei caduto nella trappola. Non hai più vite.',
                    'Continua',
                    { lives: 0 }
                );
                this._gameOver = true;
                this.cameras.main.fadeOut(500);
                await this._delay(500);
                this.scene.start('GameOverScene', { level: this._levelNum });
                return false;
            }

            await this._waitNarrative(
                result.timedOut ? 'Troppo lento! Riprova.' : 'Risposta sbagliata. Riprova.',
                'Riprova'
            );
            // Loop back
        }
    }

    async runLevel() {
        FloQuest.ScoreManager.resetForLevel();

        // Phase: INTRO
        await this._showSlide('intro');
        await this._waitNarrative(this.levelData.narration || '', 'Inizia');

        // Phase: QUESTIONS
        for (var q = 0; q < FloQuest.Config.TOTAL_QUESTIONS; q++) {
            var ok = await this._runQuestion(q);
            if (!ok || this._gameOver) return;
        }

        // Phase: ENDING
        await this._showSlide('ending');
        FloQuest.ScoreManager.completeLevel();
        FloQuest.ScoreManager.saveProgress();
        await this._waitNarrative(this.levelData.ending || '', 'Continua');

        this.cameras.main.fadeOut(500);
        await this._delay(500);
        this.scene.start('LevelCompleteScene', { level: this._levelNum });
    }
};
