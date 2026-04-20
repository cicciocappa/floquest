var FloQuest = FloQuest || {};

FloQuest.QuestionsAPI = {
    BASE_URL: 'https://floquest-api.cicciocappa.workers.dev',

    DIFFICULTY_MAP: { easy: 1, normal: 2, hard: 3 },

    async fetchJourney(difficultyKey, lang) {
        var difficulty = this.DIFFICULTY_MAP[difficultyKey] || 2;
        var url = this.BASE_URL + '/api/journey'
            + '?difficulty=' + difficulty
            + '&lang=' + encodeURIComponent(lang || 'it');
        var res = await fetch(url);
        if (!res.ok) {
            throw new Error('QuestionsAPI fetch failed: HTTP ' + res.status);
        }
        var data = await res.json();
        return this._groupIntoLevels(data);
    },

    _groupIntoLevels: function(data) {
        var regular = {};
        for (var i = 0; i < 10; i++) {
            regular[i + 1] = data.regular.slice(i * 10, (i + 1) * 10);
        }
        var bonus = {};
        for (var j = 0; j < 3; j++) {
            bonus[j + 1] = data.bonus.slice(j * 12, (j + 1) * 12);
        }
        return { regular: regular, bonus: bonus };
    }
};
