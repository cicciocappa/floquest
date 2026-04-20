var FloQuest = FloQuest || {};

(function() {
    // Viewport: full screen width, fixed 1024px height (no scaling)
    var H = FloQuest.Config.VIEWPORT_H; // 1024
    var W = window.innerWidth;
    FloQuest.Config.VIEWPORT_W = W;

    var config = {
        type: Phaser.WEBGL,
        width: W,
        height: H,
        parent: 'game-container',
        backgroundColor: '#000000',
        pixelArt: true,
        scene: [
            FloQuest.BootScene,
            FloQuest.TitleScene,
            FloQuest.JourneySelectScene,
            FloQuest.OptionsScene,
            FloQuest.RecordsScene,
            FloQuest.LevelIntroScene,
            FloQuest.GameScene,
            FloQuest.SlideshowScene,
            FloQuest.BonusScene,
            FloQuest.LevelCompleteScene,
            FloQuest.GameOverScene,
            FloQuest.VictoryScene
        ],
        scale: {
            mode: Phaser.Scale.NONE,
            autoCenter: Phaser.Scale.NO_CENTER
        }
    };

    FloQuest.game = new Phaser.Game(config);
})();
