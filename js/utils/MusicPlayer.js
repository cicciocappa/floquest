var FloQuest = FloQuest || {};

/**
 * MusicPlayer — sequencer pattern-based per musica procedurale.
 *
 * Usa FMSynth per generare audio FM stile OPL3.
 * Ogni brano è composto da tracce (melodia, basso, percussioni)
 * definite come pattern di note con lunghezze in step da 1/16.
 *
 * Formato nota nei pattern:
 *   "C4"   → nota con durata di default (1 step)
 *   "C4:2" → nota che dura 2 step
 *   null   → pausa (silenzio per 1 step)
 *   "---"  → pausa esplicita
 */
FloQuest.MusicPlayer = (function() {
    'use strict';

    var synth = FloQuest.FMSynth;
    var ctx = null;
    var playing = false;
    var currentSong = null;
    var timerId = null;
    var nextStepTime = 0;
    var currentStep = 0;
    var scheduleAhead = 0.1;  // secondi di lookahead
    var intervalMs = 25;      // ms tra check dello scheduler
    var volume = 0.4;

    // ── Note Helpers ───────────────────────────────────────────────

    function parseNote(str) {
        if (!str || str === '---') return null;
        var parts = str.split(':');
        return {
            note: parts[0],
            steps: parts.length > 1 ? parseInt(parts[1]) : 1
        };
    }

    // ── Scheduler ──────────────────────────────────────────────────

    function scheduler() {
        if (!playing || !currentSong) return;
        while (nextStepTime < ctx.currentTime + scheduleAhead) {
            playStep(currentStep, nextStepTime);
            advanceStep();
        }
    }

    function advanceStep() {
        var secondsPerStep = 60.0 / (currentSong.bpm * 4); // 16th note
        nextStepTime += secondsPerStep;
        currentStep++;
        if (currentStep >= currentSong.patternLength) {
            currentStep = 0;
        }
    }

    function playStep(step, time) {
        var song = currentSong;
        var spb = 60.0 / (song.bpm * 4); // seconds per step (16th)

        for (var t = 0; t < song.tracks.length; t++) {
            var track = song.tracks[t];
            var pattern = track.pattern;
            var idx = step % pattern.length;
            var noteStr = pattern[idx];
            var parsed = parseNote(noteStr);
            if (!parsed) continue;

            var midi = synth.noteToMidi(parsed.note);
            var freq = synth.midiToFreq(midi);
            var dur = parsed.steps * spb * 0.9; // slightly shorter than full step for separation
            var preset = synth.getPreset(track.preset || 'organ');
            var vol = (track.volume !== undefined ? track.volume : 0.5) * volume;
            // Boost percussioni — il synth le genera più piano dei toni melodici
            if (preset.percType) vol *= 2.5;

            synth.playNote(freq, preset, time, dur, vol);
        }
    }

    // ── Song Definitions per Ambiente ──────────────────────────────

    // Ogni ambiente ha un brano con melodia, basso e percussioni.
    // Tonalità e mood variano per creare atmosfere diverse.

    var SONGS = {

        // ─── Tempio / Default — misterioso, avventuroso ───
        temple: {
            bpm: 100,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'brass',
                    volume: 0.35,
                    pattern: [
                        'E4:2', null, 'G4:2', null, 'A4:2', null, 'B4:2', null,
                        'A4:2', null, 'G4:2', null, 'E4:4', null, null, null,
                        'D4:2', null, 'E4:2', null, 'G4:2', null, 'A4:2', null,
                        'G4:2', null, 'E4:2', null, 'D4:4', null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.4,
                    pattern: [
                        'E2:4', null, null, null, 'A2:4', null, null, null,
                        'E2:4', null, null, null, 'B2:4', null, null, null,
                        'D2:4', null, null, null, 'G2:4', null, null, null,
                        'A2:4', null, null, null, 'E2:4', null, null, null
                    ]
                },
                {
                    name: 'perc',
                    preset: 'kick',
                    volume: 0.25,
                    pattern: [
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, null, null
                    ]
                },
                {
                    name: 'hihat',
                    preset: 'hihat',
                    volume: 0.12,
                    pattern: [
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null
                    ]
                }
            ]
        },

        // ─── Caverna — eco, toni bassi, atmosfera cupa ───
        cave: {
            bpm: 80,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'vibes',
                    volume: 0.3,
                    pattern: [
                        'E4:3', null, null, 'G4:2', null, 'Bb4:3', null, null,
                        'A4:2', null, null, null, 'G4:4', null, null, null,
                        'F4:3', null, null, 'E4:2', null, 'D4:3', null, null,
                        'E4:4', null, null, null, null, null, null, null
                    ]
                },
                {
                    name: 'pad',
                    preset: 'strings',
                    volume: 0.2,
                    pattern: [
                        'E3:8', null, null, null, null, null, null, null,
                        'D3:8', null, null, null, null, null, null, null,
                        'F3:8', null, null, null, null, null, null, null,
                        'E3:8', null, null, null, null, null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.35,
                    pattern: [
                        'E2:4', null, null, null, 'Bb2:4', null, null, null,
                        'D2:4', null, null, null, 'G2:4', null, null, null,
                        'F2:4', null, null, null, 'D2:4', null, null, null,
                        'E2:4', null, null, null, 'E2:4', null, null, null
                    ]
                }
            ]
        },

        // ─── Giungla — ritmo tribale, percussioni prominenti ───
        jungle: {
            bpm: 110,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'flute',
                    volume: 0.35,
                    pattern: [
                        'D5:2', null, 'F5', 'D5', 'A4:2', null, null,
                        'C5:2', null, 'A4', null, 'G4:2', null, null, null,
                        'D5:2', null, 'F5', 'E5', 'D5:2', null, null,
                        'C5:2', null, 'A4', null, 'D5:2', null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.4,
                    pattern: [
                        'D2:2', null, 'D3', null, 'A2:2', null, 'A2', null,
                        'C3:2', null, 'C2', null, 'G2:2', null, 'G2', null,
                        'D2:2', null, 'D3', null, 'F2:2', null, 'F2', null,
                        'C3:2', null, 'C2', null, 'D2:2', null, 'D2', null
                    ]
                },
                {
                    name: 'kick',
                    preset: 'kick',
                    volume: 0.3,
                    pattern: [
                        'C2', null, null, 'C2', null, null, 'C2', null,
                        'C2', null, null, 'C2', null, null, 'C2', null,
                        'C2', null, null, 'C2', null, null, 'C2', null,
                        'C2', null, null, 'C2', null, null, 'C2', null
                    ]
                },
                {
                    name: 'snare',
                    preset: 'snare',
                    volume: 0.2,
                    pattern: [
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, 'E3', null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, 'E3', null
                    ]
                },
                {
                    name: 'hihat',
                    preset: 'hihat',
                    volume: 0.1,
                    pattern: [
                        'C4', null, 'C4', null, 'C4', null, 'C4', null,
                        'C4', null, 'C4', null, 'C4', null, 'C4', null,
                        'C4', null, 'C4', null, 'C4', null, 'C4', null,
                        'C4', null, 'C4', null, 'C4', null, 'C4', null
                    ]
                }
            ]
        },

        // ─── Vulcano — pesante, minaccioso, accordi di potenza ───
        volcano: {
            bpm: 95,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'brass',
                    volume: 0.35,
                    pattern: [
                        'A4:4', null, null, null, 'C5:2', null, 'B4:2',
                        null, 'A4:4', null, null, null, 'G4:4', null, null, null,
                        'F4:4', null, null, null, 'E4:2', null, 'F4:2',
                        null, 'A4:4', null, null, null, null, null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.45,
                    pattern: [
                        'A1:2', null, 'A2', null, 'A1:2', null, 'G1', null,
                        'F1:2', null, 'F2', null, 'E1:2', null, 'E2', null,
                        'F1:2', null, 'F2', null, 'F1:2', null, 'G1', null,
                        'A1:2', null, 'A2', null, 'A1:2', null, 'A2', null
                    ]
                },
                {
                    name: 'kick',
                    preset: 'kick',
                    volume: 0.35,
                    pattern: [
                        'C2', null, null, null, 'C2', null, 'C2', null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, 'C2', null,
                        'C2', null, null, null, 'C2', null, null, null
                    ]
                },
                {
                    name: 'snare',
                    preset: 'snare',
                    volume: 0.2,
                    pattern: [
                        null, null, null, null, null, null, null, null,
                        'D3', null, null, null, null, null, null, null,
                        null, null, null, null, null, null, null, null,
                        'D3', null, null, null, null, null, null, null
                    ]
                }
            ]
        },

        // ─── Biblioteca — elegante, clavicembalo, classico ───
        library: {
            bpm: 90,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'harpsichord',
                    volume: 0.3,
                    pattern: [
                        'E5:2', null, 'D5', 'C5', 'B4:2', null, 'A4:2',
                        null, 'G4:2', null, 'A4', 'B4', 'C5:4', null, null, null,
                        'D5:2', null, 'C5', 'B4', 'A4:2', null, 'G4:2',
                        null, 'A4:2', null, 'B4:2', null, 'C5:4', null, null, null
                    ]
                },
                {
                    name: 'counter',
                    preset: 'flute',
                    volume: 0.2,
                    pattern: [
                        'C4:4', null, null, null, 'E4:4', null, null, null,
                        'D4:4', null, null, null, 'E4:4', null, null, null,
                        'F4:4', null, null, null, 'E4:4', null, null, null,
                        'D4:4', null, null, null, 'C4:4', null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.3,
                    pattern: [
                        'C3:4', null, null, null, 'E3:4', null, null, null,
                        'G2:4', null, null, null, 'C3:4', null, null, null,
                        'F2:4', null, null, null, 'E2:4', null, null, null,
                        'G2:4', null, null, null, 'C3:4', null, null, null
                    ]
                }
            ]
        },

        // ─── Ghiaccio — freddo, cristallino, vibrafono ───
        ice: {
            bpm: 85,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'vibes',
                    volume: 0.3,
                    pattern: [
                        'B4:3', null, null, 'D5:2', null, 'F#5:3', null, null,
                        'E5:2', null, 'D5:2', null, 'B4:4', null, null, null,
                        'A4:3', null, null, 'B4:2', null, 'D5:3', null, null,
                        'C#5:2', null, 'B4:2', null, 'A4:4', null, null, null
                    ]
                },
                {
                    name: 'pad',
                    preset: 'strings',
                    volume: 0.18,
                    pattern: [
                        'B3:8', null, null, null, null, null, null, null,
                        'A3:8', null, null, null, null, null, null, null,
                        'F#3:8', null, null, null, null, null, null, null,
                        'A3:8', null, null, null, null, null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.3,
                    pattern: [
                        'B2:4', null, null, null, 'F#2:4', null, null, null,
                        'A2:4', null, null, null, 'E2:4', null, null, null,
                        'F#2:4', null, null, null, 'D2:4', null, null, null,
                        'A2:4', null, null, null, 'B2:4', null, null, null
                    ]
                },
                {
                    name: 'hihat',
                    preset: 'hihat',
                    volume: 0.08,
                    pattern: [
                        null, null, null, null, 'C4', null, null, null,
                        null, null, null, null, 'C4', null, null, null,
                        null, null, null, null, 'C4', null, null, null,
                        null, null, null, null, 'C4', null, null, null
                    ]
                }
            ]
        },

        // ─── Catacombe — oscuro, organo, eco ───
        catacombs: {
            bpm: 75,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'organ',
                    volume: 0.3,
                    pattern: [
                        'D4:4', null, null, null, 'F4:2', null, 'E4:2',
                        null, 'D4:2', null, 'C4:2', null, 'A3:4', null, null, null,
                        'Bb3:4', null, null, null, 'C4:2', null, 'D4:2',
                        null, 'C4:2', null, 'Bb3:2', null, 'A3:4', null, null, null
                    ]
                },
                {
                    name: 'pad',
                    preset: 'strings',
                    volume: 0.2,
                    pattern: [
                        'D3:8', null, null, null, null, null, null, null,
                        'A2:8', null, null, null, null, null, null, null,
                        'Bb2:8', null, null, null, null, null, null, null,
                        'A2:8', null, null, null, null, null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.4,
                    pattern: [
                        'D2:4', null, null, null, 'F2:4', null, null, null,
                        'D2:4', null, null, null, 'A1:4', null, null, null,
                        'Bb1:4', null, null, null, 'C2:4', null, null, null,
                        'A1:4', null, null, null, 'D2:4', null, null, null
                    ]
                },
                {
                    name: 'kick',
                    preset: 'kick',
                    volume: 0.2,
                    pattern: [
                        'C2', null, null, null, null, null, null, null,
                        'C2', null, null, null, null, null, null, null,
                        'C2', null, null, null, null, null, null, null,
                        'C2', null, null, null, null, null, null, null
                    ]
                }
            ]
        },

        // ─── Nave — ondeggiante, avventura marina ───
        ship: {
            bpm: 105,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'brass',
                    volume: 0.3,
                    pattern: [
                        'G4:2', null, 'A4', 'B4', 'C5:2', null, 'B4:2',
                        null, 'A4:2', null, 'G4:2', null, 'E4:4', null, null, null,
                        'F4:2', null, 'G4', 'A4', 'B4:2', null, 'C5:2',
                        null, 'B4:2', null, 'A4:2', null, 'G4:4', null, null, null
                    ]
                },
                {
                    name: 'counter',
                    preset: 'flute',
                    volume: 0.2,
                    pattern: [
                        'E4:4', null, null, null, 'G4:4', null, null, null,
                        'F4:4', null, null, null, 'C4:4', null, null, null,
                        'D4:4', null, null, null, 'G4:4', null, null, null,
                        'F4:4', null, null, null, 'E4:4', null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.35,
                    pattern: [
                        'C3:2', null, 'E3', null, 'G2:2', null, 'G3', null,
                        'F2:2', null, 'A2', null, 'C3:2', null, 'C2', null,
                        'D3:2', null, 'F2', null, 'G2:2', null, 'B2', null,
                        'F2:2', null, 'G2', null, 'C3:2', null, 'C2', null
                    ]
                },
                {
                    name: 'kick',
                    preset: 'kick',
                    volume: 0.25,
                    pattern: [
                        'C2', null, null, null, null, null, 'C2', null,
                        null, null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, null, null, 'C2', null,
                        null, null, null, null, 'C2', null, null, null
                    ]
                },
                {
                    name: 'hihat',
                    preset: 'hihat',
                    volume: 0.1,
                    pattern: [
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null
                    ]
                }
            ]
        },

        // ─── Torre — misterioso, alchemico, scale cromatiche ───
        tower: {
            bpm: 88,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'organ',
                    volume: 0.3,
                    pattern: [
                        'E4:2', null, 'F#4', 'G#4', 'A4:2', null, 'B4:2',
                        null, 'C5:2', null, 'B4:2', null, 'G#4:4', null, null, null,
                        'A4:2', null, 'G#4', 'F#4', 'E4:2', null, 'D#4:2',
                        null, 'E4:4', null, null, null, null, null, null, null
                    ]
                },
                {
                    name: 'arp',
                    preset: 'harpsichord',
                    volume: 0.2,
                    pattern: [
                        'E3', null, 'G#3', null, 'B3', null, 'E4', null,
                        'A3', null, 'C4', null, 'E4', null, 'A4', null,
                        'E3', null, 'G#3', null, 'B3', null, 'D#4', null,
                        'E3', null, 'G#3', null, 'B3', null, 'E4', null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.35,
                    pattern: [
                        'E2:4', null, null, null, 'A2:4', null, null, null,
                        'C3:4', null, null, null, 'B2:4', null, null, null,
                        'A2:4', null, null, null, 'F#2:4', null, null, null,
                        'G#2:4', null, null, null, 'E2:4', null, null, null
                    ]
                }
            ]
        },

        // ─── Tesoro — trionfale, maestoso ───
        treasure: {
            bpm: 115,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'brass',
                    volume: 0.35,
                    pattern: [
                        'C5:2', null, 'E5:2', null, 'G5:2', null, 'C6:2',
                        null, 'B5:2', null, 'G5:2', null, 'E5:4', null, null, null,
                        'F5:2', null, 'A5:2', null, 'G5:2', null, 'F5:2',
                        null, 'E5:2', null, 'D5:2', null, 'C5:4', null, null, null
                    ]
                },
                {
                    name: 'harmony',
                    preset: 'organ',
                    volume: 0.2,
                    pattern: [
                        'E4:4', null, null, null, 'G4:4', null, null, null,
                        'D4:4', null, null, null, 'C4:4', null, null, null,
                        'F4:4', null, null, null, 'E4:4', null, null, null,
                        'D4:4', null, null, null, 'E4:4', null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.4,
                    pattern: [
                        'C3:2', null, 'C2', null, 'G2:2', null, 'G3', null,
                        'D3:2', null, 'D2', null, 'C3:2', null, 'C2', null,
                        'F2:2', null, 'F3', null, 'E2:2', null, 'E3', null,
                        'G2:2', null, 'G3', null, 'C3:2', null, 'C2', null
                    ]
                },
                {
                    name: 'kick',
                    preset: 'kick',
                    volume: 0.3,
                    pattern: [
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, 'C2', null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, 'C2', null
                    ]
                },
                {
                    name: 'snare',
                    preset: 'snare',
                    volume: 0.2,
                    pattern: [
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null
                    ]
                },
                {
                    name: 'hihat',
                    preset: 'hihat',
                    volume: 0.1,
                    pattern: [
                        'C4', null, 'C4', null, 'C4', null, 'C4', null,
                        'C4', null, 'C4', null, 'C4', null, 'C4', null,
                        'C4', null, 'C4', null, 'C4', null, 'C4', null,
                        'C4', null, 'C4', null, 'C4', null, 'C4', null
                    ]
                }
            ]
        },

        // ─── Ambienti Journey 2 — riusano brani simili con variazioni ───

        forest: {
            bpm: 100,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'flute',
                    volume: 0.3,
                    pattern: [
                        'G4:2', null, 'A4', 'B4', 'C5:2', null, 'D5:2',
                        null, 'C5:2', null, 'B4:2', null, 'G4:4', null, null, null,
                        'A4:2', null, 'B4', 'C5', 'D5:2', null, 'E5:2',
                        null, 'D5:2', null, 'C5:2', null, 'B4:4', null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.35,
                    pattern: [
                        'G2:4', null, null, null, 'C3:4', null, null, null,
                        'D3:4', null, null, null, 'G2:4', null, null, null,
                        'A2:4', null, null, null, 'D3:4', null, null, null,
                        'G2:4', null, null, null, 'B2:4', null, null, null
                    ]
                },
                {
                    name: 'pad',
                    preset: 'strings',
                    volume: 0.15,
                    pattern: [
                        'G3:8', null, null, null, null, null, null, null,
                        'C3:8', null, null, null, null, null, null, null,
                        'A3:8', null, null, null, null, null, null, null,
                        'D3:8', null, null, null, null, null, null, null
                    ]
                }
            ]
        },

        swamp: {
            bpm: 70,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'organ',
                    volume: 0.25,
                    pattern: [
                        'Eb4:3', null, null, 'F4:2', null, 'Gb4:3', null, null,
                        'F4:2', null, 'Eb4:2', null, 'Db4:4', null, null, null,
                        'Eb4:3', null, null, 'Gb4:2', null, 'Ab4:3', null, null,
                        'Gb4:2', null, 'F4:2', null, 'Eb4:4', null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.4,
                    pattern: [
                        'Eb2:4', null, null, null, 'Gb2:4', null, null, null,
                        'Db2:4', null, null, null, 'Eb2:4', null, null, null,
                        'Eb2:4', null, null, null, 'Ab2:4', null, null, null,
                        'Gb2:4', null, null, null, 'Eb2:4', null, null, null
                    ]
                },
                {
                    name: 'kick',
                    preset: 'kick',
                    volume: 0.2,
                    pattern: [
                        'C2', null, null, null, null, null, null, null,
                        null, null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, null, null, null, null,
                        null, null, null, null, 'C2', null, null, null
                    ]
                }
            ]
        },

        // ─── Title screen — avventuroso, memorabile ───
        title: {
            bpm: 120,
            patternLength: 64,
            tracks: [
                {
                    name: 'melody',
                    preset: 'brass',
                    volume: 0.35,
                    pattern: [
                        'C5:2', null, 'E5:2', null, 'G5:4', null, null, null,
                        'F5:2', null, 'E5:2', null, 'D5:4', null, null, null,
                        'C5:2', null, 'D5:2', null, 'E5:2', null, 'G5:2', null,
                        'A5:4', null, null, null, 'G5:4', null, null, null,
                        'A5:2', null, 'G5:2', null, 'F5:2', null, 'E5:2', null,
                        'D5:2', null, 'E5:2', null, 'C5:4', null, null, null,
                        'D5:2', null, 'E5:2', null, 'F5:2', null, 'G5:2', null,
                        'C6:4', null, null, null, null, null, null, null
                    ]
                },
                {
                    name: 'harmony',
                    preset: 'organ',
                    volume: 0.2,
                    pattern: [
                        'E4:4', null, null, null, 'G4:4', null, null, null,
                        'F4:4', null, null, null, 'D4:4', null, null, null,
                        'C4:4', null, null, null, 'E4:4', null, null, null,
                        'F4:4', null, null, null, 'E4:4', null, null, null,
                        'F4:4', null, null, null, 'E4:4', null, null, null,
                        'D4:4', null, null, null, 'C4:4', null, null, null,
                        'D4:4', null, null, null, 'F4:4', null, null, null,
                        'E4:4', null, null, null, null, null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.4,
                    pattern: [
                        'C3:2', null, 'C2', null, 'G2:2', null, 'G3', null,
                        'F2:2', null, 'F3', null, 'G2:2', null, 'G3', null,
                        'C3:2', null, 'C2', null, 'E2:2', null, 'E3', null,
                        'F2:2', null, 'F3', null, 'G2:2', null, 'G3', null,
                        'F2:2', null, 'F3', null, 'E2:2', null, 'E3', null,
                        'D2:2', null, 'D3', null, 'C2:2', null, 'C3', null,
                        'D2:2', null, 'D3', null, 'G2:2', null, 'G3', null,
                        'C3:2', null, 'C2', null, 'C3:2', null, 'C2', null
                    ]
                },
                {
                    name: 'kick',
                    preset: 'kick',
                    volume: 0.3,
                    pattern: [
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, 'C2', null
                    ]
                },
                {
                    name: 'snare',
                    preset: 'snare',
                    volume: 0.2,
                    pattern: [
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, 'E3', 'E3'
                    ]
                },
                {
                    name: 'hihat',
                    preset: 'hihat',
                    volume: 0.1,
                    pattern: [
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null,
                        null, null, 'C4', null, null, null, 'C4', null
                    ]
                }
            ]
        },

        // ─── Victory — festoso, trionfale ───
        victory: {
            bpm: 130,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'brass',
                    volume: 0.4,
                    pattern: [
                        'C5:2', null, 'C5', 'D5', 'E5:2', null, 'G5:2',
                        null, 'E5:2', null, 'C5:2', null, 'D5:4', null, null, null,
                        'E5:2', null, 'E5', 'F5', 'G5:2', null, 'C6:2',
                        null, 'G5:2', null, 'E5:2', null, 'C5:4', null, null, null
                    ]
                },
                {
                    name: 'harmony',
                    preset: 'organ',
                    volume: 0.25,
                    pattern: [
                        'E4:4', null, null, null, 'G4:4', null, null, null,
                        'C4:4', null, null, null, 'G4:4', null, null, null,
                        'G4:4', null, null, null, 'E4:4', null, null, null,
                        'G4:4', null, null, null, 'E4:4', null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.4,
                    pattern: [
                        'C3:2', null, 'C2', null, 'E2:2', null, 'G2', null,
                        'C3:2', null, 'G2', null, 'D3:2', null, 'G2', null,
                        'E3:2', null, 'C2', null, 'G2:2', null, 'C3', null,
                        'G2:2', null, 'E2', null, 'C3:2', null, 'C2', null
                    ]
                },
                {
                    name: 'kick',
                    preset: 'kick',
                    volume: 0.3,
                    pattern: [
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, 'C2', null,
                        'C2', null, null, null, 'C2', null, null, null,
                        'C2', null, null, null, 'C2', null, 'C2', null
                    ]
                },
                {
                    name: 'snare',
                    preset: 'snare',
                    volume: 0.22,
                    pattern: [
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, null, null,
                        null, null, null, null, 'E3', null, 'E3', null
                    ]
                },
                {
                    name: 'hihat',
                    preset: 'hihat',
                    volume: 0.12,
                    pattern: [
                        'C4', null, 'C4', null, 'C4', null, 'C4', null,
                        'C4', null, 'C4', null, 'C4', null, 'C4', null,
                        'C4', null, 'C4', null, 'C4', null, 'C4', null,
                        'C4', null, 'C4', null, 'C4', null, 'C4', null
                    ]
                }
            ]
        },

        // ─── Game Over — lento, mesto ───
        gameover: {
            bpm: 65,
            patternLength: 32,
            tracks: [
                {
                    name: 'melody',
                    preset: 'strings',
                    volume: 0.3,
                    pattern: [
                        'E4:4', null, null, null, 'D4:4', null, null, null,
                        'C4:4', null, null, null, 'B3:4', null, null, null,
                        'A3:4', null, null, null, 'G3:4', null, null, null,
                        'A3:8', null, null, null, null, null, null, null
                    ]
                },
                {
                    name: 'bass',
                    preset: 'bass',
                    volume: 0.3,
                    pattern: [
                        'A2:8', null, null, null, null, null, null, null,
                        'E2:8', null, null, null, null, null, null, null,
                        'F2:8', null, null, null, null, null, null, null,
                        'A2:8', null, null, null, null, null, null, null
                    ]
                }
            ]
        }
    };

    // Alias ambienti che riusano stessi brani
    SONGS['default'] = SONGS.temple;

    // ── Public API ─────────────────────────────────────────────────

    return {
        SONGS: SONGS,

        init: function(audioContext) {
            ctx = audioContext || synth.getContext();
            if (!ctx) {
                ctx = synth.init();
            }
        },

        /**
         * Avvia la musica per un dato ambiente.
         * @param {string} environment — nome ambiente (es. 'temple', 'cave', 'title')
         */
        play: function(environment) {
            this.stop();

            // Respect music enabled setting
            if (!FloQuest.ScoreManager.getMusicEnabled()) return;

            var song = SONGS[environment] || SONGS['default'];
            currentSong = song;
            currentStep = 0;

            if (!ctx) this.init();

            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            // Apply saved volume
            volume = FloQuest.ScoreManager.getMusicVolume();

            nextStepTime = ctx.currentTime + 0.1;
            playing = true;

            timerId = setInterval(scheduler, intervalMs);
        },

        /**
         * Ferma la musica.
         */
        stop: function() {
            playing = false;
            currentSong = null;
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
        },

        /**
         * Pausa / riprendi.
         */
        isPlaying: function() {
            return playing;
        },

        /**
         * Imposta il volume globale della musica (0..1).
         */
        setVolume: function(v) {
            volume = Math.max(0, Math.min(1, v));
        },

        getVolume: function() {
            return volume;
        },

        /**
         * Restituisce la lista degli ambienti con musica disponibile.
         */
        getAvailableEnvironments: function() {
            return Object.keys(SONGS);
        }
    };
})();
