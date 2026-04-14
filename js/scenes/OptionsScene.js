var FloQuest = FloQuest || {};

FloQuest.OptionsScene = class OptionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionsScene' });
    }

    create() {
        var W = FloQuest.Config.VIEWPORT_W;
        var H = FloQuest.Config.VIEWPORT_H;

        this.cameras.main.setBackgroundColor('#8bbfe6');

        // Title
        this.add.text(W / 2, 60, 'Opzioni', {
            fontSize: '40px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        var centerX = W / 2;
        var sectionY = 140;
        var sectionGap = 170;

        // ============================
        // 1. Brightness
        // ============================
        this._createSlider(centerX, sectionY, 'Luminosità',
            FloQuest.ScoreManager.getBrightness(), 0.5, 2.5,
            function(val) { FloQuest.ScoreManager.setBrightness(val); },
            function(val) { return Math.round(val * 100) + '%'; }
        );

        // ============================
        // 2. Music on/off + volume
        // ============================
        sectionY += sectionGap;

        // Music toggle
        this._musicToggle = this._createToggle(centerX, sectionY, 'Musica',
            FloQuest.ScoreManager.getMusicEnabled(),
            function(enabled) {
                FloQuest.ScoreManager.setMusicEnabled(enabled);
                if (enabled) {
                    FloQuest.MusicPlayer.play('title');
                } else {
                    FloQuest.MusicPlayer.stop();
                }
            }
        );

        // Music volume slider
        this._createSlider(centerX, sectionY + 70, 'Volume musica',
            FloQuest.ScoreManager.getMusicVolume(), 0, 1,
            function(val) {
                FloQuest.ScoreManager.setMusicVolume(val);
                FloQuest.MusicPlayer.setVolume(val);
            },
            function(val) { return Math.round(val * 100) + '%'; }
        );

        // ============================
        // 3. Language
        // ============================
        sectionY += sectionGap + 70;

        this._langButtons = [];
        this._createLangSelector(centerX, sectionY);

        // ============================
        // Back button
        // ============================
        var self = this;
        this._createButton(centerX, H - 120, 'Indietro', function() {
            FloQuest.AudioManager.play('click');
            self.scene.start('TitleScene');
        });

        this.cameras.main.fadeIn(300);
    }

    _createSlider(x, y, label, value, min, max, onChange, formatFn) {
        this.add.text(x, y, label, {
            fontSize: '20px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        var sliderW = 300;
        var sliderX = x - sliderW / 2;
        var sliderY = y + 30;

        // Track
        var track = this.add.graphics();
        track.fillStyle(0x1a3a5c, 0.3);
        track.fillRoundedRect(sliderX, sliderY, sliderW, 10, 5);

        // Fill
        var fill = this.add.graphics();
        var pct = (value - min) / (max - min);
        fill.fillStyle(0x1a3a5c, 0.7);
        fill.fillRoundedRect(sliderX, sliderY, sliderW * pct, 10, 5);

        // Handle
        var handle = this.add.graphics();
        handle.fillStyle(0x1a3a5c, 1);
        handle.fillCircle(0, 0, 12);
        handle.setPosition(sliderX + pct * sliderW, sliderY + 5);
        handle.setInteractive(new Phaser.Geom.Circle(0, 0, 16), Phaser.Geom.Circle.Contains);
        handle.setDepth(10);

        // Value label
        var valLabel = this.add.text(x, sliderY + 30, formatFn(value), {
            fontSize: '16px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        var updateSlider = function(p) {
            var clamped = Phaser.Math.Clamp(p, 0, 1);
            var val = min + clamped * (max - min);
            onChange(val);
            handle.setPosition(sliderX + clamped * sliderW, sliderY + 5);
            fill.clear();
            fill.fillStyle(0x1a3a5c, 0.7);
            fill.fillRoundedRect(sliderX, sliderY, sliderW * clamped, 10, 5);
            valLabel.setText(formatFn(val));
        };

        // Track click
        track.setInteractive(new Phaser.Geom.Rectangle(sliderX, sliderY - 6, sliderW, 22), Phaser.Geom.Rectangle.Contains);
        track.on('pointerdown', function(pointer) {
            updateSlider((pointer.x - sliderX) / sliderW);
        });

        // Drag
        this.input.setDraggable(handle);
        handle.on('drag', function(pointer, dragX) {
            updateSlider((dragX - sliderX) / sliderW);
        });
    }

    _createToggle(x, y, label, value, onChange) {
        this.add.text(x - 80, y, label, {
            fontSize: '20px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        var togX = x + 80;
        var togW = 60;
        var togH = 28;
        var enabled = value;

        var bg = this.add.graphics();
        var knob = this.add.graphics();

        var draw = function() {
            bg.clear();
            bg.fillStyle(enabled ? 0x2ecc71 : 0x999999, 1);
            bg.fillRoundedRect(togX - togW / 2, y - togH / 2, togW, togH, togH / 2);

            knob.clear();
            knob.fillStyle(0xffffff, 1);
            var knobX = enabled ? togX + togW / 2 - 14 : togX - togW / 2 + 14;
            knob.fillCircle(knobX, y, 10);
        };
        draw();

        bg.setInteractive(new Phaser.Geom.Rectangle(togX - togW / 2, y - togH / 2, togW, togH), Phaser.Geom.Rectangle.Contains);
        bg.input.cursor = 'pointer';
        bg.on('pointerdown', function() {
            enabled = !enabled;
            onChange(enabled);
            draw();
        });

        return { getEnabled: function() { return enabled; } };
    }

    _createLangSelector(x, y) {
        this.add.text(x, y, 'Lingua', {
            fontSize: '20px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        var langs = [
            { key: 'it', label: 'Italiano' },
            { key: 'en', label: 'English' }
        ];
        var currentLang = FloQuest.ScoreManager.getLanguage();
        var btnY = y + 40;
        var spacing = 160;
        var startX = x - spacing / 2;

        this._langButtons = [];

        var self = this;
        for (var i = 0; i < langs.length; i++) {
            (function(lang, lx) {
                var bg = self.add.graphics();
                var txt = self.add.text(lx, btnY, lang.label, {
                    fontSize: '16px',
                    fontFamily: 'VCR, monospace',
                    color: '#1a3a5c'
                }).setOrigin(0.5);

                var entry = { key: lang.key, bg: bg, x: lx, y: btnY };
                self._langButtons.push(entry);

                var drawBtn = function(selected) {
                    bg.clear();
                    bg.fillStyle(selected ? 0x1a3a5c : 0xffffff, selected ? 0.8 : 0.3);
                    bg.fillRoundedRect(lx - 65, btnY - 18, 130, 36, 8);
                    txt.setColor(selected ? '#8bbfe6' : '#1a3a5c');
                };
                drawBtn(currentLang === lang.key);

                bg.setInteractive(new Phaser.Geom.Rectangle(lx - 65, btnY - 18, 130, 36), Phaser.Geom.Rectangle.Contains);
                bg.input.cursor = 'pointer';
                bg.on('pointerdown', function() {
                    FloQuest.AudioManager.play('click');
                    FloQuest.ScoreManager.setLanguage(lang.key);
                    // Redraw all
                    for (var j = 0; j < self._langButtons.length; j++) {
                        var b = self._langButtons[j];
                        b.bg.clear();
                        var sel = b.key === lang.key;
                        b.bg.fillStyle(sel ? 0x1a3a5c : 0xffffff, sel ? 0.8 : 0.3);
                        b.bg.fillRoundedRect(b.x - 65, b.y - 18, 130, 36, 8);
                    }
                    // Update text colors
                    self.children.list.forEach(function(child) {
                        if (child.type === 'Text' && (child.text === 'Italiano' || child.text === 'English')) {
                            var isSelected = (child.text === 'Italiano' && lang.key === 'it') ||
                                             (child.text === 'English' && lang.key === 'en');
                            child.setColor(isSelected ? '#8bbfe6' : '#1a3a5c');
                        }
                    });
                });
            })(langs[i], startX + i * spacing);
        }
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
