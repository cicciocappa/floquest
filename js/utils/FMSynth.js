var FloQuest = FloQuest || {};

/**
 * FMSynth — sintetizzatore FM a 2 operatori ispirato al Yamaha OPL3.
 *
 * Ogni voce è composta da:
 *   [Modulator] --(freq)--> [Carrier] --> output
 *
 * Supporta 4 forme d'onda OPL3 (sine, half-sine, abs-sine, quarter-sine)
 * e inviluppi ADSR indipendenti per carrier e modulator.
 */
FloQuest.FMSynth = (function() {
    'use strict';

    var ctx = null;
    var masterGain = null;
    var MAX_VOICES = 16;
    var activeVoices = {};
    var voiceCount = 0;

    // ── OPL3 Waveforms via WaveShaperNode ──────────────────────────

    function createWaveShaper(audioCtx, type) {
        var shaper = audioCtx.createWaveShaper();
        var n = 8192;
        var curve = new Float32Array(n);
        for (var i = 0; i < n; i++) {
            var x = (i / n) * 2 - 1; // -1..1 maps to 0..2π of sine
            var sin = Math.sin(x * Math.PI);
            switch (type) {
                case 0: // sine (no shaping needed, passthrough)
                    curve[i] = x;
                    break;
                case 1: // half-sine (positive half only)
                    curve[i] = sin > 0 ? x : 0;
                    break;
                case 2: // abs-sine
                    curve[i] = Math.abs(x);
                    break;
                case 3: // quarter-sine (first quarter, then zero)
                    curve[i] = (x >= 0 && x <= 0.5) ? x * 2 : 0;
                    break;
                default:
                    curve[i] = x;
            }
        }
        shaper.curve = curve;
        return shaper;
    }

    // ── ADSR Envelope ──────────────────────────────────────────────

    function applyADSR(param, env, startTime, volume) {
        var a = env.attack || 0.01;
        var d = env.decay || 0.1;
        var s = env.sustain !== undefined ? env.sustain : 0.7;
        var r = env.release || 0.2;
        var peak = volume !== undefined ? volume : 1.0;

        param.setValueAtTime(0.0001, startTime);
        param.linearRampToValueAtTime(peak, startTime + a);
        param.linearRampToValueAtTime(peak * s, startTime + a + d);
        // sustain holds until releaseADSR is called
    }

    function releaseADSR(param, env, releaseTime, currentValue) {
        var r = env.release || 0.2;
        param.cancelScheduledValues(releaseTime);
        param.setValueAtTime(currentValue, releaseTime);
        param.linearRampToValueAtTime(0.0001, releaseTime + r);
        return releaseTime + r;
    }

    // ── Noise Buffer (shared, created once) ──────────────────────

    var noiseBuffer = null;

    function getNoiseBuffer() {
        if (noiseBuffer) return noiseBuffer;
        var len = ctx.sampleRate * 2; // 2 secondi di rumore
        noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = noiseBuffer.getChannelData(0);
        for (var i = 0; i < len; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return noiseBuffer;
    }

    // ── Percussion Synthesis ──────────────────────────────────────

    function playPercInternal(percType, startTime, duration, vol, dest) {
        var t = startTime || ctx.currentTime;

        switch (percType) {
            case 'kick':
                // FM kick: oscillatore con pitch sweep da 150Hz a 40Hz
                var kickOsc = ctx.createOscillator();
                kickOsc.type = 'sine';
                kickOsc.frequency.setValueAtTime(150, t);
                kickOsc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

                var kickGain = ctx.createGain();
                kickGain.gain.setValueAtTime(vol, t);
                kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

                // Sotto-strato di click iniziale
                var clickOsc = ctx.createOscillator();
                clickOsc.type = 'square';
                clickOsc.frequency.value = 80;
                var clickGain = ctx.createGain();
                clickGain.gain.setValueAtTime(vol * 0.4, t);
                clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

                kickOsc.connect(kickGain);
                kickGain.connect(dest);
                clickOsc.connect(clickGain);
                clickGain.connect(dest);

                kickOsc.start(t);
                kickOsc.stop(t + 0.3);
                clickOsc.start(t);
                clickOsc.stop(t + 0.05);
                break;

            case 'snare':
                // Corpo: oscillatore breve a ~200Hz
                var bodyOsc = ctx.createOscillator();
                bodyOsc.type = 'triangle';
                bodyOsc.frequency.setValueAtTime(200, t);
                bodyOsc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

                var bodyGain = ctx.createGain();
                bodyGain.gain.setValueAtTime(vol * 0.6, t);
                bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

                bodyOsc.connect(bodyGain);
                bodyGain.connect(dest);
                bodyOsc.start(t);
                bodyOsc.stop(t + 0.12);

                // Rumore: bandpass 2000-8000 Hz
                var noiseSrc = ctx.createBufferSource();
                noiseSrc.buffer = getNoiseBuffer();

                var snareHP = ctx.createBiquadFilter();
                snareHP.type = 'highpass';
                snareHP.frequency.value = 2000;

                var snareLP = ctx.createBiquadFilter();
                snareLP.type = 'lowpass';
                snareLP.frequency.value = 8000;

                var noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(vol * 0.8, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

                noiseSrc.connect(snareHP);
                snareHP.connect(snareLP);
                snareLP.connect(noiseGain);
                noiseGain.connect(dest);

                noiseSrc.start(t);
                noiseSrc.stop(t + 0.2);
                break;

            case 'hihat':
                // Rumore highpass con decay brevissimo
                var hatSrc = ctx.createBufferSource();
                hatSrc.buffer = getNoiseBuffer();

                var hatHP = ctx.createBiquadFilter();
                hatHP.type = 'highpass';
                hatHP.frequency.value = 7000;

                var hatLP = ctx.createBiquadFilter();
                hatLP.type = 'lowpass';
                hatLP.frequency.value = 14000;

                var hatGain = ctx.createGain();
                hatGain.gain.setValueAtTime(vol, t);
                hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

                hatSrc.connect(hatHP);
                hatHP.connect(hatLP);
                hatLP.connect(hatGain);
                hatGain.connect(dest);

                hatSrc.start(t);
                hatSrc.stop(t + 0.1);
                break;

            case 'openhat':
                // Come hihat ma decay più lungo
                var ohatSrc = ctx.createBufferSource();
                ohatSrc.buffer = getNoiseBuffer();

                var ohatHP = ctx.createBiquadFilter();
                ohatHP.type = 'highpass';
                ohatHP.frequency.value = 6000;

                var ohatLP = ctx.createBiquadFilter();
                ohatLP.type = 'lowpass';
                ohatLP.frequency.value = 13000;

                var ohatGain = ctx.createGain();
                ohatGain.gain.setValueAtTime(vol, t);
                ohatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

                ohatSrc.connect(ohatHP);
                ohatHP.connect(ohatLP);
                ohatLP.connect(ohatGain);
                ohatGain.connect(dest);

                ohatSrc.start(t);
                ohatSrc.stop(t + 0.3);
                break;

            case 'clap':
                // Burst multipli di rumore ravvicinati
                for (var c = 0; c < 3; c++) {
                    var clapSrc = ctx.createBufferSource();
                    clapSrc.buffer = getNoiseBuffer();

                    var clapBP = ctx.createBiquadFilter();
                    clapBP.type = 'bandpass';
                    clapBP.frequency.value = 2500;
                    clapBP.Q.value = 1.5;

                    var clapGain = ctx.createGain();
                    var clapT = t + c * 0.01;
                    clapGain.gain.setValueAtTime(vol * 0.7, clapT);
                    clapGain.gain.exponentialRampToValueAtTime(0.001, clapT + 0.1);

                    clapSrc.connect(clapBP);
                    clapBP.connect(clapGain);
                    clapGain.connect(dest);

                    clapSrc.start(clapT);
                    clapSrc.stop(clapT + 0.15);
                }
                break;
        }
    }

    // ── Instrument Presets ─────────────────────────────────────────

    var PRESETS = {
        // Flauto leggero — basso indice di modulazione, suono morbido
        flute: {
            carrier:   { waveform: 0, envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.15 } },
            modulator: { waveform: 0, ratio: 1, index: 1.2, envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.15 } }
        },
        // Ottone squillante — modulazione intensa
        brass: {
            carrier:   { waveform: 0, envelope: { attack: 0.02, decay: 0.15, sustain: 0.7, release: 0.1 } },
            modulator: { waveform: 0, ratio: 1, index: 3.5, envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.1 } }
        },
        // Basso profondo
        bass: {
            carrier:   { waveform: 0, envelope: { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.08 } },
            modulator: { waveform: 0, ratio: 2, index: 2.0, envelope: { attack: 0.01, decay: 0.3, sustain: 0.3, release: 0.08 } }
        },
        // Organo — sustain pieno, suono fisso
        organ: {
            carrier:   { waveform: 0, envelope: { attack: 0.005, decay: 0.05, sustain: 0.9, release: 0.05 } },
            modulator: { waveform: 0, ratio: 2, index: 1.5, envelope: { attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.05 } }
        },
        // Percussioni — sintetizzate con rumore filtrato
        kick:    { percType: 'kick' },
        snare:   { percType: 'snare' },
        hihat:   { percType: 'hihat' },
        openhat: { percType: 'openhat' },
        clap:    { percType: 'clap' },
        // Alias per retrocompatibilità
        metalPerc: { percType: 'hihat' },
        // Clavicembalo — attacco secco, molto OPL
        harpsichord: {
            carrier:   { waveform: 0, envelope: { attack: 0.001, decay: 0.3, sustain: 0.2, release: 0.1 } },
            modulator: { waveform: 0, ratio: 3, index: 3.0, envelope: { attack: 0.001, decay: 0.15, sustain: 0.1, release: 0.08 } }
        },
        // Strings pad — morbido e sostenuto
        strings: {
            carrier:   { waveform: 0, envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.3 } },
            modulator: { waveform: 0, ratio: 1, index: 0.8, envelope: { attack: 0.12, decay: 0.3, sustain: 0.5, release: 0.3 } }
        },
        // Vibrafono — tono campanoso
        vibes: {
            carrier:   { waveform: 0, envelope: { attack: 0.001, decay: 0.5, sustain: 0.1, release: 0.2 } },
            modulator: { waveform: 0, ratio: 4, index: 2.0, envelope: { attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.15 } }
        }
    };

    // ── Note Frequencies ───────────────────────────────────────────

    // MIDI note number → frequency
    function midiToFreq(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    // Named notes for convenience: C4 = 60, D4 = 62, etc.
    var NOTE_MAP = {
        'C':0, 'C#':1, 'Db':1, 'D':2, 'D#':3, 'Eb':3, 'E':4, 'F':5,
        'F#':6, 'Gb':6, 'G':7, 'G#':8, 'Ab':8, 'A':9, 'A#':10, 'Bb':10, 'B':11
    };

    function noteToMidi(name) {
        // e.g. "C4", "F#3", "Bb5"
        var match = name.match(/^([A-G][b#]?)(\d)$/);
        if (!match) return 60;
        return (parseInt(match[2]) + 1) * 12 + (NOTE_MAP[match[1]] || 0);
    }

    // ── Public API ─────────────────────────────────────────────────

    return {
        PRESETS: PRESETS,

        init: function(audioContext) {
            ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.3;
            masterGain.connect(ctx.destination);
            return ctx;
        },

        getContext: function() { return ctx; },

        setMasterVolume: function(v) {
            if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
        },

        getMasterOutput: function() { return masterGain; },

        midiToFreq: midiToFreq,
        noteToMidi: noteToMidi,

        /**
         * Suona una nota FM.
         *
         * @param {number} freq     — frequenza in Hz (o MIDI note se < 128)
         * @param {object} preset   — preset strumento (da PRESETS o custom)
         * @param {number} startTime — audioContext time
         * @param {number} duration  — durata in secondi
         * @param {number} volume    — 0..1
         * @param {GainNode} output  — nodo destinazione (default: masterGain)
         * @returns {object} voice handle
         */
        playNote: function(freq, preset, startTime, duration, volume, output) {
            if (!ctx) return null;

            var p = preset || PRESETS.organ;
            var vol = volume !== undefined ? volume : 0.5;
            var dest = output || masterGain;

            // Percussion presets: route to noise-based synthesis
            if (p.percType) {
                playPercInternal(p.percType, startTime || ctx.currentTime, duration, vol, dest);
                return null;
            }

            // freq is always in Hz — callers must use midiToFreq() if starting from MIDI

            var t = startTime || ctx.currentTime;
            var dur = duration || 0.5;

            // Carrier oscillator
            var carrier = ctx.createOscillator();
            carrier.type = 'sine';
            carrier.frequency.value = freq;

            // Carrier gain (ADSR)
            var carrierGain = ctx.createGain();
            carrierGain.gain.value = 0.0001;
            applyADSR(carrierGain.gain, p.carrier.envelope, t, vol);

            // Schedule release
            var ce = p.carrier.envelope;
            var sustainEnd = t + dur - (ce.release || 0.2);
            if (sustainEnd < t + (ce.attack || 0.01) + (ce.decay || 0.1)) {
                sustainEnd = t + dur * 0.7;
            }
            var sustainLevel = vol * (ce.sustain !== undefined ? ce.sustain : 0.7);
            carrierGain.gain.setValueAtTime(sustainLevel, sustainEnd);
            carrierGain.gain.linearRampToValueAtTime(0.0001, t + dur);

            // Modulator oscillator
            var modulator = ctx.createOscillator();
            modulator.type = 'sine';
            var modRatio = p.modulator.ratio || 1;
            modulator.frequency.value = freq * modRatio;

            // Modulator depth = index * modulator frequency
            var modIndex = p.modulator.index || 1;
            var modDepth = modIndex * freq * modRatio;

            var modulatorGain = ctx.createGain();
            modulatorGain.gain.value = 0.0001;
            applyADSR(modulatorGain.gain, p.modulator.envelope, t, modDepth);

            // Modulator release
            var me = p.modulator.envelope;
            var modSustainEnd = t + dur - (me.release || 0.2);
            if (modSustainEnd < t + (me.attack || 0.01) + (me.decay || 0.1)) {
                modSustainEnd = t + dur * 0.7;
            }
            var modSustainLevel = modDepth * (me.sustain !== undefined ? me.sustain : 0.7);
            modulatorGain.gain.setValueAtTime(modSustainLevel, modSustainEnd);
            modulatorGain.gain.linearRampToValueAtTime(0.0001, t + dur);

            // Connect: modulator → carrier.frequency, carrier → output
            modulator.connect(modulatorGain);
            modulatorGain.connect(carrier.frequency);
            carrier.connect(carrierGain);
            carrierGain.connect(dest);

            // Start & stop
            modulator.start(t);
            carrier.start(t);
            modulator.stop(t + dur + 0.05);
            carrier.stop(t + dur + 0.05);

            var voice = {
                carrier: carrier,
                modulator: modulator,
                carrierGain: carrierGain,
                modulatorGain: modulatorGain,
                endTime: t + dur
            };

            return voice;
        },

        /**
         * Suona una nota per nome (es. "C4", "F#3").
         */
        playNamedNote: function(noteName, preset, startTime, duration, volume, output) {
            var midi = noteToMidi(noteName);
            return this.playNote(midiToFreq(midi), preset, startTime, duration, volume, output);
        },

        getPreset: function(name) {
            return PRESETS[name] || PRESETS.organ;
        }
    };
})();
