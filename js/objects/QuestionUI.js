var FloQuest = FloQuest || {};

/**
 * QuestionUI — HTML overlay above the Phaser canvas.
 *
 * Layout (3-column):
 *   [Picture (opt)] | [Header + Question + 2×2 Answers] | [Timer / Score / Lives]
 *
 * The panel is a DOM div with position:fixed at the top-center of the page.
 * If the question has a `picture` property, the image column is shown and the
 * panel switches to the wider width via the .has-picture class.
 *
 * Usage:
 *   var ui = FloQuest.QuestionUI.create();
 *   ui.showQuestion(questions, index, lives, total);
 *   ui.selectAnswer(i);
 *   var result = ui.lockIn();
 *   ui.hide();
 */
FloQuest.QuestionUI = {

    create: function() {
        var ui = {
            acceptingInput: false,
            selectedCorridor: -1,
            correctCorridor: -1,
            answerCount: 4,
            _timerStart: 0,
            _timerDuration: 0,
            _timerRunning: false,
            _timerRAF: null,
            _answerEls: [],
            _answerResolve: null
        };

        // --- Build DOM ---
        var panel = document.createElement('div');
        panel.id = 'question-panel';
        panel.style.display = 'none';
        document.body.appendChild(panel);

        // Column 1: Picture (optional)
        var pictureCol = document.createElement('div');
        pictureCol.className = 'qp-picture-col';
        panel.appendChild(pictureCol);

        var pictureImg = document.createElement('img');
        pictureImg.alt = '';
        pictureCol.appendChild(pictureImg);

        // Column 2: Main (header + question + answers)
        var mainCol = document.createElement('div');
        mainCol.className = 'qp-main-col';
        panel.appendChild(mainCol);

        var headerEl = document.createElement('div');
        headerEl.className = 'qp-header';
        mainCol.appendChild(headerEl);

        var questionEl = document.createElement('div');
        questionEl.className = 'qp-question';
        mainCol.appendChild(questionEl);

        var answersGrid = document.createElement('div');
        answersGrid.className = 'qp-answers';
        mainCol.appendChild(answersGrid);

        for (var i = 0; i < 4; i++) {
            var btn = document.createElement('div');
            btn.className = 'qp-answer';
            btn.dataset.index = i;
            answersGrid.appendChild(btn);

            (function(idx, el) {
                el.addEventListener('click', function() {
                    ui.selectAnswer(idx);
                });
                el.addEventListener('mouseenter', function() {
                    if (ui.acceptingInput && idx !== ui.selectedCorridor) {
                        el.classList.add('hover');
                    }
                });
                el.addEventListener('mouseleave', function() {
                    el.classList.remove('hover');
                });
            })(i, btn);

            ui._answerEls.push(btn);
        }

        // Narrative button (shown only in narrative mode)
        var narrativeBtn = document.createElement('div');
        narrativeBtn.className = 'qp-narrative-btn';
        narrativeBtn.style.display = 'none';
        mainCol.appendChild(narrativeBtn);

        narrativeBtn.addEventListener('click', function() {
            if (ui._narrativeCallback) {
                var cb = ui._narrativeCallback;
                ui._narrativeCallback = null;
                cb();
            }
        });

        // Column 3: Info (timer, score, lives)
        var infoCol = document.createElement('div');
        infoCol.className = 'qp-info-col';
        panel.appendChild(infoCol);

        var timerEl = document.createElement('div');
        timerEl.className = 'qp-timer';
        infoCol.appendChild(timerEl);

        var scoreEl = document.createElement('div');
        scoreEl.className = 'qp-score';
        scoreEl.innerHTML = '<span class="qp-score-value">0</span>';
        infoCol.appendChild(scoreEl);

        var livesEl = document.createElement('div');
        livesEl.className = 'qp-lives';
        infoCol.appendChild(livesEl);

        // Store references
        ui._panel = panel;
        ui._pictureImg = pictureImg;
        ui._headerEl = headerEl;
        ui._timerEl = timerEl;
        ui._scoreEl = scoreEl;
        ui._livesEl = livesEl;
        ui._questionEl = questionEl;
        ui._answersGrid = answersGrid;
        ui._narrativeBtn = narrativeBtn;
        ui._narrativeCallback = null;

        // ---------------------------------------------------------------
        // Methods
        // ---------------------------------------------------------------

        ui.showQuestion = function(questions, qIndex, lives, totalQuestions, timerMs, answerCount) {
            var q = questions[qIndex];
            var n = answerCount || 4;
            this.answerCount = n;

            // Exit narrative mode if active
            this._panel.classList.remove('narrative-mode');
            this._answersGrid.style.display = '';
            this._narrativeBtn.style.display = 'none';
            this._narrativeCallback = null;

            // Answers arrive already shuffled from the Worker API; q.correct
            // is the index of the factually correct answer in q.answers.
            this.correctCorridor = q.correct;

            // Picture
            if (q.picture) {
                this._panel.classList.add('has-picture');
                this._pictureImg.src = q.picture;
            } else {
                this._panel.classList.remove('has-picture');
                this._pictureImg.src = '';
            }

            // Populate
            this._livesEl.textContent = lives != null ? '\u2764'.repeat(lives) : '';
            this._headerEl.textContent = 'Domanda ' + (qIndex + 1) + '/' + totalQuestions;
            this._questionEl.textContent = q.q;

            // Score
            var score = FloQuest.ScoreManager ? FloQuest.ScoreManager.score : 0;
            this._scoreEl.querySelector('.qp-score-value').textContent = score;

            for (var k = 0; k < 4; k++) {
                if (k < n) {
                    this._answerEls[k].textContent = '[' + (k + 1) + '] ' + q.answers[k];
                    this._answerEls[k].className = 'qp-answer';
                    this._answerEls[k].style.display = '';
                } else {
                    this._answerEls[k].style.display = 'none';
                }
            }

            this._panel.style.display = '';
            this.selectedCorridor = -1;
            this.acceptingInput = true;

            // Timer: 0 / false → hidden (no lock-in countdown); else use provided ms, default to WALK_CYCLES_QUESTION*1000
            if (timerMs === 0 || timerMs === false) {
                this._timerEl.style.display = 'none';
                this._timerRunning = false;
                if (this._timerRAF) { cancelAnimationFrame(this._timerRAF); this._timerRAF = null; }
            } else {
                this._timerEl.style.display = '';
                this.startTimer(timerMs || FloQuest.Config.WALK_CYCLES_QUESTION * 1000);
            }
        };

        /**
         * Show narrative text with a single centered button.
         * @param {string} text — narrative text
         * @param {string} btnLabel — label for the button (e.g. "Inizia", "Continua", "Riprova")
         * @param {function} onClick — called when button clicked
         * @param {object} opts — { lives, header, score }
         */
        ui.showNarrative = function(text, btnLabel, onClick, opts) {
            opts = opts || {};
            this._panel.classList.add('narrative-mode');
            this._panel.classList.remove('has-picture');
            this._pictureImg.src = '';

            this._headerEl.textContent = opts.header || '';
            this._questionEl.textContent = text;

            // Hide answers, show narrative button
            this._answersGrid.style.display = 'none';
            this._narrativeBtn.style.display = '';
            this._narrativeBtn.textContent = btnLabel;
            this._narrativeCallback = onClick || null;

            // Hide timer
            this._timerEl.style.display = 'none';
            this._timerRunning = false;
            if (this._timerRAF) { cancelAnimationFrame(this._timerRAF); this._timerRAF = null; }

            // Lives / Score (optional)
            if (typeof opts.lives === 'number') {
                this._livesEl.textContent = '\u2764'.repeat(opts.lives);
            } else {
                this._livesEl.textContent = '';
            }
            var score = (typeof opts.score === 'number') ? opts.score :
                        (FloQuest.ScoreManager ? FloQuest.ScoreManager.score : 0);
            this._scoreEl.querySelector('.qp-score-value').textContent = score;

            this._panel.style.display = '';
            this.acceptingInput = false;
            this.selectedCorridor = -1;
        };

        ui.hide = function() {
            this._panel.style.display = 'none';
            this.acceptingInput = false;
            this._timerRunning = false;
            if (this._timerRAF) {
                cancelAnimationFrame(this._timerRAF);
                this._timerRAF = null;
            }
            this._answerResolve = null;
        };

        ui.selectAnswer = function(index) {
            if (!this.acceptingInput) return;
            if (index < 0 || index >= this.answerCount) return;

            this.selectedCorridor = index;
            for (var k = 0; k < this.answerCount; k++) {
                this._answerEls[k].classList.toggle('selected', k === index);
            }

            // Notify skip-mode listener
            if (this._answerResolve) {
                var resolve = this._answerResolve;
                this._answerResolve = null;
                resolve(index);
            }
        };

        /** Returns a Promise that resolves when the player selects an answer. */
        ui.waitForAnswer = function() {
            var self = this;
            return new Promise(function(resolve) {
                // Already selected? Resolve immediately
                if (self.selectedCorridor !== -1) {
                    resolve(self.selectedCorridor);
                } else {
                    self._answerResolve = resolve;
                }
            });
        };

        ui.lockIn = function() {
            this.acceptingInput = false;
            this._timerRunning = false;
            if (this._timerRAF) {
                cancelAnimationFrame(this._timerRAF);
                this._timerRAF = null;
            }

            if (this.selectedCorridor === -1) {
                var n = this.answerCount || 4;
                var wrong;
                do { wrong = Math.floor(Math.random() * n); } while (wrong === this.correctCorridor);
                return { corridor: wrong, correct: false, timedOut: true };
            }

            return {
                corridor: this.selectedCorridor,
                correct: this.selectedCorridor === this.correctCorridor
            };
        };

        /**
         * Start the countdown timer (real-time, performance.now + rAF).
         * @param {number} durationMs — total countdown in milliseconds
         */
        ui.startTimer = function(durationMs) {
            this._timerStart = performance.now();
            this._timerDuration = durationMs;
            this._timerRunning = true;
            this._timerEl.className = 'qp-timer';
            this._tickTimer();
        };

        ui._tickTimer = function() {
            if (!this._timerRunning) return;
            var elapsed = performance.now() - this._timerStart;
            var remaining = Math.max(0, this._timerDuration - elapsed);
            var secs = Math.ceil(remaining / 1000);

            this._timerEl.textContent = secs + 's';

            // Color classes
            this._timerEl.classList.remove('warn', 'danger');
            if (secs <= 3) {
                this._timerEl.classList.add('danger');
            } else if (secs <= 6) {
                this._timerEl.classList.add('warn');
            }

            // Update score display
            var score = FloQuest.ScoreManager ? FloQuest.ScoreManager.score : 0;
            this._scoreEl.querySelector('.qp-score-value').textContent = score;

            if (remaining > 0) {
                var self = this;
                this._timerRAF = requestAnimationFrame(function() { self._tickTimer(); });
            }
        };

        /** Hide the countdown timer without hiding the whole panel. */
        ui.hideTimer = function() {
            this._timerEl.style.display = 'none';
            this._timerRunning = false;
            if (this._timerRAF) {
                cancelAnimationFrame(this._timerRAF);
                this._timerRAF = null;
            }
        };

        /** Is the panel currently visible? */
        ui.isVisible = function() {
            return this._panel.style.display !== 'none';
        };

        /** Remove the DOM element entirely (call on scene shutdown) */
        ui.destroy = function() {
            this._timerRunning = false;
            if (this._timerRAF) { cancelAnimationFrame(this._timerRAF); this._timerRAF = null; }
            this.hide();
            if (this._panel.parentNode) {
                this._panel.parentNode.removeChild(this._panel);
            }
        };

        return ui;
    }
};
