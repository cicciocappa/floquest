var FloQuest = FloQuest || {};

FloQuest.BootScene = class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        var W = FloQuest.Config.VIEWPORT_W;
        var H = FloQuest.Config.VIEWPORT_H;

        // Background color
        this.cameras.main.setBackgroundColor('#8bbfe6');

        // Loading bar and text positioned in lower half
        var barY = H / 2 + 100;
        var bar = this.add.graphics();
        this.load.on('progress', function(value) {
            bar.clear();
            bar.fillStyle(0xc9a84c, 1);
            bar.fillRect(W / 2 - 200, barY, 400 * value, 16);
            bar.lineStyle(2, 0xc9a84c, 0.5);
            bar.strokeRect(W / 2 - 200, barY, 400, 16);
        });

        this.add.text(W / 2, barY + 30, 'Caricamento...', {
            fontSize: '18px', fontFamily: 'VCR, monospace', color: '#1a3a5c'
        }).setOrigin(0.5);

        // Load intro image first, show it as soon as it's ready
        this.load.image('intro', 'img/intro.png');
        var self = this;
        this.load.on('filecomplete-image-intro', function() {
            self.add.image(W / 2, H / 2 - 40, 'intro').setOrigin(0.5);
        });

        // UI images for title screen
        this.load.image('title', 'img/title.png');
        this.load.image('character', 'img/character.png');
        this.load.image('button', 'img/button.png');

        // Game data (JSON)
        this.load.json('journeys', 'data/journeys.json');
        this.load.json('questions', 'data/questions.json');

        // Load player spritesheets + normal maps
        FloQuest.Player.preload(this);
    }

    create() {
        // Parse JSON data and make available globally
        FloQuest.Journeys = this.cache.json.get('journeys');
        FloQuest.AllQuestions = this.cache.json.get('questions');

        // Parse hex color strings to numbers in level data
        FloQuest.Journeys.forEach(function(journey) {
            journey.levels.forEach(function(level) {
                if (level.colors) {
                    for (var key in level.colors) {
                        if (typeof level.colors[key] === 'string') {
                            level.colors[key] = parseInt(level.colors[key], 16);
                        }
                    }
                }
            });
        });

        // Default: set first journey as active (for backward compatibility)
        FloQuest.Levels = FloQuest.Journeys[0].levels;
        FloQuest.Questions = FloQuest.AllQuestions['1'];

        // Generate procedural textures (used by menu/UI scenes)
        FloQuest.TextureGenerator.generate(this);

        // Register the lit-sprite pipeline
        FloQuest.LightPipeline.register(this);

        // Attach normal maps to spritesheet textures
        FloQuest.Player.setupNormalMaps(this);

        // Create all player animations (global, shared across scenes)
        FloQuest.Player.createAnimations(this);

        var W = FloQuest.Config.VIEWPORT_W;
        var H = FloQuest.Config.VIEWPORT_H;

        // Show "click to start" prompt — initializes audio on user gesture
        var prompt = this.add.text(W / 2, H / 2 + 180, 'Clicca per iniziare', {
            fontSize: '22px',
            fontFamily: 'VCR, monospace',
            color: '#1a3a5c'
        }).setOrigin(0.5).setAlpha(0);

        // Blink animation
        this.tweens.add({
            targets: prompt,
            alpha: { from: 0, to: 1 },
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        this.cameras.main.fadeIn(500);

        // Wait for user click to init audio and proceed
        var self = this;
        this.input.once('pointerdown', function() {
            // Initialize audio after user gesture
            FloQuest.AudioManager.init();
            FloQuest.AudioManager.resume();
            FloQuest.FMSynth.init(FloQuest.AudioManager.ctx);
            FloQuest.MusicPlayer.init(FloQuest.AudioManager.ctx);

            prompt.destroy();
            self.cameras.main.fadeOut(500);
            self.time.delayedCall(500, function() {
                self.scene.start('TitleScene');
            });
        });
    }
};
