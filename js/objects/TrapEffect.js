var FloQuest = FloQuest || {};

FloQuest.TrapEffect = {
    play: function(scene, trapType, playerX, playerY, callback) {
        switch(trapType) {
            case 'darts': this._darts(scene, playerX, playerY, callback); break;
            case 'stalactites': this._stalactites(scene, playerX, playerY, callback); break;
            case 'quicksand': this._quicksand(scene, playerX, playerY, callback); break;
            case 'lava': this._lava(scene, playerX, playerY, callback); break;
            case 'shelves': this._shelves(scene, playerX, playerY, callback); break;
            case 'freeze': this._freeze(scene, playerX, playerY, callback); break;
            case 'mummy': this._mummy(scene, playerX, playerY, callback); break;
            case 'kraken': this._kraken(scene, playerX, playerY, callback); break;
            case 'explosion': this._explosion(scene, playerX, playerY, callback); break;
            case 'collapse': this._collapse(scene, playerX, playerY, callback); break;
            default: this._generic(scene, playerX, playerY, callback); break;
        }
    },

    _darts: function(scene, px, py, cb) {
        // Darts flying from walls
        var darts = [];
        for (var i = 0; i < 5; i++) {
            var dart = scene.add.graphics();
            dart.fillStyle(0x888888);
            dart.fillRect(0, 0, 20, 3);
            dart.fillStyle(0xaa0000);
            dart.fillTriangle(20, -2, 20, 5, 26, 1.5);
            dart.setPosition(-30, py - 40 + i * 20);
            dart.setDepth(15);
            darts.push(dart);

            scene.tweens.add({
                targets: dart,
                x: px,
                duration: 300 + i * 100,
                ease: 'Power2'
            });
        }

        scene.time.delayedCall(800, function() {
            FloQuest.ParticleFactory.createExplosion(scene, px, py, 0xff0000);
            darts.forEach(function(d) { d.destroy(); });
            if (cb) cb();
        });
    },

    _stalactites: function(scene, px, py, cb) {
        for (var i = 0; i < 4; i++) {
            var stal = scene.add.graphics();
            stal.fillStyle(0x6a5a8e);
            stal.fillTriangle(-8, 0, 8, 0, 0, 40 + Math.random() * 20);
            stal.setPosition(px - 50 + i * 35, -20);
            stal.setDepth(15);

            scene.tweens.add({
                targets: stal,
                y: py - 30,
                duration: 500 + i * 150,
                ease: 'Bounce.easeOut',
                onComplete: function(tw, targets) {
                    targets[0].destroy();
                }
            });
        }

        scene.time.delayedCall(1000, function() {
            FloQuest.ParticleFactory.createExplosion(scene, px, py, 0x9b59b6);
            if (cb) cb();
        });
    },

    _quicksand: function(scene, px, py, cb) {
        // Sand swirl
        var sand = scene.add.graphics();
        sand.fillStyle(0xc9a84c, 0.7);
        sand.fillCircle(0, 0, 50);
        sand.setPosition(px, py + 20);
        sand.setDepth(15);
        sand.setScale(0);

        scene.tweens.add({
            targets: sand,
            scaleX: 1.5,
            scaleY: 0.5,
            duration: 600,
            ease: 'Power2'
        });

        // Player sinks
        scene.time.delayedCall(800, function() {
            sand.destroy();
            FloQuest.ParticleFactory.createExplosion(scene, px, py, 0xc9a84c);
            if (cb) cb();
        });
    },

    _lava: function(scene, px, py, cb) {
        // Lava eruption from below
        for (var i = 0; i < 8; i++) {
            var blob = scene.add.graphics();
            blob.fillStyle([0xff3300, 0xff6600, 0xff9900][i % 3]);
            blob.fillCircle(0, 0, 6 + Math.random() * 8);
            blob.setPosition(px - 40 + i * 12, 600);
            blob.setDepth(15);

            scene.tweens.add({
                targets: blob,
                y: py - 30 + Math.random() * 40,
                x: px - 60 + Math.random() * 120,
                duration: 600 + Math.random() * 400,
                ease: 'Power2.easeOut',
                onComplete: function(tw, targets) { targets[0].destroy(); }
            });
        }

        scene.time.delayedCall(900, function() {
            FloQuest.ParticleFactory.createExplosion(scene, px, py, 0xff4400);
            if (cb) cb();
        });
    },

    _shelves: function(scene, px, py, cb) {
        // Books falling
        var bookColors = [0x8b0000, 0x00008b, 0x006400, 0x8b4513];
        for (var i = 0; i < 6; i++) {
            var book = scene.add.graphics();
            book.fillStyle(bookColors[i % bookColors.length]);
            book.fillRect(0, 0, 12, 18);
            book.setPosition(px - 40 + i * 16, -20);
            book.setDepth(15);

            scene.tweens.add({
                targets: book,
                y: py,
                angle: Math.random() * 360,
                duration: 500 + i * 100,
                ease: 'Bounce.easeOut',
                onComplete: function(tw, targets) { targets[0].destroy(); }
            });
        }

        scene.time.delayedCall(1000, function() {
            FloQuest.ParticleFactory.createExplosion(scene, px, py, 0x8b4513);
            if (cb) cb();
        });
    },

    _freeze: function(scene, px, py, cb) {
        // Ice expanding
        var ice = scene.add.graphics();
        ice.fillStyle(0x74c0fc, 0.8);
        ice.fillCircle(0, 0, 60);
        ice.setPosition(px, py);
        ice.setDepth(15);
        ice.setScale(0);
        ice.setAlpha(0.8);

        scene.tweens.add({
            targets: ice,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: function() {
                ice.destroy();
                FloQuest.ParticleFactory.createExplosion(scene, px, py, 0x74c0fc);
                if (cb) cb();
            }
        });
    },

    _mummy: function(scene, px, py, cb) {
        // Wrapping bandages
        var bandages = [];
        for (var i = 0; i < 5; i++) {
            var b = scene.add.graphics();
            b.lineStyle(4, 0xd4c9a0, 0.8);
            b.lineBetween(0, 0, 30, 0);
            var angle = i * 72;
            var rad = angle * Math.PI / 180;
            b.setPosition(px + Math.cos(rad) * 80, py + Math.sin(rad) * 80);
            b.setDepth(15);
            bandages.push(b);

            scene.tweens.add({
                targets: b,
                x: px,
                y: py,
                angle: 360,
                duration: 600,
                delay: i * 100,
                ease: 'Power2',
                onComplete: function(tw, targets) { targets[0].destroy(); }
            });
        }

        scene.time.delayedCall(1000, function() {
            FloQuest.ParticleFactory.createExplosion(scene, px, py, 0xd4c9a0);
            if (cb) cb();
        });
    },

    _kraken: function(scene, px, py, cb) {
        // Tentacles rising
        for (var i = 0; i < 3; i++) {
            var tent = scene.add.graphics();
            tent.fillStyle(0x1abc9c, 0.8);
            tent.fillRect(-5, 0, 10, 80);
            tent.fillCircle(0, 0, 8);
            tent.setPosition(px - 30 + i * 30, 620);
            tent.setDepth(15);

            scene.tweens.add({
                targets: tent,
                y: py - 60,
                duration: 600 + i * 200,
                ease: 'Back.easeOut',
                onComplete: function(tw, targets) {
                    scene.tweens.add({
                        targets: targets[0],
                        y: 620,
                        duration: 400,
                        onComplete: function(tw2, t2) { t2[0].destroy(); }
                    });
                }
            });
        }

        scene.time.delayedCall(1000, function() {
            FloQuest.ParticleFactory.createExplosion(scene, px, py, 0x1abc9c);
            if (cb) cb();
        });
    },

    _explosion: function(scene, px, py, cb) {
        // Expanding circles
        var colors = [0xe67e22, 0xff4400, 0xffcc00];
        for (var i = 0; i < 3; i++) {
            var circle = scene.add.graphics();
            circle.fillStyle(colors[i], 0.7);
            circle.fillCircle(0, 0, 20);
            circle.setPosition(px, py);
            circle.setDepth(15);
            circle.setScale(0.1);

            scene.tweens.add({
                targets: circle,
                scaleX: 3 + i,
                scaleY: 3 + i,
                alpha: 0,
                duration: 400 + i * 200,
                delay: i * 100,
                ease: 'Power2',
                onComplete: function(tw, targets) { targets[0].destroy(); }
            });
        }

        scene.time.delayedCall(900, function() {
            FloQuest.ParticleFactory.createExplosion(scene, px, py, 0xff6600);
            if (cb) cb();
        });
    },

    _collapse: function(scene, px, py, cb) {
        // Floor tiles falling
        for (var i = 0; i < 8; i++) {
            var tile = scene.add.graphics();
            tile.fillStyle(0xc9a84c, 0.8);
            tile.fillRect(0, 0, 25, 25);
            tile.lineStyle(1, 0xf1c40f, 0.5);
            tile.strokeRect(0, 0, 25, 25);
            tile.setPosition(px - 50 + (i % 4) * 28, py + Math.floor(i/4) * 28);
            tile.setDepth(15);

            scene.tweens.add({
                targets: tile,
                y: 650,
                angle: Math.random() * 360,
                duration: 600 + Math.random() * 500,
                delay: i * 80,
                ease: 'Power2.easeIn',
                onComplete: function(tw, targets) { targets[0].destroy(); }
            });
        }

        scene.time.delayedCall(1200, function() {
            FloQuest.ParticleFactory.createExplosion(scene, px, py, 0xc9a84c);
            if (cb) cb();
        });
    },

    _generic: function(scene, px, py, cb) {
        FloQuest.ParticleFactory.createExplosion(scene, px, py, 0xff0000);
        scene.time.delayedCall(800, function() { if (cb) cb(); });
    }
};
