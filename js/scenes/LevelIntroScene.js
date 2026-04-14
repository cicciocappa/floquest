var FloQuest = FloQuest || {};

FloQuest.LevelIntroScene = class LevelIntroScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelIntroScene' });
    }

    init(data) {
        this._levelNum = data.level || 1;
        this._levelData = FloQuest.Levels[this._levelNum - 1];
        this._previewKey = 'preview_' + FloQuest.ScoreManager.currentJourney + '_' + this._levelNum;
    }

    preload() {
        var journeyId = FloQuest.ScoreManager.currentJourney || 1;
        var levelId = this._levelNum;
        var path = 'levels/' + journeyId + '/' + levelId + '.png';
        this.load.image(this._previewKey, path);
    }

    create() {
        var levelNum = this._levelNum;
        var levelData = this._levelData;
        var W = FloQuest.Config.WIDTH;
        var H = FloQuest.Config.HEIGHT; // 960

        // Stop title/previous music during intro
        FloQuest.MusicPlayer.stop();

        var c = levelData.colors;
        var primary = c.primary || c.accent;
        var secondary = c.secondary || 0x888888;
        var bgColor = c.bg;

        var primaryCSS = '#' + primary.toString(16).padStart(6, '0');
        var secondaryCSS = '#' + secondary.toString(16).padStart(6, '0');

        // Background
        var bg = this.add.graphics();
        bg.fillStyle(bgColor, 1);
        bg.fillRect(0, 0, W, H);

        // Decorative border (primary color)
        bg.lineStyle(3, primary, 0.6);
        bg.strokeRect(30, 30, W - 60, H - 60);
        bg.lineStyle(1, primary, 0.3);
        bg.strokeRect(40, 40, W - 80, H - 80);

        // Corner ornaments
        var corners = [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]];
        for (var i = 0; i < corners.length; i++) {
            bg.fillStyle(primary, 0.6);
            bg.fillCircle(corners[i][0], corners[i][1], 6);
        }

        // ── Top area: Level number + Title ──

        // Level number (secondary color)
        this.add.text(W / 2, 70, 'LIVELLO ' + levelNum, {
            fontSize: '22px',
            fontFamily: 'Georgia, serif',
            color: secondaryCSS,
            letterSpacing: 8
        }).setOrigin(0.5);

        // Level name (primary color)
        var nameText = this.add.text(W / 2, 120, levelData.name.toUpperCase(), {
            fontSize: '36px',
            fontFamily: 'Georgia, serif',
            color: primaryCSS,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Animate name entrance
        nameText.setAlpha(0);
        this.tweens.add({
            targets: nameText,
            alpha: 1,
            y: 115,
            duration: 800,
            ease: 'Power2'
        });

        // Fire particles on the title text
        var titleBounds = nameText.getBounds();
        this.add.particles(0, 0, 'particle', {
            x: { min: titleBounds.left - 10, max: titleBounds.right + 10 },
            y: { min: titleBounds.top + 5, max: titleBounds.bottom - 5 },
            speed: { min: 10, max: 40 },
            angle: { min: -100, max: -80 },
            scale: { start: 0.35, end: 0 },
            lifespan: { min: 600, max: 1200 },
            frequency: 80,
            tint: [primary, primary, 0xffffff],
            alpha: { start: 0.7, end: 0 },
            blendMode: 'ADD'
        });

        // ── Center: Preview image ──

        var previewY = 440; // center of the preview area
        var previewW = 640;
        var previewH = 480;

        // Decorative frame around preview (primary color)
        var framePad = 6;
        bg.lineStyle(2, primary, 0.8);
        bg.strokeRect(
            W / 2 - previewW / 2 - framePad,
            previewY - previewH / 2 - framePad,
            previewW + framePad * 2,
            previewH + framePad * 2
        );

        // Preview image
        if (this.textures.exists(this._previewKey)) {
            var preview = this.add.image(W / 2, previewY, this._previewKey);
            // Scale to fit 800x600 area
            var tex = preview.texture.getSourceImage();
            var scaleX = previewW / tex.width;
            var scaleY = previewH / tex.height;
            var scale = Math.min(scaleX, scaleY);
            preview.setScale(scale);
        } else {
            // Fallback: dark placeholder rectangle
            bg.fillStyle(0x000000, 0.4);
            bg.fillRect(W / 2 - previewW / 2, previewY - previewH / 2, previewW, previewH);
        }

        // ── Top-right: Score + Lives (secondary color) ──

        var infoX = W - 70;
        var infoY = 70;

        this.add.text(infoX, infoY, 'Punteggio: ' + FloQuest.ScoreManager.score, {
            fontSize: '16px',
            fontFamily: 'Georgia, serif',
            color: secondaryCSS
        }).setOrigin(1, 0.5);

        // Lives
        var livesLabel = this.add.text(infoX - 90 - 10, infoY + 30, 'Vite:', {
            fontSize: '16px',
            fontFamily: 'Georgia, serif',
            color: secondaryCSS
        }).setOrigin(1, 0.5);

        for (var h = 0; h < 3; h++) {
            this.add.image(infoX - 75 + h * 28, infoY + 30, 'heart').setScale(0.7);
        }

        // ── Bottom: "Click to start" blinking primary ↔ secondary ──

        var prompt = this.add.text(W / 2, H - 80, 'Clicca per iniziare', {
            fontSize: '22px',
            fontFamily: 'Georgia, serif',
            color: primaryCSS
        }).setOrigin(0.5);

        // Blink between primary and secondary via tint
        var self = this;
        var blinkState = false;
        this.time.addEvent({
            delay: 600,
            loop: true,
            callback: function() {
                blinkState = !blinkState;
                prompt.setColor(blinkState ? secondaryCSS : primaryCSS);
            }
        });

        // Also fade alpha for extra pulse
        this.tweens.add({
            targets: prompt,
            alpha: { from: 1, to: 0.6 },
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        // ── Click to start ──

        this.input.once('pointerdown', function() {
            FloQuest.AudioManager.play('click');
            FloQuest.ScoreManager.resetForLevel();
            self.cameras.main.fadeOut(500);
            self.time.delayedCall(500, function() {
                self.scene.start('GameScene', { level: levelNum });
            });
        });

        this.cameras.main.fadeIn(500);
    }
};
