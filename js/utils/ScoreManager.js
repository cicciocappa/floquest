var FloQuest = FloQuest || {};

FloQuest.ScoreManager = {
    score: 0,
    lives: 3,
    currentJourney: 1,
    currentLevel: 1,
    currentQuestion: 0,
    questionsAnswered: [],
    perfectLevel: true,
    errorsThisLevel: 0,
    lastLevelScore: 0,
    timerActive: true,

    reset: function() {
        this.score = 0;
        this.currentLevel = 1;
        this.currentQuestion = 0;
        this.questionsAnswered = [];
        this.lives = this.getLivesForDifficulty();
        this.perfectLevel = true;
        this.errorsThisLevel = 0;
        this.lastLevelScore = 0;
    },

    /** Lives granted per level based on current difficulty. */
    getLivesForDifficulty: function() {
        var table = FloQuest.Config.LIVES_PER_DIFFICULTY || {};
        var diff = this.getDifficulty();
        return table[diff] != null ? table[diff] : FloQuest.Config.LIVES_PER_LEVEL;
    },

    setJourney: function(journeyId) {
        this.currentJourney = journeyId;
        var journey = FloQuest.Journeys[journeyId - 1];
        FloQuest.Levels = journey.levels;
        // FloQuest.Questions and FloQuest.BonusQuestions are populated by
        // QuestionsAPI.fetchJourney() before this scene transition.
    },

    resetForLevel: function() {
        this.lives = this.getLivesForDifficulty();
        this.currentQuestion = 0;
        this.questionsAnswered = [];
        this.perfectLevel = true;
        this.errorsThisLevel = 0;
    },

    addScore: function(points) {
        this.score += points;
    },

    /** Called for every wrong answer or timeout in regular levels. */
    recordError: function() {
        this.errorsThisLevel++;
        this.perfectLevel = false;
    },

    /** Difficulty multiplier based on the user's current difficulty setting. */
    getDifficultyFactor: function() {
        var factors = FloQuest.Config.DIFFICULTY_FACTOR;
        var diff = this.getDifficulty();
        return factors[diff] != null ? factors[diff] : 1.0;
    },

    /**
     * New formula: max(0, LEVEL_BASE - errors*ERROR_PENALTY) * difficulty factor.
     * Returns the points awarded for this level (for display in LevelCompleteScene).
     */
    completeLevel: function() {
        var cfg = FloQuest.Config.SCORE;
        var base = Math.max(0, cfg.LEVEL_BASE - this.errorsThisLevel * cfg.ERROR_PENALTY);
        var gained = Math.round(base * this.getDifficultyFactor());
        this.addScore(gained);
        this.lastLevelScore = gained;
        return gained;
    },

    /**
     * Bonus scoring: completed=true → BONUS_COMPLETE flat;
     * else streak × BONUS_PER_STREAK. Returns points added.
     */
    completeBonus: function(streak, completed) {
        var cfg = FloQuest.Config.SCORE;
        var gained = completed ? cfg.BONUS_COMPLETE : (streak * cfg.BONUS_PER_STREAK);
        this.addScore(gained);
        return gained;
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

    // --- Animations mode: 'full' | 'reduced' | 'none' ---
    getAnimationsMode: function() {
        try {
            var v = localStorage.getItem('floquest_animations_mode');
            if (v === 'full' || v === 'reduced' || v === 'none') return v;
            // Back-compat: migrate legacy skip_animations boolean
            var legacy = localStorage.getItem('floquest_skip_animations');
            if (legacy === 'true') return 'reduced';
            return 'full';
        } catch(e) { return 'full'; }
    },

    setAnimationsMode: function(mode) {
        try { localStorage.setItem('floquest_animations_mode', mode); } catch(e) {}
    },

    getSkipAnimations: function() {
        return this.getAnimationsMode() === 'reduced';
    },

    addTopScore: function(score, level) {
        var scores = this.getTopScores();
        scores.push({ score: score, level: level, date: Date.now() });
        scores.sort(function(a, b) { return b.score - a.score; });
        if (scores.length > 10) scores.length = 10;
        try { localStorage.setItem('floquest_top_scores', JSON.stringify(scores)); } catch(e) {}
    }
};
