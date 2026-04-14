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
            _indices: []
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

        // ---------------------------------------------------------------
        // Methods
        // ---------------------------------------------------------------

        ui.showQuestion = function(questions, qIndex, lives, totalQuestions) {
            var q = questions[qIndex];
            this.answerCount = 4;

            // Shuffle answer indices
            var indices = [0, 1, 2, 3];
            for (var i = 3; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
            }
            this._indices = indices;
            this.correctCorridor = indices.indexOf(0);

            // Picture
            if (q.picture) {
                this._panel.classList.add('has-picture');
                this._pictureImg.src = q.picture;
            } else {
                this._panel.classList.remove('has-picture');
                this._pictureImg.src = '';
            }

            // Populate
            this._livesEl.textContent = '\u2764'.repeat(lives);
            this._headerEl.textContent = 'Domanda ' + (qIndex + 1) + '/' + totalQuestions;
            this._timerEl.textContent = '';
            this._timerEl.className = 'qp-timer';
            this._questionEl.textContent = q.q;

            // Score
            var score = FloQuest.ScoreManager ? FloQuest.ScoreManager.score : 0;
            this._scoreEl.querySelector('.qp-score-value').textContent = score;

            for (var k = 0; k < 4; k++) {
                this._answerEls[k].textContent = '[' + (k + 1) + '] ' + q.answers[indices[k]];
                this._answerEls[k].className = 'qp-answer';
                this._answerEls[k].style.display = '';
            }

            this._panel.style.display = '';
            this.selectedCorridor = -1;
            this.acceptingInput = true;
        };

        ui.hide = function() {
            this._panel.style.display = 'none';
            this.acceptingInput = false;
            this._timerRunning = false;
            if (this._timerRAF) {
                cancelAnimationFrame(this._timerRAF);
                this._timerRAF = null;
            }
        };

        ui.selectAnswer = function(index) {
            if (!this.acceptingInput) return;
            if (index < 0 || index >= this.answerCount) return;

            this.selectedCorridor = index;
            for (var k = 0; k < this.answerCount; k++) {
                this._answerEls[k].classList.toggle('selected', k === index);
            }
        };

        ui.lockIn = function() {
            this.acceptingInput = false;

            if (this.selectedCorridor === -1) {
                var wrong;
                do { wrong = Math.floor(Math.random() * 4); } while (wrong === this.correctCorridor);
                return { corridor: wrong, correct: false, timedOut: true };
            }

            return {
                corridor: this.selectedCorridor,
                correct: this.selectedCorridor === this.correctCorridor
            };
        };

        ui.startTimer = function(durationMs) {
            this._timerStart = performance.now();
            this._timerDuration = durationMs;
            this._timerRunning = true;
            this._tickTimer();
        };

        ui._tickTimer = function() {
            if (!this._timerRunning) return;

            var elapsed = performance.now() - this._timerStart;
            var remaining = Math.max(0, (this._timerDuration - elapsed) / 1000);
            this._timerEl.textContent = Math.ceil(remaining) + 's';

            // Color classes
            this._timerEl.classList.remove('warn', 'danger');
            if (remaining < 3) {
                this._timerEl.classList.add('danger');
            } else if (remaining < 6) {
                this._timerEl.classList.add('warn');
            }

            // Update score live
            var score = FloQuest.ScoreManager ? FloQuest.ScoreManager.score : 0;
            this._scoreEl.querySelector('.qp-score-value').textContent = score;

            var self = this;
            this._timerRAF = requestAnimationFrame(function() { self._tickTimer(); });
        };

        /** Is the panel currently visible? */
        ui.isVisible = function() {
            return this._panel.style.display !== 'none';
        };

        /** Remove the DOM element entirely (call on scene shutdown) */
        ui.destroy = function() {
            this.hide();
            if (this._panel.parentNode) {
                this._panel.parentNode.removeChild(this._panel);
            }
        };

        /** No-op kept for API compatibility — timer updates itself via rAF */
        ui.updateTimer = function() {};

        return ui;
    }
};
