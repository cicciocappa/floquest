var FloQuest = FloQuest || {};

FloQuest.TitleScene = class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    create() {
        var W = FloQuest.Config.VIEWPORT_W;
        var H = FloQuest.Config.VIEWPORT_H;

        // Background
        this.cameras.main.setBackgroundColor('#8bbfe6');

        // Title image at top center
        this.add.image(W / 2, 120, 'title').setOrigin(0.5);

        // Character image anchored to bottom edge
        this.add.image(W / 2, H, 'character').setOrigin(0.5, 1);

        // --- Buttons ---
        var btnCenterX = W / 2;
        var btnStartY = 380;
        var btnGap = 100; // distance between button centers

        var self = this;

        // Button: Avvia
        this._createButton(btnCenterX, btnStartY, 'Avvia', function() {
            FloQuest.AudioManager.play('click');
            FloQuest.AudioManager.resume();
            self.scene.start('JourneySelectScene');
        });

        // Button: Opzioni
        this._createButton(btnCenterX, btnStartY + btnGap, 'Opzioni', function() {
            FloQuest.AudioManager.play('click');
            self.scene.start('OptionsScene');
        });

        // Button: Record
        this._createButton(btnCenterX, btnStartY + btnGap * 2, 'Record', function() {
            FloQuest.AudioManager.play('click');
            self.scene.start('RecordsScene');
        });

        // Start title music
        FloQuest.MusicPlayer.play('title');

        this.cameras.main.fadeIn(500);
    }

    _createButton(x, y, label, callback) {
        var btn = this.add.image(x, y, 'button').setOrigin(0.5);
        btn.setInteractive({ useHandCursor: true });

        var txt = this.add.text(x, y, label, {
            fontSize: '24px',
            fontFamily: 'VCR, monospace',
            color: '#5a3a1a'
        }).setOrigin(0.5);

        btn.on('pointerover', function() {
            btn.setTint(0xdddddd);
        });
        btn.on('pointerout', function() {
            btn.clearTint();
        });
        btn.on('pointerdown', callback);

        return { image: btn, text: txt };
    }
};
