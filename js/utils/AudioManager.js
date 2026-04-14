var FloQuest = FloQuest || {};

FloQuest.AudioManager = {
    ctx: null,
    enabled: true,

    init: function() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            this.enabled = false;
        }
    },

    resume: function() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    play: function(type) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        switch(type) {
            case 'click': this._click(); break;
            case 'correct': this._correct(); break;
            case 'wrong': this._wrong(); break;
            case 'step': this._step(); break;
            case 'trap': this._trap(); break;
            case 'fanfare': this._fanfare(); break;
            case 'gameover': this._gameover(); break;
            case 'victory': this._victory(); break;
            case 'levelup': this._levelup(); break;
            case 'tick': this._tick(); break;
        }
    },

    _osc: function(freq, type, duration, volume, startTime) {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume || 0.15, startTime || this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, (startTime || this.ctx.currentTime) + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime || this.ctx.currentTime);
        osc.stop((startTime || this.ctx.currentTime) + duration);
    },

    _noise: function(duration, volume, startTime) {
        var bufferSize = this.ctx.sampleRate * duration;
        var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        var source = this.ctx.createBufferSource();
        source.buffer = buffer;
        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume || 0.05, startTime || this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, (startTime || this.ctx.currentTime) + duration);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(startTime || this.ctx.currentTime);
    },

    _click: function() {
        this._osc(800, 'sine', 0.08, 0.1);
    },

    _correct: function() {
        var t = this.ctx.currentTime;
        this._osc(523, 'sine', 0.15, 0.15, t);
        this._osc(659, 'sine', 0.15, 0.15, t + 0.1);
        this._osc(784, 'sine', 0.2, 0.15, t + 0.2);
    },

    _wrong: function() {
        var t = this.ctx.currentTime;
        this._osc(300, 'sawtooth', 0.3, 0.1, t);
        this._osc(200, 'sawtooth', 0.4, 0.1, t + 0.15);
    },

    _step: function() {
        this._noise(0.05, 0.03);
    },

    _trap: function() {
        var t = this.ctx.currentTime;
        this._osc(400, 'sawtooth', 0.2, 0.12, t);
        this._osc(200, 'sawtooth', 0.3, 0.15, t + 0.1);
        this._osc(100, 'sawtooth', 0.5, 0.12, t + 0.25);
        this._noise(0.6, 0.08, t + 0.1);
    },

    _fanfare: function() {
        var t = this.ctx.currentTime;
        var notes = [523, 659, 784, 1047];
        for (var i = 0; i < notes.length; i++) {
            this._osc(notes[i], 'square', 0.2, 0.1, t + i * 0.15);
        }
    },

    _gameover: function() {
        var t = this.ctx.currentTime;
        this._osc(400, 'sine', 0.3, 0.12, t);
        this._osc(350, 'sine', 0.3, 0.12, t + 0.3);
        this._osc(300, 'sine', 0.3, 0.12, t + 0.6);
        this._osc(250, 'sine', 0.6, 0.12, t + 0.9);
    },

    _victory: function() {
        var t = this.ctx.currentTime;
        var melody = [523, 587, 659, 784, 880, 1047];
        for (var i = 0; i < melody.length; i++) {
            this._osc(melody[i], 'square', 0.2, 0.1, t + i * 0.12);
            this._osc(melody[i] * 0.5, 'sine', 0.2, 0.06, t + i * 0.12);
        }
    },

    _levelup: function() {
        var t = this.ctx.currentTime;
        this._osc(440, 'square', 0.15, 0.1, t);
        this._osc(554, 'square', 0.15, 0.1, t + 0.12);
        this._osc(659, 'square', 0.15, 0.1, t + 0.24);
        this._osc(880, 'square', 0.3, 0.12, t + 0.36);
    },

    _tick: function() {
        this._osc(1000, 'sine', 0.03, 0.05);
    }
};
