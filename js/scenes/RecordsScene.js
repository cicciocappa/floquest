var FloQuest = FloQuest || {};

FloQuest.RecordsScene = class RecordsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RecordsScene' });
    }

    create() {
        var W = FloQuest.Config.VIEWPORT_W;
        var H = FloQuest.Config.VIEWPORT_H;

        this.cameras.main.setBackgroundColor('#8bbfe6');

        // Title
        this.add.text(W / 2, 60, 'Record', {
            fontSize: '40px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5);

        // Top 10 scores
        var scores = FloQuest.ScoreManager.getTopScores();

        var startY = 130;
        var rowH = 50;

        // Header
        this.add.text(W / 2 - 120, startY, '#', {
            fontSize: '18px', fontFamily: 'VCR, monospace', color: '#1a3a5c'
        }).setOrigin(0.5);
        this.add.text(W / 2, startY, 'Punteggio', {
            fontSize: '18px', fontFamily: 'VCR, monospace', color: '#1a3a5c'
        }).setOrigin(0.5);
        this.add.text(W / 2 + 140, startY, 'Livello', {
            fontSize: '18px', fontFamily: 'VCR, monospace', color: '#1a3a5c'
        }).setOrigin(0.5);

        // Separator
        var sep = this.add.graphics();
        sep.lineStyle(1, 0x1a3a5c, 0.4);
        sep.lineBetween(W / 2 - 180, startY + 18, W / 2 + 200, startY + 18);

        for (var i = 0; i < 10; i++) {
            var y = startY + 40 + i * rowH;
            var hasEntry = i < scores.length;
            var color = i === 0 && hasEntry ? '#c9a84c' : '#1a3a5c';
            var alpha = hasEntry ? 1 : 0.3;

            // Row background (alternating)
            if (i % 2 === 0) {
                var rowBg = this.add.graphics();
                rowBg.fillStyle(0xffffff, 0.15);
                rowBg.fillRoundedRect(W / 2 - 180, y - 18, 380, 40, 6);
            }

            // Position
            this.add.text(W / 2 - 120, y, String(i + 1), {
                fontSize: '18px', fontFamily: 'VCR, monospace', color: color
            }).setOrigin(0.5).setAlpha(alpha);

            // Score
            this.add.text(W / 2, y, hasEntry ? String(scores[i].score) : '---', {
                fontSize: '18px', fontFamily: 'VCR, monospace', color: color
            }).setOrigin(0.5).setAlpha(alpha);

            // Level reached
            this.add.text(W / 2 + 140, y, hasEntry ? String(scores[i].level) : '-', {
                fontSize: '18px', fontFamily: 'VCR, monospace', color: color
            }).setOrigin(0.5).setAlpha(alpha);
        }

        // Back button
        var self = this;
        this._createButton(W / 2, H - 120, 'Indietro', function() {
            FloQuest.AudioManager.play('click');
            self.scene.start('TitleScene');
        });

        this.cameras.main.fadeIn(300);
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
