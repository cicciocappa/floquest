var FloQuest = FloQuest || {};

FloQuest.Door = {
    create: function(scene, x, y, text, index, levelColors) {
        var container = scene.add.container(x, y);

        // Door background
        var doorBg = scene.add.graphics();
        var doorColor = levelColors ? levelColors.wall : 0x6b4226;
        var accentColor = levelColors ? levelColors.accent : 0xdaa520;

        // Door frame
        doorBg.fillStyle(accentColor, 1);
        doorBg.fillRoundedRect(-50, -60, 100, 120, 8);

        // Door inner
        doorBg.fillStyle(doorColor, 1);
        doorBg.fillRoundedRect(-44, -54, 88, 108, 6);

        // Arch
        doorBg.fillStyle(accentColor, 1);
        doorBg.fillRoundedRect(-50, -60, 100, 20, { tl: 8, tr: 8, bl: 0, br: 0 });

        // Door label (A, B, C, D)
        var labels = ['A', 'B', 'C', 'D'];
        var label = scene.add.text(0, -48, labels[index], {
            fontSize: '16px',
            fontFamily: 'Georgia, serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Answer text - word wrap for long answers
        var answerText = scene.add.text(0, 0, text, {
            fontSize: '14px',
            fontFamily: 'Georgia, serif',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 76 }
        }).setOrigin(0.5);

        // Handle
        var handle = scene.add.graphics();
        handle.fillStyle(0xdaa520, 1);
        handle.fillCircle(30, 20, 4);

        container.add([doorBg, label, answerText, handle]);
        container.setSize(100, 120);
        container.setInteractive();
        container.setDepth(5);

        // Hover effect
        container.on('pointerover', function() {
            scene.tweens.add({
                targets: container,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 150,
                ease: 'Power2'
            });
            doorBg.clear();
            doorBg.fillStyle(0xffffff, 0.3);
            doorBg.fillRoundedRect(-50, -60, 100, 120, 8);
            doorBg.fillStyle(accentColor, 1);
            doorBg.fillRoundedRect(-50, -60, 100, 120, 8);
            doorBg.fillStyle(doorColor, 0.8);
            doorBg.fillRoundedRect(-44, -54, 88, 108, 6);
            doorBg.fillStyle(accentColor, 1);
            doorBg.fillRoundedRect(-50, -60, 100, 20, { tl: 8, tr: 8, bl: 0, br: 0 });
        });

        container.on('pointerout', function() {
            scene.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 150,
                ease: 'Power2'
            });
            doorBg.clear();
            doorBg.fillStyle(accentColor, 1);
            doorBg.fillRoundedRect(-50, -60, 100, 120, 8);
            doorBg.fillStyle(doorColor, 1);
            doorBg.fillRoundedRect(-44, -54, 88, 108, 6);
            doorBg.fillStyle(accentColor, 1);
            doorBg.fillRoundedRect(-50, -60, 100, 20, { tl: 8, tr: 8, bl: 0, br: 0 });
        });

        return container;
    },

    animateCorrect: function(scene, door, callback) {
        // Glow green
        scene.tweens.add({
            targets: door,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: function() {
                scene.tweens.add({
                    targets: door,
                    alpha: 0,
                    duration: 400,
                    onComplete: callback
                });
            }
        });
    },

    animateWrong: function(scene, door, callback) {
        // Shake and flash red
        scene.tweens.add({
            targets: door,
            x: door.x + 5,
            duration: 50,
            yoyo: true,
            repeat: 5,
            onComplete: function() {
                scene.tweens.add({
                    targets: door,
                    alpha: 0.3,
                    duration: 200,
                    onComplete: callback
                });
            }
        });
    }
};
