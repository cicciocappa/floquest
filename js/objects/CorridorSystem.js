var FloQuest = FloQuest || {};

FloQuest.CorridorSystem = (function() {

    // Base corridor data (animations, angles) — Y positions are computed from skyHeight
    var CORRIDOR_DEFS = [
        { angle: 60, walkType: 'walk_up60',
          transIn: 'walk_right_to_up60',  transOut: 'walk_up60_to_right',
          returnWalk: 'walk_down60', returnIn: 'walk_right_to_down60', returnOut: 'walk_down60_to_right',
          approachCycles: 2 },
        { angle: 45, walkType: 'walk_up',
          transIn: 'walk_right_to_up',    transOut: 'walk_up_to_right',
          returnWalk: 'walk_down',   returnIn: 'walk_right_to_down',   returnOut: 'walk_down_to_right',
          approachCycles: 1 },
        { angle: 45, walkType: 'walk_down',
          transIn: 'walk_right_to_down',  transOut: 'walk_down_to_right',
          returnWalk: 'walk_up',     returnIn: 'walk_right_to_up',     returnOut: 'walk_up_to_right',
          approachCycles: 1 },
        { angle: 60, walkType: 'walk_down60',
          transIn: 'walk_right_to_down60', transOut: 'walk_down60_to_right',
          returnWalk: 'walk_up60',   returnIn: 'walk_right_to_up60',   returnOut: 'walk_up60_to_right',
          approachCycles: 2 }
    ];

    // Current skyHeight and computed corridors
    var _skyHeight = 0;
    var CORRIDORS = [];
    var _centerY = 512;

    /** Recompute corridor Y positions based on skyHeight */
    function configure(skyHeight) {
        _skyHeight = skyHeight || 0;
        var H = FloQuest.Config.VIEWPORT_H;
        var floorH = H - _skyHeight;
        var laneH = floorH / 4;
        _centerY = _skyHeight + floorH / 2;

        // Mutate array in-place so existing references stay valid
        CORRIDORS.length = 0;
        CORRIDOR_DEFS.forEach(function(def, i) {
            var corridor = {};
            Object.keys(def).forEach(function(k) { corridor[k] = def[k]; });
            corridor.y = _skyHeight + laneH * (i + 0.5);
            CORRIDORS.push(corridor);
        });
    }

    // Default: skyHeight = 0 (backwards compatible)
    configure(0);

    function calcMovement(corridorIndex) {
        var c = CORRIDORS[corridorIndex];
        var targetDy = c.y - _centerY;
        var DIAG_DX = FloQuest.Config.DIAG_DX;
        var totalDiagFrames = 30 + 30 * c.approachCycles + 30;

        // Fixed horizontal distance, dy computed to reach corridor Y
        var dxPerFrame = DIAG_DX / totalDiagFrames;
        var dyPerFrame = targetDy / totalDiagFrames;

        return {
            transIn:  { dx: dxPerFrame * 30, dy: dyPerFrame * 30, frames: 30 },
            walk:     { dx: dxPerFrame * 30 * c.approachCycles,
                        dy: dyPerFrame * 30 * c.approachCycles,
                        frames: 30 * c.approachCycles },
            transOut: { dx: dxPerFrame * 30, dy: dyPerFrame * 30, frames: 30 },
            totalDiagDx: DIAG_DX
        };
    }

    return {
        CORRIDORS: CORRIDORS,
        configure: configure,
        getCorridor: function(index) { return CORRIDORS[index]; },
        calcMovement: calcMovement,
        getCenterY: function() { return _centerY; },
        getSkyHeight: function() { return _skyHeight; }
    };
})();
