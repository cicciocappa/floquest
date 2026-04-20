var FloQuest = FloQuest || {};

FloQuest.GameOverScene = class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create(data) {
        var levelNum = data.level || 1;
        var W = FloQuest.Config.WIDTH;
        var H = FloQuest.Config.HEIGHT;

        FloQuest.AudioManager.play('gameover');
        FloQuest.MusicPlayer.play('gameover');

        // Dark background
        var bg = this.add.graphics();
        bg.fillStyle(0x0a0a0a, 1);
        bg.fillRect(0, 0, W, H);

        // Journey-specific defeat artwork (640x480). Placeholder if missing.
        var jid = FloQuest.ScoreManager.currentJourney || 1;
        var key = 'journey_' + jid + '_defeat';
        var imgX = W / 2, imgY = 280;
        if (this.textures.exists(key)) {
            this.add.image(imgX, imgY, key);
        } else {
            var ph = this.add.graphics();
            ph.fillStyle(0x1a0000, 0.6);
            ph.fillRect(imgX - 320, imgY - 240, 640, 480);
            ph.lineStyle(2, 0x8b0000, 0.6);
            ph.strokeRect(imgX - 320, imgY - 240, 640, 480);
            this.add.text(imgX, imgY, '[ defeat image — journey ' + jid + ' ]', {
                fontSize: '20px', fontFamily: 'Georgia, serif', color: '#e74c3c'
            }).setOrigin(0.5);
        }

        // Game Over text
        this.add.text(W/2, 580, 'GAME OVER', {
            fontSize: '52px',
            fontFamily: 'Georgia, serif',
            color: '#e74c3c',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Level info
        var levelData = FloQuest.Levels[levelNum - 1];
        this.add.text(W/2, 640, 'Sconfitto in: ' + levelData.name, {
            fontSize: '18px',
            fontFamily: 'Georgia, serif',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // Final score
        this.add.text(W/2, 680, 'Punteggio: ' + FloQuest.ScoreManager.score, {
            fontSize: '20px',
            fontFamily: 'Georgia, serif',
            color: '#f1c40f'
        }).setOrigin(0.5);

        var self = this;

        // Retry level
        var retryX = W/2 - 110, retryY = 740, retryW = 220, retryH = 45;
        var retryBtn = this.add.graphics();
        retryBtn.fillStyle(0xc9a84c, 1);
        retryBtn.fillRoundedRect(retryX, retryY, retryW, retryH, 8);
        retryBtn.setInteractive(new Phaser.Geom.Rectangle(retryX, retryY, retryW, retryH), Phaser.Geom.Rectangle.Contains);

        this.add.text(W/2, retryY + retryH/2, 'Riprova livello', {
            fontSize: '18px',
            fontFamily: 'Georgia, serif',
            color: '#1a1a2e',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        retryBtn.on('pointerdown', function() {
            FloQuest.AudioManager.play('click');
            FloQuest.ScoreManager.resetForLevel();
            self.cameras.main.fadeOut(400);
            self.time.delayedCall(400, function() {
                self.scene.start('LevelIntroScene', { level: levelNum });
            });
        });

        // Back to title
        var titleX = W/2 - 90, titleY = 800, titleW = 180, titleH = 40;
        var titleBtn = this.add.graphics();
        titleBtn.fillStyle(0x4a3a2a, 1);
        titleBtn.fillRoundedRect(titleX, titleY, titleW, titleH, 8);
        titleBtn.setInteractive(new Phaser.Geom.Rectangle(titleX, titleY, titleW, titleH), Phaser.Geom.Rectangle.Contains);

        this.add.text(W/2, titleY + titleH/2, 'Menu principale', {
            fontSize: '16px',
            fontFamily: 'Georgia, serif',
            color: '#c9a84c'
        }).setOrigin(0.5);

        titleBtn.on('pointerdown', function() {
            FloQuest.AudioManager.play('click');
            self.cameras.main.fadeOut(400);
            self.time.delayedCall(400, function() {
                self.scene.start('TitleScene');
            });
        });

        this.cameras.main.fadeIn(500);
    }
};
