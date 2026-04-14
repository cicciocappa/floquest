var FloQuest = FloQuest || {};

FloQuest.VictoryScene = class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VictoryScene' });
    }

    create() {
        var W = FloQuest.Config.WIDTH;
        var H = FloQuest.Config.HEIGHT;

        FloQuest.AudioManager.play('victory');
        FloQuest.MusicPlayer.play('victory');

        // Golden background
        var bg = this.add.graphics();
        bg.fillStyle(0x1a1a0a, 1);
        bg.fillRect(0, 0, W, H);

        // Golden glow center
        bg.fillStyle(0x3d3510, 0.5);
        bg.fillCircle(W/2, H/2, 300);
        bg.fillStyle(0x5d5520, 0.3);
        bg.fillCircle(W/2, H/2, 200);
        bg.fillStyle(0x7d7530, 0.2);
        bg.fillCircle(W/2, H/2, 100);

        // Decorative border
        bg.lineStyle(4, 0xf1c40f, 0.8);
        bg.strokeRect(20, 20, W - 40, H - 40);
        bg.lineStyle(2, 0xc9a84c, 0.5);
        bg.strokeRect(30, 30, W - 60, H - 60);

        // Corner ornaments
        var ornSize = 20;
        var corners = [[30,30], [W-30,30], [30,H-30], [W-30,H-30]];
        for (var i = 0; i < corners.length; i++) {
            bg.fillStyle(0xf1c40f, 0.8);
            bg.fillCircle(corners[i][0], corners[i][1], ornSize/2);
        }

        // VICTORY text
        var victoryText = this.add.text(W/2, 80, 'VITTORIA!', {
            fontSize: '56px',
            fontFamily: 'Georgia, serif',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        this.tweens.add({
            targets: victoryText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle
        this.add.text(W/2, 140, "Hai completato l'avventura!", {
            fontSize: '22px',
            fontFamily: 'Georgia, serif',
            color: '#d4a574',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // Trophy
        var trophy = this.add.image(W/2, 240, 'trophy').setScale(3);
        this.tweens.add({
            targets: trophy,
            y: 235,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Player
        var player = this.add.image(W/2, 340, 'player').setScale(2.5);
        this.tweens.add({
            targets: player,
            y: 335,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Final score
        this.add.text(W/2, 400, 'PUNTEGGIO FINALE', {
            fontSize: '18px',
            fontFamily: 'Georgia, serif',
            color: '#c9a84c'
        }).setOrigin(0.5);

        var scoreValue = this.add.text(W/2, 435, '' + FloQuest.ScoreManager.score, {
            fontSize: '42px',
            fontFamily: 'Georgia, serif',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Animate score counting up
        var finalScore = FloQuest.ScoreManager.score;
        var counter = { val: 0 };
        this.tweens.add({
            targets: counter,
            val: finalScore,
            duration: 2000,
            ease: 'Power2',
            onUpdate: function() {
                scoreValue.setText(Math.floor(counter.val) + '');
            }
        });

        // High score
        var hs = FloQuest.ScoreManager.getHighScore();
        if (FloQuest.ScoreManager.score > hs) {
            var newRecord = this.add.text(W/2, 480, 'NUOVO RECORD!', {
                fontSize: '24px',
                fontFamily: 'Georgia, serif',
                color: '#e74c3c',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: newRecord,
                alpha: 0.3,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }

        // Save final score
        FloQuest.ScoreManager.saveProgress();

        // Play again button
        var btn = this.add.graphics();
        btn.fillStyle(0xc9a84c, 1);
        btn.fillRoundedRect(W/2 - 100, 520, 200, 45, 10);
        btn.setInteractive(new Phaser.Geom.Rectangle(W/2 - 100, 520, 200, 45), Phaser.Geom.Rectangle.Contains);

        this.add.text(W/2, 542, 'Gioca ancora', {
            fontSize: '18px',
            fontFamily: 'Georgia, serif',
            color: '#1a1a2e',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        var self = this;
        btn.on('pointerdown', function() {
            FloQuest.AudioManager.play('click');
            FloQuest.ScoreManager.clearSave();
            self.cameras.main.fadeOut(500);
            self.time.delayedCall(500, function() {
                self.scene.start('TitleScene');
            });
        });

        // Celebration particles
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: W },
            y: -10,
            speed: { min: 40, max: 120 },
            angle: { min: 70, max: 110 },
            scale: { start: 0.5, end: 0 },
            lifespan: 4000,
            frequency: 50,
            tint: [0xf1c40f, 0xc9a84c, 0x2ecc71, 0xe74c3c, 0x3498db, 0x9b59b6],
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD'
        });

        // Sparkles from sides
        this.add.particles(0, H/2, 'particle', {
            speed: { min: 50, max: 150 },
            angle: { min: -45, max: 45 },
            scale: { start: 0.4, end: 0 },
            lifespan: 2000,
            frequency: 200,
            tint: [0xf1c40f, 0xffffff],
            blendMode: 'ADD'
        });

        this.add.particles(W, H/2, 'particle', {
            speed: { min: 50, max: 150 },
            angle: { min: 135, max: 225 },
            scale: { start: 0.4, end: 0 },
            lifespan: 2000,
            frequency: 200,
            tint: [0xf1c40f, 0xffffff],
            blendMode: 'ADD'
        });

        this.cameras.main.fadeIn(800);
    }
};
