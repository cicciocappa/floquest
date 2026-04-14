var FloQuest = FloQuest || {};

FloQuest.ParticleFactory = {
    createAmbient: function(scene, type, colors) {
        var config = this._getConfig(type, colors);
        if (!config) return null;
        return scene.add.particles(0, 0, 'particle', config);
    },

    _getConfig: function(type, colors) {
        switch(type) {
            case 'fire':
                return {
                    x: { min: 0, max: 800 },
                    y: { min: 550, max: 600 },
                    speed: { min: 20, max: 60 },
                    angle: { min: -100, max: -80 },
                    scale: { start: 0.4, end: 0 },
                    lifespan: 2000,
                    frequency: 200,
                    tint: [0xff6600, 0xff9900, 0xffcc00],
                    alpha: { start: 0.6, end: 0 },
                    blendMode: 'ADD'
                };
            case 'sparkle':
                return {
                    x: { min: 0, max: 800 },
                    y: { min: 0, max: 600 },
                    speed: { min: 5, max: 20 },
                    scale: { start: 0.3, end: 0 },
                    lifespan: 3000,
                    frequency: 300,
                    tint: [0x9b59b6, 0xc39bd3, 0xffffff],
                    alpha: { start: 0.8, end: 0 },
                    blendMode: 'ADD'
                };
            case 'leaves':
                return {
                    x: { min: 0, max: 800 },
                    y: -10,
                    speed: { min: 30, max: 80 },
                    angle: { min: 80, max: 100 },
                    scale: { start: 0.3, end: 0.1 },
                    lifespan: 5000,
                    frequency: 500,
                    tint: [0x27ae60, 0x2ecc71, 0x1abc9c],
                    alpha: { start: 0.7, end: 0 },
                    rotate: { min: 0, max: 360 }
                };
            case 'ember':
                return {
                    x: { min: 0, max: 800 },
                    y: { min: 550, max: 600 },
                    speed: { min: 40, max: 100 },
                    angle: { min: -110, max: -70 },
                    scale: { start: 0.5, end: 0 },
                    lifespan: 3000,
                    frequency: 100,
                    tint: [0xff3300, 0xff6600, 0xff9900, 0xffcc00],
                    alpha: { start: 0.8, end: 0 },
                    blendMode: 'ADD'
                };
            case 'dust':
                return {
                    x: { min: 0, max: 800 },
                    y: { min: 0, max: 600 },
                    speed: { min: 5, max: 15 },
                    scale: { start: 0.2, end: 0 },
                    lifespan: 4000,
                    frequency: 400,
                    tint: [0xd4a574, 0xc4956a, 0xb4855a],
                    alpha: { start: 0.4, end: 0 }
                };
            case 'snow':
                return {
                    x: { min: 0, max: 800 },
                    y: -10,
                    speed: { min: 20, max: 50 },
                    angle: { min: 80, max: 100 },
                    scale: { start: 0.3, end: 0.1 },
                    lifespan: 6000,
                    frequency: 150,
                    tint: [0xaaddff, 0xffffff, 0xccddff],
                    alpha: { start: 0.8, end: 0.2 }
                };
            case 'rain':
                return {
                    x: { min: 0, max: 800 },
                    y: -10,
                    speed: { min: 200, max: 400 },
                    angle: { min: 85, max: 95 },
                    scale: { start: 0.2, end: 0.1 },
                    lifespan: 1500,
                    frequency: 30,
                    tint: [0x5588aa, 0x6699bb],
                    alpha: { start: 0.5, end: 0 }
                };
            case 'bubble':
                return {
                    x: { min: 0, max: 800 },
                    y: { min: 550, max: 600 },
                    speed: { min: 20, max: 50 },
                    angle: { min: -100, max: -80 },
                    scale: { start: 0.3, end: 0.5 },
                    lifespan: 4000,
                    frequency: 400,
                    tint: [0xe67e22, 0x9b59b6, 0x2ecc71],
                    alpha: { start: 0.6, end: 0 }
                };
            default:
                return null;
        }
    },

    createExplosion: function(scene, x, y, color) {
        var particles = scene.add.particles(x, y, 'particle', {
            speed: { min: 100, max: 300 },
            scale: { start: 0.6, end: 0 },
            lifespan: 800,
            quantity: 30,
            tint: color || 0xffffff,
            blendMode: 'ADD',
            emitting: false
        });
        particles.explode(30);
        scene.time.delayedCall(1000, function() { particles.destroy(); });
        return particles;
    },

    createSuccess: function(scene, x, y) {
        var particles = scene.add.particles(x, y, 'particle', {
            speed: { min: 50, max: 200 },
            scale: { start: 0.5, end: 0 },
            lifespan: 1000,
            quantity: 20,
            tint: [0x2ecc71, 0xf1c40f, 0xffffff],
            blendMode: 'ADD',
            emitting: false
        });
        particles.explode(20);
        scene.time.delayedCall(1200, function() { particles.destroy(); });
        return particles;
    }
};
