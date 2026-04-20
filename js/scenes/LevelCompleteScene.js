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

        // Background (journey base color)
        var bg = this.add.graphics();
        bg.fillStyle(c.bg, 1);
        bg.fillRect(0, 0, W, H);

        // Journey-specific victory artwork (640x480). Placeholder if missing.
        var jid = FloQuest.ScoreManager.currentJourney || 1;
        var key = 'journey_' + jid + '_victory';
        var imgX = W / 2, imgY = 280;
        if (this.textures.exists(key)) {
            this.add.image(imgX, imgY, key);
        } else {
            var ph = this.add.graphics();
            ph.fillStyle(0x000000, 0.4);
            ph.fillRect(imgX - 320, imgY - 240, 640, 480);
            ph.lineStyle(2, c.accent, 0.6);
            ph.strokeRect(imgX - 320, imgY - 240, 640, 480);
            this.add.text(imgX, imgY, '[ victory image — journey ' + jid + ' ]', {
                fontSize: '20px', fontFamily: 'Georgia, serif', color: '#ffffff'
            }).setOrigin(0.5);
        }

        // Title
        this.add.text(W/2, 570, 'LIVELLO COMPLETATO!', {
            fontSize: '36px',
            fontFamily: 'Georgia, serif',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Level name
        this.add.text(W/2, 610, levelData.name, {
            fontSize: '22px',
            fontFamily: 'Georgia, serif',
            color: '#' + c.accent.toString(16).padStart(6, '0')
        }).setOrigin(0.5);

        // Score breakdown — (LEVEL_BASE − errors×ERROR_PENALTY) × difficulty factor
        var scoreY = 660;
        var cfg = FloQuest.Config.SCORE;
        var errors = FloQuest.ScoreManager.errorsThisLevel;
        var factor = FloQuest.ScoreManager.getDifficultyFactor();
        var base = Math.max(0, cfg.LEVEL_BASE - errors * cfg.ERROR_PENALTY);
        var gained = FloQuest.ScoreManager.lastLevelScore || Math.round(base * factor);
        var diffLabel = { 1.0: 'Facile', 1.5: 'Normale', 2.0: 'Difficile' }[factor] || ('×' + factor);
        var isPerfect = (errors === 0);

        this.add.text(W/2, scoreY,
            'Base: ' + cfg.LEVEL_BASE + '  −  Errori: ' + errors + '×' + cfg.ERROR_PENALTY + ' = ' + base, {
            fontSize: '18px',
            fontFamily: 'Georgia, serif',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(W/2, scoreY + 30,
            'Difficoltà: ' + diffLabel + ' (×' + factor + ')   →   +' + gained, {
            fontSize: '20px',
            fontFamily: 'Georgia, serif',
            color: '#2ecc71',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        if (isPerfect) {
            this.add.text(W/2, scoreY + 60, 'PERFETTO!', {
                fontSize: '22px',
                fontFamily: 'Georgia, serif',
                color: '#f1c40f',
                fontStyle: 'bold'
            }).setOrigin(0.5);
        }

        this.add.text(W/2, scoreY + 95, 'Punteggio totale: ' + FloQuest.ScoreManager.score, {
            fontSize: '24px',
            fontFamily: 'Georgia, serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Next level / final victory button
        var isLastLevel = (levelNum >= 10);
        var btnText = isLastLevel ? 'VITTORIA FINALE!' : 'Livello ' + (levelNum + 1) + ' →';
        var btnColor = isLastLevel ? 0xf1c40f : c.accent;
        var btnX = W/2 - 120, btnY = 870, btnW = 240, btnH = 50;

        var btn = this.add.graphics();
        btn.fillStyle(btnColor, 1);
        btn.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
        btn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);

        this.add.text(W/2, btnY + btnH/2, btnText, {
            fontSize: '20px',
            fontFamily: 'Georgia, serif',
            color: '#1a1a2e',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btn.on('pointerover', function() {
            btn.clear();
            btn.fillStyle(btnColor, 0.8);
            btn.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
        });
        btn.on('pointerout', function() {
            btn.clear();
            btn.fillStyle(btnColor, 1);
            btn.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
        });

        var self = this;
        btn.on('pointerdown', function() {
            FloQuest.AudioManager.play('click');
            self.cameras.main.fadeOut(500);
            self.time.delayedCall(500, function() {
                if (isLastLevel) {
                    self.scene.start('VictoryScene');
                    return;
                }
                FloQuest.ScoreManager.currentLevel = levelNum + 1;
                FloQuest.ScoreManager.saveProgress();
                var mode = FloQuest.ScoreManager.getAnimationsMode();
                var nextTarget = (mode === 'none') ? 'SlideshowScene' : 'LevelIntroScene';

                var triggersBonus = (FloQuest.Config.BONUS_AFTER_LEVELS.indexOf(levelNum) !== -1);
                if (triggersBonus) {
                    self.scene.start('BonusScene', {
                        afterLevel: levelNum,
                        nextLevel: levelNum + 1,
                        nextScene: nextTarget
                    });
                } else {
                    self.scene.start(nextTarget, { level: levelNum + 1 });
                }
            });
        });

        this.cameras.main.fadeIn(500);
    }
};
