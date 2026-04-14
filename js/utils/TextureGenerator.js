var FloQuest = FloQuest || {};

FloQuest.TextureGenerator = {
    generate: function(scene) {
        this.generatePlayer(scene);
        this.generateDoor(scene);
        this.generateParticle(scene);
        this.generateHeart(scene);
        this.generateSkull(scene);
        this.generateStar(scene);
        this.generateKey(scene);
        this.generateTorch(scene);
        this.generateCrystal(scene);
        this.generateTree(scene);
        this.generateBook(scene);
        this.generateSnowflake(scene);
        this.generateCoin(scene);
        this.generateTrophy(scene);
    },

    generatePlayer: function(scene) {
        var g = scene.make.graphics({ add: false });
        // Hat
        g.fillStyle(0x8B4513);
        g.fillRect(8, 0, 24, 6);
        g.fillRect(4, 6, 32, 4);
        // Head
        g.fillStyle(0xf0c8a0);
        g.fillRect(12, 10, 16, 14);
        // Eyes
        g.fillStyle(0x000000);
        g.fillRect(16, 16, 3, 3);
        g.fillRect(22, 16, 3, 3);
        // Body (jacket)
        g.fillStyle(0x8B6914);
        g.fillRect(10, 24, 20, 18);
        // Belt
        g.fillStyle(0x4a3000);
        g.fillRect(10, 36, 20, 3);
        // Legs
        g.fillStyle(0x5a4a3a);
        g.fillRect(12, 42, 7, 14);
        g.fillRect(22, 42, 7, 14);
        // Boots
        g.fillStyle(0x3a2a1a);
        g.fillRect(11, 52, 9, 5);
        g.fillRect(21, 52, 9, 5);
        // Whip (right hand)
        g.lineStyle(2, 0x5a3a1a);
        g.lineBetween(30, 30, 36, 26);
        g.lineBetween(36, 26, 38, 32);
        g.generateTexture('player', 40, 58);
        g.destroy();
    },

    generateDoor: function(scene) {
        var g = scene.make.graphics({ add: false });
        // Door frame
        g.fillStyle(0x6b4226);
        g.fillRect(0, 0, 80, 100);
        // Door inner
        g.fillStyle(0x4a2a0a);
        g.fillRect(6, 6, 68, 88);
        // Door handle
        g.fillStyle(0xdaa520);
        g.fillCircle(60, 50, 5);
        // Arch top
        g.fillStyle(0x6b4226);
        g.fillRect(0, 0, 80, 10);
        // Decorative lines
        g.lineStyle(2, 0x8b6914);
        g.lineBetween(10, 10, 10, 94);
        g.lineBetween(70, 10, 70, 94);
        g.generateTexture('door', 80, 100);
        g.destroy();
    },

    generateParticle: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.fillStyle(0xffffff);
        g.fillCircle(4, 4, 4);
        g.generateTexture('particle', 8, 8);
        g.destroy();
    },

    generateHeart: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.fillStyle(0xe74c3c);
        g.fillCircle(8, 8, 6);
        g.fillCircle(18, 8, 6);
        g.fillTriangle(2, 10, 24, 10, 13, 24);
        g.generateTexture('heart', 26, 26);
        g.destroy();
    },

    generateSkull: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.fillStyle(0xffffff);
        g.fillCircle(12, 10, 10);
        g.fillRect(6, 16, 12, 6);
        g.fillStyle(0x000000);
        g.fillCircle(8, 9, 3);
        g.fillCircle(16, 9, 3);
        g.fillRect(10, 18, 2, 4);
        g.fillRect(14, 18, 2, 4);
        g.generateTexture('skull', 24, 24);
        g.destroy();
    },

    generateStar: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.fillStyle(0xf1c40f);
        var cx = 12, cy = 12, spikes = 5, outerR = 12, innerR = 5;
        g.beginPath();
        for (var i = 0; i < spikes * 2; i++) {
            var r = (i % 2 === 0) ? outerR : innerR;
            var angle = (Math.PI / 2 * 3) + (i * Math.PI / spikes);
            var x = cx + Math.cos(angle) * r;
            var y = cy + Math.sin(angle) * r;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
        }
        g.closePath();
        g.fillPath();
        g.generateTexture('star', 24, 24);
        g.destroy();
    },

    generateKey: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.fillStyle(0xdaa520);
        g.fillCircle(8, 8, 6);
        g.fillStyle(0x1a1a2e);
        g.fillCircle(8, 8, 3);
        g.fillStyle(0xdaa520);
        g.fillRect(12, 6, 16, 4);
        g.fillRect(24, 4, 4, 4);
        g.fillRect(20, 4, 4, 4);
        g.generateTexture('key', 30, 16);
        g.destroy();
    },

    generateTorch: function(scene) {
        var g = scene.make.graphics({ add: false });
        // Handle
        g.fillStyle(0x6b4226);
        g.fillRect(6, 14, 6, 16);
        // Flame
        g.fillStyle(0xff6600);
        g.fillTriangle(9, 0, 2, 16, 16, 16);
        g.fillStyle(0xffcc00);
        g.fillTriangle(9, 4, 5, 14, 13, 14);
        g.generateTexture('torch', 18, 30);
        g.destroy();
    },

    generateCrystal: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.fillStyle(0x9b59b6);
        g.fillTriangle(10, 0, 0, 24, 20, 24);
        g.fillStyle(0xc39bd3);
        g.fillTriangle(10, 4, 4, 22, 12, 22);
        g.generateTexture('crystal', 20, 24);
        g.destroy();
    },

    generateTree: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.fillStyle(0x6b4226);
        g.fillRect(10, 18, 6, 14);
        g.fillStyle(0x27ae60);
        g.fillTriangle(13, 0, 0, 20, 26, 20);
        g.fillTriangle(13, 6, 2, 22, 24, 22);
        g.generateTexture('tree', 26, 32);
        g.destroy();
    },

    generateBook: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.fillStyle(0x8b0000);
        g.fillRect(0, 2, 20, 16);
        g.fillStyle(0xfff8dc);
        g.fillRect(3, 4, 14, 12);
        g.lineStyle(1, 0x333333);
        g.lineBetween(5, 7, 15, 7);
        g.lineBetween(5, 10, 15, 10);
        g.lineBetween(5, 13, 12, 13);
        g.generateTexture('book', 20, 20);
        g.destroy();
    },

    generateSnowflake: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.lineStyle(2, 0xaaddff);
        var cx = 8, cy = 8;
        for (var i = 0; i < 6; i++) {
            var a = i * Math.PI / 3;
            g.lineBetween(cx, cy, cx + Math.cos(a)*7, cy + Math.sin(a)*7);
        }
        g.generateTexture('snowflake', 16, 16);
        g.destroy();
    },

    generateCoin: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.fillStyle(0xf1c40f);
        g.fillCircle(10, 10, 10);
        g.fillStyle(0xc9a84c);
        g.fillCircle(10, 10, 7);
        g.fillStyle(0xf1c40f);
        g.fillCircle(10, 10, 5);
        g.generateTexture('coin', 20, 20);
        g.destroy();
    },

    generateTrophy: function(scene) {
        var g = scene.make.graphics({ add: false });
        g.fillStyle(0xf1c40f);
        // Cup
        g.fillRect(8, 0, 20, 4);
        g.fillRect(10, 4, 16, 16);
        g.fillRect(6, 4, 4, 10);
        g.fillRect(26, 4, 4, 10);
        // Stem
        g.fillRect(16, 20, 4, 6);
        // Base
        g.fillRect(10, 26, 16, 4);
        g.generateTexture('trophy', 36, 30);
        g.destroy();
    }
};
