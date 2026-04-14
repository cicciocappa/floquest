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

        // Red vignette
        bg.fillStyle(0x3a0000, 0.3);
        bg.fillRect(0, 0, W, H);

        // Skull
        var skull = this.add.image(W/2, 200, 'skull').setScale(4);
        skull.setAlpha(0);
        this.tweens.add({
            targets: skull,
            alpha: 1,
            scaleX: 5,
            scaleY: 5,
            duration: 1000,
            ease: 'Power2'
        });

        // Game Over text
        var goText = this.add.text(W/2, 320, 'GAME OVER', {
            fontSize: '52px',
            fontFamily: 'Georgia, serif',
            color: '#e74c3c',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        goText.setAlpha(0);

        this.tweens.add({
            targets: goText,
            alpha: 1,
            duration: 1000,
            delay: 500
        });

        // Level info
        var levelData = FloQuest.Levels[levelNum - 1];
        this.add.text(W/2, 380, 'Sconfitto in: ' + levelData.name, {
            fontSize: '18px',
            fontFamily: 'Georgia, serif',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // Final score
        this.add.text(W/2, 415, 'Punteggio: ' + FloQuest.ScoreManager.score, {
            fontSize: '20px',
            fontFamily: 'Georgia, serif',
            color: '#f1c40f'
        }).setOrigin(0.5);

        // Buttons
        var self = this;

        // Retry level
        var retryBtn = this.add.graphics();
        retryBtn.fillStyle(0xc9a84c, 1);
        retryBtn.fillRoundedRect(W/2 - 110, 460, 220, 45, 8);
        retryBtn.setInteractive(new Phaser.Geom.Rectangle(W/2 - 110, 460, 220, 45), Phaser.Geom.Rectangle.Contains);

        this.add.text(W/2, 482, 'Riprova livello', {
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
        var titleBtn = this.add.graphics();
        titleBtn.fillStyle(0x4a3a2a, 1);
        titleBtn.fillRoundedRect(W/2 - 90, 520, 180, 40, 8);
        titleBtn.setInteractive(new Phaser.Geom.Rectangle(W/2 - 90, 520, 180, 40), Phaser.Geom.Rectangle.Contains);

        this.add.text(W/2, 540, 'Menu principale', {
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

        // Falling particles
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: W },
            y: -10,
            speed: { min: 30, max: 60 },
            angle: { min: 80, max: 100 },
            scale: { start: 0.3, end: 0 },
            lifespan: 4000,
            frequency: 200,
            tint: [0xe74c3c, 0x8b0000],
            alpha: { start: 0.5, end: 0 }
        });

        this.cameras.main.fadeIn(500);
    }
};
