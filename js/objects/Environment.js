var FloQuest = FloQuest || {};

FloQuest.Environment = {
    draw: function(scene, levelData) {
        var g = scene.add.graphics();
        g.setDepth(0);
        var c = levelData.colors;

        // Background fill
        g.fillStyle(c.bg, 1);
        g.fillRect(0, 0, 800, 600);

        switch(levelData.environment) {
            case 'temple': this._temple(g, c); break;
            case 'cave': this._cave(g, c); break;
            case 'jungle': this._jungle(g, c); break;
            case 'volcano': this._volcano(g, c); break;
            case 'library': this._library(g, c); break;
            case 'ice': this._ice(g, c); break;
            case 'catacombs': this._catacombs(g, c); break;
            case 'ship': this._ship(g, c); break;
            case 'tower': this._tower(g, c); break;
            case 'treasure': this._treasure(g, c); break;
        }

        // Floor
        g.fillStyle(c.floor, 1);
        g.fillRect(0, 520, 800, 80);
        g.lineStyle(2, c.accent, 0.5);
        g.lineBetween(0, 520, 800, 520);

        return g;
    },

    _temple: function(g, c) {
        // Stone walls
        g.fillStyle(c.wall, 0.6);
        g.fillRect(0, 0, 60, 520);
        g.fillRect(740, 0, 60, 520);

        // Brick pattern
        g.lineStyle(1, c.bg, 0.3);
        for (var y = 0; y < 520; y += 30) {
            g.lineBetween(0, y, 60, y);
            g.lineBetween(740, y, 800, y);
            var offset = (Math.floor(y/30) % 2) * 15;
            g.lineBetween(offset + 15, y, offset + 15, y + 30);
            g.lineBetween(740 + offset + 15, y, 740 + offset + 15, y + 30);
        }

        // Columns
        g.fillStyle(c.wall, 0.8);
        g.fillRect(70, 100, 30, 420);
        g.fillRect(700, 100, 30, 420);
        g.fillStyle(c.accent, 0.5);
        g.fillRect(70, 100, 30, 15);
        g.fillRect(700, 100, 30, 15);

        // Torch positions
        g.fillStyle(0xff6600, 0.6);
        g.fillCircle(85, 200, 12);
        g.fillCircle(715, 200, 12);
        g.fillStyle(0xffcc00, 0.4);
        g.fillCircle(85, 198, 8);
        g.fillCircle(715, 198, 8);

        // Floor tiles
        g.lineStyle(1, c.accent, 0.2);
        for (var x = 60; x < 740; x += 60) {
            g.lineBetween(x, 520, x, 600);
        }
    },

    _cave: function(g, c) {
        // Rough cave walls
        g.fillStyle(c.wall, 0.7);
        var points = [0,0, 80,50, 50,150, 70,300, 40,400, 60,520, 0,520];
        this._drawPoly(g, points);
        var points2 = [800,0, 720,30, 750,180, 730,350, 760,450, 740,520, 800,520];
        this._drawPoly(g, points2);

        // Stalactites
        g.fillStyle(c.wall, 0.8);
        for (var i = 0; i < 8; i++) {
            var sx = 100 + i * 85;
            var sh = 30 + Math.random() * 50;
            g.fillTriangle(sx - 10, 0, sx + 10, 0, sx, sh);
        }

        // Crystals
        g.fillStyle(c.accent, 0.6);
        g.fillTriangle(150, 520, 160, 470, 170, 520);
        g.fillTriangle(600, 520, 615, 460, 630, 520);
        g.fillStyle(c.accent, 0.3);
        g.fillTriangle(155, 520, 162, 480, 168, 520);
        g.fillTriangle(605, 520, 617, 470, 625, 520);
    },

    _jungle: function(g, c) {
        // Dense vegetation background layers
        g.fillStyle(0x1a4a1a, 0.5);
        for (var i = 0; i < 12; i++) {
            var tx = i * 70 + Math.random() * 30;
            g.fillTriangle(tx, 520, tx + 30, 200 + Math.random() * 100, tx + 60, 520);
        }

        // Vines
        g.lineStyle(3, 0x2d5a27, 0.7);
        for (var v = 0; v < 6; v++) {
            var vx = 80 + v * 130;
            g.beginPath();
            g.moveTo(vx, 0);
            for (var vy = 0; vy < 400; vy += 20) {
                g.lineTo(vx + Math.sin(vy * 0.05) * 15, vy);
            }
            g.strokePath();
        }

        // Canopy top
        g.fillStyle(c.wall, 0.6);
        for (var cx = 0; cx < 800; cx += 40) {
            g.fillCircle(cx, 15, 25 + Math.random() * 15);
        }
    },

    _volcano: function(g, c) {
        // Volcanic rock walls
        g.fillStyle(c.wall, 0.7);
        g.fillRect(0, 0, 50, 520);
        g.fillRect(750, 0, 50, 520);

        // Lava glow at bottom
        g.fillStyle(0xff3300, 0.3);
        g.fillRect(0, 480, 800, 120);
        g.fillStyle(0xff6600, 0.2);
        g.fillRect(0, 500, 800, 100);

        // Cracks with lava
        g.lineStyle(2, 0xff4400, 0.5);
        g.lineBetween(200, 100, 220, 300);
        g.lineBetween(220, 300, 180, 500);
        g.lineBetween(550, 50, 580, 250);
        g.lineBetween(580, 250, 560, 480);

        // Rock formations
        g.fillStyle(c.wall, 0.8);
        g.fillTriangle(100, 520, 130, 450, 160, 520);
        g.fillTriangle(640, 520, 680, 430, 720, 520);
    },

    _library: function(g, c) {
        // Bookshelves on walls
        g.fillStyle(c.wall, 0.8);
        g.fillRect(0, 0, 80, 520);
        g.fillRect(720, 0, 80, 520);

        // Shelves with books
        var bookColors = [0x8b0000, 0x00008b, 0x006400, 0x8b4513, 0x4a0080];
        for (var shelf = 0; shelf < 5; shelf++) {
            var sy = 50 + shelf * 100;
            g.fillStyle(c.accent, 0.6);
            g.fillRect(0, sy + 60, 80, 5);
            g.fillRect(720, sy + 60, 80, 5);
            for (var b = 0; b < 6; b++) {
                g.fillStyle(bookColors[(shelf + b) % bookColors.length], 0.8);
                g.fillRect(5 + b * 12, sy + 10, 10, 50);
                g.fillRect(725 + b * 12, sy + 10, 10, 50);
            }
        }

        // Warm glow spots (candles)
        g.fillStyle(0xffcc00, 0.15);
        g.fillCircle(400, 300, 200);
    },

    _ice: function(g, c) {
        // Ice walls
        g.fillStyle(c.wall, 0.5);
        g.fillRect(0, 0, 60, 520);
        g.fillRect(740, 0, 60, 520);

        // Ice reflections
        g.fillStyle(0xffffff, 0.1);
        for (var i = 0; i < 20; i++) {
            var ix = Math.random() * 800;
            var iy = Math.random() * 520;
            g.fillRect(ix, iy, 30 + Math.random() * 40, 2);
        }

        // Icicles top
        g.fillStyle(c.accent, 0.6);
        for (var ic = 0; ic < 15; ic++) {
            var icx = 30 + ic * 55;
            g.fillTriangle(icx - 8, 0, icx + 8, 0, icx, 30 + Math.random() * 30);
        }

        // Frost on floor
        g.fillStyle(0xffffff, 0.1);
        g.fillRect(0, 510, 800, 10);
    },

    _catacombs: function(g, c) {
        // Sandstone walls
        g.fillStyle(c.wall, 0.6);
        g.fillRect(0, 0, 70, 520);
        g.fillRect(730, 0, 70, 520);

        // Hieroglyphs
        g.lineStyle(2, c.accent, 0.4);
        var symbols = [[20,100], [20,200], [20,300], [20,400], [750,100], [750,200], [750,300], [750,400]];
        for (var s = 0; s < symbols.length; s++) {
            var sx = symbols[s][0], sy = symbols[s][1];
            // Simple geometric hieroglyphs
            g.strokeRect(sx, sy, 20, 25);
            g.lineBetween(sx+5, sy+5, sx+15, sy+20);
            g.strokeCircle(sx+10, sy+35, 6);
        }

        // Arched ceiling
        g.lineStyle(3, c.accent, 0.3);
        g.beginPath();
        g.arc(400, 0, 350, 0, Math.PI, false);
        g.strokePath();
    },

    _ship: function(g, c) {
        // Dark stormy sky
        g.fillStyle(0x0a0a1e, 0.5);
        g.fillRect(0, 0, 800, 200);

        // Waves
        g.fillStyle(0x1a2a4a, 0.6);
        for (var w = 0; w < 800; w += 40) {
            g.fillCircle(w, 530, 25);
        }

        // Ship railings
        g.fillStyle(c.wall, 0.7);
        g.fillRect(0, 480, 800, 8);
        // Railing posts
        for (var p = 0; p < 800; p += 80) {
            g.fillRect(p, 460, 8, 28);
        }

        // Mast
        g.fillStyle(0x4a3a2a, 0.8);
        g.fillRect(390, 50, 10, 430);
        // Crow's nest
        g.fillRect(370, 50, 50, 8);

        // Lightning flash hint
        g.lineStyle(2, 0xffffff, 0.15);
        g.lineBetween(600, 0, 590, 80);
        g.lineBetween(590, 80, 610, 130);
    },

    _tower: function(g, c) {
        // Circular tower walls
        g.fillStyle(c.wall, 0.6);
        g.fillRect(0, 0, 50, 520);
        g.fillRect(750, 0, 50, 520);

        // Arched windows
        g.fillStyle(0x1a0e2e, 0.8);
        g.fillRect(10, 150, 30, 50);
        g.fillRect(760, 150, 30, 50);
        g.fillStyle(c.accent, 0.3);
        g.fillCircle(25, 150, 15);
        g.fillCircle(775, 150, 15);

        // Shelves with potions/bottles
        g.fillStyle(c.wall, 0.5);
        g.fillRect(60, 200, 100, 5);
        g.fillRect(640, 200, 100, 5);

        // Potion bottles
        var potionColors = [0xe67e22, 0x9b59b6, 0x2ecc71, 0xe74c3c];
        for (var p = 0; p < 4; p++) {
            g.fillStyle(potionColors[p], 0.7);
            g.fillRect(70 + p * 22, 180, 10, 20);
            g.fillCircle(75 + p * 22, 178, 6);
            g.fillStyle(potionColors[p], 0.7);
            g.fillRect(650 + p * 22, 180, 10, 20);
            g.fillCircle(655 + p * 22, 178, 6);
        }

        // Alchemical circle on floor
        g.lineStyle(2, c.accent, 0.3);
        g.strokeCircle(400, 520, 100);
        g.strokeCircle(400, 520, 70);
    },

    _treasure: function(g, c) {
        // Golden walls
        g.fillStyle(c.wall, 0.5);
        g.fillRect(0, 0, 60, 520);
        g.fillRect(740, 0, 60, 520);

        // Gold patterns
        g.lineStyle(2, c.accent, 0.4);
        for (var y = 0; y < 520; y += 60) {
            g.lineBetween(0, y, 60, y);
            g.lineBetween(740, y, 800, y);
        }

        // Treasure piles
        g.fillStyle(0xf1c40f, 0.4);
        g.fillCircle(100, 520, 40);
        g.fillCircle(700, 520, 40);
        g.fillCircle(150, 520, 30);
        g.fillCircle(650, 520, 30);

        // Gems
        g.fillStyle(0xe74c3c, 0.6);
        g.fillCircle(120, 495, 5);
        g.fillStyle(0x2ecc71, 0.6);
        g.fillCircle(690, 498, 5);
        g.fillStyle(0x3498db, 0.6);
        g.fillCircle(135, 502, 4);

        // Central glow
        g.fillStyle(0xf1c40f, 0.1);
        g.fillCircle(400, 350, 180);
    },

    _drawPoly: function(g, points) {
        g.beginPath();
        g.moveTo(points[0], points[1]);
        for (var i = 2; i < points.length; i += 2) {
            g.lineTo(points[i], points[i+1]);
        }
        g.closePath();
        g.fillPath();
    }
};
