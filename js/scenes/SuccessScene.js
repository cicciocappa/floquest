var FloQuest = FloQuest || {};

FloQuest.SuccessScene = class SuccessScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SuccessScene' });
    }

    create(data) {
        var W = FloQuest.Config.WIDTH;
        var H = FloQuest.Config.HEIGHT;

        // This scene is used for special success animations if needed
        // Currently handled inline in GameScene for smoother flow

        var bg = this.add.graphics();
        bg.fillStyle(0x1a1a2e, 1);
        bg.fillRect(0, 0, W, H);

        FloQuest.AudioManager.play('correct');

        // Success text
        var text = this.add.text(W/2, H/2, 'Corretto!', {
            fontSize: '48px',
            fontFamily: 'Georgia, serif',
            color: '#2ecc71',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            yoyo: true
        });

        FloQuest.ParticleFactory.createSuccess(this, W/2, H/2);

        var self = this;
        this.time.delayedCall(1000, function() {
            self.scene.start('GameScene', data);
        });
    }
};
