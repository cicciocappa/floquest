var FloQuest = FloQuest || {};

/**
 * SlideTransitions — rotating Phaser image transitions for the slideshow scene.
 *
 * Each transition expects oldImg and newImg as Phaser Images positioned inside
 * a clipped container of size (w × h) centered at (0, 0).
 * Returns a Promise that resolves when the animation finishes; at that point
 * oldImg has been destroyed and newImg sits at its rest position (0, 0, alpha=1).
 */
FloQuest.SlideTransitions = {
    _index: 0,
    _names: ['fadeCross', 'sweepLR', 'sweepRL', 'sweepTB', 'sweepBT'],

    run: function(scene, oldImg, newImg, w, h, duration) {
        var name = this._names[this._index];
        this._index = (this._index + 1) % this._names.length;
        return this[name](scene, oldImg, newImg, w, h, duration || 600);
    },

    _tween: function(scene, config) {
        return new Promise(function(resolve) {
            scene.tweens.add(Object.assign({}, config, { onComplete: resolve }));
        });
    },

    fadeCross: function(scene, oldImg, newImg, w, h, dur) {
        newImg.setAlpha(0).setPosition(0, 0);
        if (!oldImg) {
            return this._tween(scene, { targets: newImg, alpha: 1, duration: dur, ease: 'Sine.easeOut' });
        }
        var p1 = this._tween(scene, { targets: oldImg, alpha: 0, duration: dur, ease: 'Sine.easeIn' });
        var p2 = this._tween(scene, { targets: newImg, alpha: 1, duration: dur, ease: 'Sine.easeOut' });
        return Promise.all([p1, p2]).then(function() {
            if (oldImg) oldImg.destroy();
        });
    },

    sweepLR: function(scene, oldImg, newImg, w, h, dur) {
        // new slides in from the right, old exits to the left
        newImg.setAlpha(1).setPosition(w, 0);
        if (!oldImg) {
            return this._tween(scene, { targets: newImg, x: 0, duration: dur, ease: 'Cubic.easeInOut' });
        }
        var p1 = this._tween(scene, { targets: oldImg, x: -w, duration: dur, ease: 'Cubic.easeInOut' });
        var p2 = this._tween(scene, { targets: newImg, x: 0, duration: dur, ease: 'Cubic.easeInOut' });
        return Promise.all([p1, p2]).then(function() {
            if (oldImg) oldImg.destroy();
        });
    },

    sweepRL: function(scene, oldImg, newImg, w, h, dur) {
        newImg.setAlpha(1).setPosition(-w, 0);
        if (!oldImg) {
            return this._tween(scene, { targets: newImg, x: 0, duration: dur, ease: 'Cubic.easeInOut' });
        }
        var p1 = this._tween(scene, { targets: oldImg, x: w, duration: dur, ease: 'Cubic.easeInOut' });
        var p2 = this._tween(scene, { targets: newImg, x: 0, duration: dur, ease: 'Cubic.easeInOut' });
        return Promise.all([p1, p2]).then(function() {
            if (oldImg) oldImg.destroy();
        });
    },

    sweepTB: function(scene, oldImg, newImg, w, h, dur) {
        newImg.setAlpha(1).setPosition(0, -h);
        if (!oldImg) {
            return this._tween(scene, { targets: newImg, y: 0, duration: dur, ease: 'Cubic.easeInOut' });
        }
        var p1 = this._tween(scene, { targets: oldImg, y: h, duration: dur, ease: 'Cubic.easeInOut' });
        var p2 = this._tween(scene, { targets: newImg, y: 0, duration: dur, ease: 'Cubic.easeInOut' });
        return Promise.all([p1, p2]).then(function() {
            if (oldImg) oldImg.destroy();
        });
    },

    sweepBT: function(scene, oldImg, newImg, w, h, dur) {
        newImg.setAlpha(1).setPosition(0, h);
        if (!oldImg) {
            return this._tween(scene, { targets: newImg, y: 0, duration: dur, ease: 'Cubic.easeInOut' });
        }
        var p1 = this._tween(scene, { targets: oldImg, y: -h, duration: dur, ease: 'Cubic.easeInOut' });
        var p2 = this._tween(scene, { targets: newImg, y: 0, duration: dur, ease: 'Cubic.easeInOut' });
        return Promise.all([p1, p2]).then(function() {
            if (oldImg) oldImg.destroy();
        });
    }
};
