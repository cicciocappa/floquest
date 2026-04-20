var FloQuest = FloQuest || {};

FloQuest.JourneySelectScene = class JourneySelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'JourneySelectScene' });
    }

    create() {
        var W = FloQuest.Config.VIEWPORT_W;
        var H = FloQuest.Config.VIEWPORT_H;

        this.cameras.main.setBackgroundColor('#8bbfe6');

        // Title
        this.add.text(W / 2, 50, 'Scegli la tua avventura', {
            fontSize: '28px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        // --- Journey buttons in 2 columns ---
        var journeys = FloQuest.Journeys;
        var colW = 280;
        var colGap = 20;
        var rowH = 60;
        var startY = 100;
        var rows = Math.ceil(journeys.length / 2);

        // --- Preview area (between buttons and difficulty) ---
        var previewY = startY + rows * rowH + 20;
        var previewH = 180;
        var previewW = colW * 2 + colGap;

        // Preview background
        var previewBg = this.add.graphics();
        previewBg.fillStyle(0xffffff, 0.2);
        previewBg.fillRoundedRect(W / 2 - previewW / 2, previewY, previewW, previewH, 10);

        // Preview description (short tagline)
        var descText = this.add.text(W / 2, previewY + 20, '', {
            fontSize: '14px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c',
            fontStyle: 'italic',
            align: 'center',
            wordWrap: { width: previewW - 40 }
        }).setOrigin(0.5, 0);

        // Preview intro (narrative frame)
        var introText = this.add.text(W / 2, previewY + 45, '', {
            fontSize: '12px',
            fontFamily: 'VCR, monospace',
            color: '#2a4a6c',
            align: 'center',
            wordWrap: { width: previewW - 40 },
            lineSpacing: 4
        }).setOrigin(0.5, 0);

        // Default hint
        var hintText = this.add.text(W / 2, previewY + previewH / 2, 'Passa il mouse su un\'avventura\nper scoprire la sua storia...', {
            fontSize: '13px',
            fontFamily: 'VCR, monospace',
            color: '#5a7a9c',
            align: 'center'
        }).setOrigin(0.5);

        // Store preview refs for hover updates
        this._preview = {
            desc: descText,
            intro: introText,
            hint: hintText
        };

        var self = this;
        for (var i = 0; i < journeys.length; i++) {
            var col = i % 2;
            var row = Math.floor(i / 2);
            var x = col === 0
                ? W / 2 - colGap / 2 - colW / 2
                : W / 2 + colGap / 2 + colW / 2;
            var y = startY + row * rowH + 25;

            this._createJourneyCard(x, y, colW, journeys[i]);
        }

        // --- Difficulty selection ---
        var diffY = previewY + previewH + 30;

        this.add.text(W / 2, diffY, 'Difficoltà', {
            fontSize: '22px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        var difficulties = [
            { key: 'easy', label: 'Facile' },
            { key: 'normal', label: 'Intermedio' },
            { key: 'hard', label: 'Difficile' }
        ];

        var currentDiff = FloQuest.ScoreManager.getDifficulty();
        var radioY = diffY + 45;
        var radioSpacing = 180;
        var radioStartX = W / 2 - radioSpacing;

        this._radioButtons = [];
        for (var d = 0; d < difficulties.length; d++) {
            var rx = radioStartX + d * radioSpacing;
            this._createRadio(rx, radioY, difficulties[d], currentDiff === difficulties[d].key);
        }

        // --- Animations mode selection ---
        var animY = radioY + 65;

        this.add.text(W / 2, animY, 'Animazioni', {
            fontSize: '22px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        var animModes = [
            { key: 'full', label: 'Complete' },
            { key: 'reduced', label: 'Ridotte' },
            { key: 'none', label: 'Nessuna' }
        ];
        var currentAnim = FloQuest.ScoreManager.getAnimationsMode();
        var animRadioY = animY + 45;

        this._animRadioButtons = [];
        for (var a = 0; a < animModes.length; a++) {
            var ax = radioStartX + a * radioSpacing;
            this._createAnimRadio(ax, animRadioY, animModes[a], currentAnim === animModes[a].key);
        }

        // --- Back button ---
        this._createButton(W / 2, H - 80, 'Indietro', function() {
            FloQuest.AudioManager.play('click');
            self.scene.start('TitleScene');
        });

        this.cameras.main.fadeIn(300);
    }

    _showPreview(journey) {
        this._preview.hint.setVisible(false);
        this._preview.desc.setText(journey.description);
        this._preview.intro.setText(journey.intro || '');
    }

    _hidePreview() {
        this._preview.hint.setVisible(true);
        this._preview.desc.setText('');
        this._preview.intro.setText('');
    }

    _createJourneyCard(x, y, w, journey) {
        var self = this;
        var h = 44;

        // Card background
        var bg = this.add.graphics();
        bg.fillStyle(0xffffff, 0.3);
        bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
        bg.setInteractive(new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h), Phaser.Geom.Rectangle.Contains);
        bg.input.cursor = 'pointer';

        // Journey name only
        this.add.text(x, y, journey.name, {
            fontSize: '15px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        bg.on('pointerover', function() {
            bg.clear();
            bg.fillStyle(0xffffff, 0.5);
            bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
            self._showPreview(journey);
        });
        bg.on('pointerout', function() {
            bg.clear();
            bg.fillStyle(0xffffff, 0.3);
            bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
            self._hidePreview();
        });
        bg.on('pointerdown', async function() {
            if (self._starting) return;
            self._starting = true;

            FloQuest.AudioManager.play('click');
            FloQuest.AudioManager.resume();
            FloQuest.ScoreManager.reset();

            self.cameras.main.fadeOut(500);
            var fadePromise = new Promise(function(resolve) {
                self.time.delayedCall(500, resolve);
            });

            var lang = FloQuest.ScoreManager.getLanguage();
            var diffKey = FloQuest.ScoreManager.getDifficulty();

            try {
                var data = await FloQuest.QuestionsAPI.fetchJourney(diffKey, lang);
                FloQuest.Questions = data.regular;
                FloQuest.BonusQuestions = data.bonus;
            } catch (e) {
                console.error('Failed to fetch questions:', e);
                self._starting = false;
                self.cameras.main.fadeIn(300);
                alert('Errore nel caricamento delle domande. Controlla la connessione e riprova.');
                return;
            }

            await fadePromise;

            FloQuest.ScoreManager.setJourney(journey.id);
            var mode = FloQuest.ScoreManager.getAnimationsMode();
            if (mode === 'none') {
                self.scene.start('SlideshowScene', { level: 1 });
            } else {
                self.scene.start('LevelIntroScene', { level: 1 });
            }
        });
    }

    _createRadio(x, y, diffData, selected) {
        var self = this;
        var radius = 10;

        var gfx = this.add.graphics();
        gfx.lineStyle(2, 0x1a3a5c, 1);
        gfx.strokeCircle(x, y, radius);
        if (selected) {
            gfx.fillStyle(0x1a3a5c, 1);
            gfx.fillCircle(x, y, 6);
        }
        gfx.setInteractive(new Phaser.Geom.Circle(x, y, radius + 8), Phaser.Geom.Circle.Contains);
        gfx.input.cursor = 'pointer';

        this.add.text(x, y + 20, diffData.label, {
            fontSize: '14px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        var entry = { key: diffData.key, gfx: gfx, x: x, y: y };
        this._radioButtons.push(entry);

        gfx.on('pointerdown', function() {
            FloQuest.AudioManager.play('click');
            FloQuest.ScoreManager.setDifficulty(diffData.key);
            for (var i = 0; i < self._radioButtons.length; i++) {
                var r = self._radioButtons[i];
                r.gfx.clear();
                r.gfx.lineStyle(2, 0x1a3a5c, 1);
                r.gfx.strokeCircle(r.x, r.y, radius);
                if (r.key === diffData.key) {
                    r.gfx.fillStyle(0x1a3a5c, 1);
                    r.gfx.fillCircle(r.x, r.y, 6);
                }
            }
        });
    }

    _createAnimRadio(x, y, modeData, selected) {
        var self = this;
        var radius = 10;

        var gfx = this.add.graphics();
        gfx.lineStyle(2, 0x1a3a5c, 1);
        gfx.strokeCircle(x, y, radius);
        if (selected) {
            gfx.fillStyle(0x1a3a5c, 1);
            gfx.fillCircle(x, y, 6);
        }
        gfx.setInteractive(new Phaser.Geom.Circle(x, y, radius + 8), Phaser.Geom.Circle.Contains);
        gfx.input.cursor = 'pointer';

        this.add.text(x, y + 20, modeData.label, {
            fontSize: '14px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        var entry = { key: modeData.key, gfx: gfx, x: x, y: y };
        this._animRadioButtons.push(entry);

        gfx.on('pointerdown', function() {
            FloQuest.AudioManager.play('click');
            FloQuest.ScoreManager.setAnimationsMode(modeData.key);
            for (var i = 0; i < self._animRadioButtons.length; i++) {
                var r = self._animRadioButtons[i];
                r.gfx.clear();
                r.gfx.lineStyle(2, 0x1a3a5c, 1);
                r.gfx.strokeCircle(r.x, r.y, radius);
                if (r.key === modeData.key) {
                    r.gfx.fillStyle(0x1a3a5c, 1);
                    r.gfx.fillCircle(r.x, r.y, 6);
                }
            }
        });
    }

    _createButton(x, y, label, callback) {
        var btn = this.add.image(x, y, 'button').setOrigin(0.5);
        btn.setInteractive({ useHandCursor: true });

        this.add.text(x, y, label, {
            fontSize: '24px',
            fontFamily: 'VCR, monospace',
            color: '#5a3a1a'
        }).setOrigin(0.5);

        btn.on('pointerover', function() { btn.setTint(0xdddddd); });
        btn.on('pointerout', function() { btn.clearTint(); });
        btn.on('pointerdown', callback);
    }
};
