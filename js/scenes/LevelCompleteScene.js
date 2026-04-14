var FloQuest = FloQuest || {};

FloQuest.LevelCompleteScene = class LevelCompleteScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelCompleteScene' });
    }

    create(data) {
        var levelNum = data.level;
        var levelData = FloQuest.Levels[levelNum - 1];
        var W = FloQuest.Config.WIDTH;
        var H = FloQuest.Config.HEIGHT;
        var c = levelData.colors;

        FloQuest.AudioManager.play('levelup');
        FloQuest.MusicPlayer.stop();

        // Background
        var bg = this.add.graphics();
        bg.fillStyle(c.bg, 1);
        bg.fillRect(0, 0, W, H);

        // Decorative frame
        bg.lineStyle(3, c.accent, 0.8);
        bg.strokeRect(40, 40, W - 80, H - 80);

        // Stars / confetti
        for (var i = 0; i < 20; i++) {
            var sx = 100 + Math.random() * 600;
            var sy = 80 + Math.random() * 440;
            var star = this.add.image(sx, sy, 'star').setScale(0.4 + Math.random() * 0.6).setAlpha(0);
            this.tweens.add({
                targets: star,
                alpha: 0.8,
                y: sy - 20,
                duration: 1000,
                delay: Math.random() * 1000,
                yoyo: true,
                repeat: -1
            });
        }

        // Title
        this.add.text(W/2, 100, 'LIVELLO COMPLETATO!', {
            fontSize: '36px',
            fontFamily: 'Georgia, serif',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Level name
        this.add.text(W/2, 150, levelData.name, {
            fontSize: '22px',
            fontFamily: 'Georgia, serif',
            color: '#' + c.accent.toString(16).padStart(6, '0')
        }).setOrigin(0.5);

        // Score breakdown
        var scoreY = 210;
        var isPerfect = FloQuest.ScoreManager.perfectLevel;

        this.add.text(W/2, scoreY, 'Punteggio livello: +' + FloQuest.Config.SCORE.LEVEL_COMPLETE, {
            fontSize: '18px',
            fontFamily: 'Georgia, serif',
            color: '#2ecc71'
        }).setOrigin(0.5);

        if (isPerfect) {
            this.add.text(W/2, scoreY + 35, 'PERFETTO! +' + FloQuest.Config.SCORE.PERFECT_LEVEL, {
                fontSize: '22px',
                fontFamily: 'Georgia, serif',
                color: '#f1c40f',
                fontStyle: 'bold'
            }).setOrigin(0.5);
        }

        // Total score
        this.add.text(W/2, scoreY + 85, 'Punteggio totale: ' + FloQuest.ScoreManager.score, {
            fontSize: '24px',
            fontFamily: 'Georgia, serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Player with trophy
        var player = this.add.image(W/2 - 30, 400, 'player').setScale(2);
        this.add.image(W/2 + 30, 390, 'trophy').setScale(1.2);
        this.tweens.add({
            targets: player,
            y: 395,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Next level or victory
        var isLastLevel = (levelNum >= 10);
        var btnText = isLastLevel ? 'VITTORIA FINALE!' : 'Livello ' + (levelNum + 1) + ' →';
        var btnColor = isLastLevel ? 0xf1c40f : c.accent;

        var btn = this.add.graphics();
        btn.fillStyle(btnColor, 1);
        btn.fillRoundedRect(W/2 - 120, 470, 240, 50, 10);
        btn.setInteractive(new Phaser.Geom.Rectangle(W/2 - 120, 470, 240, 50), Phaser.Geom.Rectangle.Contains);

        this.add.text(W/2, 495, btnText, {
            fontSize: '20px',
            fontFamily: 'Georgia, serif',
            color: '#1a1a2e',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btn.on('pointerover', function() {
            btn.clear();
            btn.fillStyle(btnColor, 0.8);
            btn.fillRoundedRect(W/2 - 120, 470, 240, 50, 10);
        });
        btn.on('pointerout', function() {
            btn.clear();
            btn.fillStyle(btnColor, 1);
            btn.fillRoundedRect(W/2 - 120, 470, 240, 50, 10);
        });

        var self = this;
        btn.on('pointerdown', function() {
            FloQuest.AudioManager.play('click');
            self.cameras.main.fadeOut(500);
            self.time.delayedCall(500, function() {
                if (isLastLevel) {
                    self.scene.start('VictoryScene');
                } else {
                    FloQuest.ScoreManager.currentLevel = levelNum + 1;
                    FloQuest.ScoreManager.saveProgress();
                    self.scene.start('LevelIntroScene', { level: levelNum + 1 });
                }
            });
        });

        // Particles celebration
        this.add.particles(W/2, 0, 'particle', {
            speed: { min: 50, max: 150 },
            angle: { min: 60, max: 120 },
            scale: { start: 0.5, end: 0 },
            lifespan: 2000,
            frequency: 100,
            tint: [0xf1c40f, 0x2ecc71, 0xe74c3c, 0x3498db],
            blendMode: 'ADD'
        });

        this.cameras.main.fadeIn(500);
    }
};
