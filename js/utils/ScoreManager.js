var FloQuest = FloQuest || {};

FloQuest.ScoreManager = {
    score: 0,
    lives: 3,
    currentJourney: 1,
    currentLevel: 1,
    currentQuestion: 0,
    questionsAnswered: [],
    perfectLevel: true,
    timerActive: true,

    reset: function() {
        this.score = 0;
        this.currentLevel = 1;
        this.currentQuestion = 0;
        this.questionsAnswered = [];
        this.lives = FloQuest.Config.LIVES_PER_LEVEL;
        this.perfectLevel = true;
    },

    setJourney: function(journeyId) {
        this.currentJourney = journeyId;
        var journey = FloQuest.Journeys[journeyId - 1];
        FloQuest.Levels = journey.levels;
        FloQuest.Questions = FloQuest.AllQuestions[String(journeyId)] || {};
    },

    resetForLevel: function() {
        this.lives = FloQuest.Config.LIVES_PER_LEVEL;
        this.currentQuestion = 0;
        this.questionsAnswered = [];
        this.perfectLevel = true;
    },

    addScore: function(points) {
        this.score += points;
    },

    calculateQuestionScore: function(timeMs, firstTry) {
        var points = FloQuest.Config.SCORE.BASE;
        if (timeMs < FloQuest.Config.SPEED_THRESHOLD) {
            points += FloQuest.Config.SCORE.SPEED_BONUS;
        }
        if (firstTry) {
            points += FloQuest.Config.SCORE.FIRST_TRY_BONUS;
        }
        return points;
    },

    completeLevel: function() {
        this.addScore(FloQuest.Config.SCORE.LEVEL_COMPLETE);
        if (this.perfectLevel) {
            this.addScore(FloQuest.Config.SCORE.PERFECT_LEVEL);
        }
    },

    loseLife: function() {
        this.lives--;
        this.perfectLevel = false;
        return this.lives <= 0;
    },

    nextQuestion: function() {
        this.currentQuestion++;
        return this.currentQuestion >= 10;
    },

    markQuestionAnswered: function(index) {
        if (this.questionsAnswered.indexOf(index) === -1) {
            this.questionsAnswered.push(index);
        }
    },

    isQuestionAnswered: function(index) {
        return this.questionsAnswered.indexOf(index) !== -1;
    },

    saveProgress: function() {
        try {
            var data = {
                score: this.score,
                currentLevel: this.currentLevel,
                highScore: Math.max(this.score, this.getHighScore())
            };
            localStorage.setItem('floquest_save', JSON.stringify(data));
        } catch(e) {}
    },

    loadProgress: function() {
        try {
            var data = JSON.parse(localStorage.getItem('floquest_save'));
            if (data) {
                return data;
            }
        } catch(e) {}
        return null;
    },

    getHighScore: function() {
        try {
            var data = JSON.parse(localStorage.getItem('floquest_save'));
            return data ? (data.highScore || 0) : 0;
        } catch(e) {
            return 0;
        }
    },

    clearSave: function() {
        try {
            localStorage.removeItem('floquest_save');
        } catch(e) {}
    },

    getBrightness: function() {
        try {
            var v = parseFloat(localStorage.getItem('floquest_brightness'));
            return isNaN(v) ? 1.0 : v;
        } catch(e) {
            return 1.0;
        }
    },

    setBrightness: function(value) {
        try {
            localStorage.setItem('floquest_brightness', String(value));
        } catch(e) {}
    },

    // --- Music settings ---
    getMusicEnabled: function() {
        try {
            var v = localStorage.getItem('floquest_music_enabled');
            return v === null ? true : v === 'true';
        } catch(e) { return true; }
    },

    setMusicEnabled: function(enabled) {
        try { localStorage.setItem('floquest_music_enabled', String(enabled)); } catch(e) {}
    },

    getMusicVolume: function() {
        try {
            var v = parseFloat(localStorage.getItem('floquest_music_volume'));
            return isNaN(v) ? 0.7 : v;
        } catch(e) { return 0.7; }
    },

    setMusicVolume: function(value) {
        try { localStorage.setItem('floquest_music_volume', String(value)); } catch(e) {}
    },

    // --- Language ---
    getLanguage: function() {
        try {
            var v = localStorage.getItem('floquest_language');
            return v || 'it';
        } catch(e) { return 'it'; }
    },

    setLanguage: function(lang) {
        try { localStorage.setItem('floquest_language', lang); } catch(e) {}
    },

    // --- Difficulty ---
    getDifficulty: function() {
        try {
            var v = localStorage.getItem('floquest_difficulty');
            return v || 'normal';
        } catch(e) { return 'normal'; }
    },

    setDifficulty: function(diff) {
        try { localStorage.setItem('floquest_difficulty', diff); } catch(e) {}
    },

    // --- Top 10 scores ---
    getTopScores: function() {
        try {
            var data = JSON.parse(localStorage.getItem('floquest_top_scores'));
            return Array.isArray(data) ? data : [];
        } catch(e) { return []; }
    },

    addTopScore: function(score, level) {
        var scores = this.getTopScores();
        scores.push({ score: score, level: level, date: Date.now() });
        scores.sort(function(a, b) { return b.score - a.score; });
        if (scores.length > 10) scores.length = 10;
        try { localStorage.setItem('floquest_top_scores', JSON.stringify(scores)); } catch(e) {}
    }
};
