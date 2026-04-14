var FloQuest = FloQuest || {};

FloQuest.TrapScene = class TrapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TrapScene' });
    }

    create(data) {
        this.levelNum = data.level;
        this.questionIndex = data.questionIndex;
        var levelData = FloQuest.Levels[this.levelNum - 1];
        var W = FloQuest.Config.WIDTH;
        var H = FloQuest.Config.HEIGHT;

        // Dark background
        var bg = this.add.graphics();
        bg.fillStyle(0x0a0a0a, 1);
        bg.fillRect(0, 0, W, H);

        // Environment hint
        FloQuest.Environment.draw(this, levelData);

        // Darken
        var overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.5);
        overlay.fillRect(0, 0, W, H);
        overlay.setDepth(5);

        // Player
        var player = FloQuest.Player.create(this, W/2, 350);
        player.setDepth(10);

        // Play trap effect
        var self = this;
        FloQuest.AudioManager.play('trap');

        this.time.delayedCall(400, function() {
            FloQuest.TrapEffect.play(self, levelData.trap, W/2, 350, function() {
                // Player death animation
                FloQuest.Player.die(self, player, levelData.trap, function() {
                    self._showResult();
                });
            });
        });

        // Trap name
        var trapText = this.add.text(W/2, 80, levelData.trapName + '!', {
            fontSize: '32px',
            fontFamily: 'Georgia, serif',
            color: '#e74c3c',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: trapText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 300,
            yoyo: true,
            repeat: 2
        });

        this.cameras.main.fadeIn(200);
    }

    _showResult() {
        var isDead = FloQuest.ScoreManager.loseLife();
        var W = FloQuest.Config.WIDTH;
        var H = FloQuest.Config.HEIGHT;

        // Life lost indicator
        var livesLeft = FloQuest.ScoreManager.lives;

        // Show remaining lives
        var lifeText = this.add.text(W/2, 450, isDead ? 'Hai perso tutte le vite!' : 'Vite rimaste: ' + livesLeft, {
            fontSize: '22px',
            fontFamily: 'Georgia, serif',
            color: isDead ? '#e74c3c' : '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(20);

        // Draw hearts
        if (!isDead) {
            for (var i = 0; i < livesLeft; i++) {
                this.add.image(W/2 - 30 + i * 30, 490, 'heart').setScale(0.8).setDepth(20);
            }
        } else {
            this.add.image(W/2, 490, 'skull').setScale(1.5).setDepth(20);
        }

        // Continue prompt
        var self = this;
        this.time.delayedCall(1500, function() {
            var prompt = self.add.text(W/2, 540, isDead ? 'Clicca per continuare...' : 'Clicca per riprovare...', {
                fontSize: '16px',
                fontFamily: 'Georgia, serif',
                color: '#c9a84c'
            }).setOrigin(0.5).setDepth(20);

            self.tweens.add({
                targets: prompt,
                alpha: 0.3,
                duration: 600,
                yoyo: true,
                repeat: -1
            });

            self.input.once('pointerdown', function() {
                FloQuest.AudioManager.play('click');
                self.cameras.main.fadeOut(400);
                self.time.delayedCall(400, function() {
                    if (isDead) {
                        self.scene.start('GameOverScene', { level: self.levelNum });
                    } else {
                        // Return to game, same question
                        self.scene.start('GameScene', { level: self.levelNum });
                    }
                });
            });
        });
    }
};
