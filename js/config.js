var FloQuest = FloQuest || {};

FloQuest.Config = {
    // Viewport — height fixed, width calculated at boot from screen aspect ratio
    VIEWPORT_H: 960,
    VIEWPORT_W: 0, // set in main.js

    // Sprite
    SPRITE_SCALE: 2,
    SPRITE_SIZE: 128,
    ANIM_FPS: 30,
    MAX_LIGHTS: 10,

    // Gameplay
    LIVES_PER_LEVEL: 3,              // fallback — the actual value comes from LIVES_PER_DIFFICULTY
    LIVES_PER_DIFFICULTY: {
        easy:   3,
        normal: 4,
        hard:   5
    },
    TOTAL_QUESTIONS: 10,

    // Walk
    WALK_RIGHT_PX: 100,
    WALK_CYCLES_APPROACH: 3,
    WALK_CYCLES_QUESTION: 12,
    WALK_CYCLES_PRE_SELECTED: 3,
    DIAG_DX: 100,           // total horizontal px across the 3-cycle diagonal unit (transIn + diag + transOut)

    // Minimal loop — used by the simplified GameScene flow
    STEPS_PER_QUESTION: 5,  // walk_right cycles per question (1 cycle = 1s = WALK_RIGHT_PX)

    // Bonus phase
    BONUS_DURATION: 60,          // seconds on the climbing-wall timer
    BONUS_QUESTIONS: 12,         // total binary questions in a bonus run
    BONUS_ANSWERS: 2,
    BONUS_AFTER_LEVELS: [3, 6, 9],
    BONUS_WALL_HEIGHT_DEFAULT: 2400,   // px — height the wall scrolls across in 60s
    BONUS_WALL_WIDTH: 640,

    // World
    WORLD_W: 40000,

    // Level background tiles
    BG_START_TILE: 1024,   // x where first tile begins (after picking image)
    BG_WIDTH_TILE: 1980,   // width of each repeating tile

    // Score — new formula: levelScore = max(0, LEVEL_BASE - errors*ERROR_PENALTY) * difficultyFactor
    SCORE: {
        LEVEL_BASE: 1000,
        ERROR_PENALTY: 100,
        BONUS_COMPLETE: 1000,       // awarded when all BONUS_QUESTIONS answered without mistakes
        BONUS_PER_STREAK: 50        // per-question fallback if the timer expires mid-streak
    },
    DIFFICULTY_FACTOR: {
        easy:   1.0,
        normal: 1.5,
        hard:   2.0
    },
    TIMER_SECONDS: 15,

    // Trap animation mapping (level trap type → player animation type)
    TRAP_ANIM: {
        'darts': 'death',
        'stalactites': 'death',
        'quicksand': 'falling',
        'lava': 'falling',
        'shelves': 'death',
        'freeze': 'death',
        'mummy': 'death',
        'kraken': 'falling',
        'explosion': 'death',
        'collapse': 'falling'
    },

    COLORS: {
        GOLD: 0xc9a84c,
        DARK_BG: 0x1a1a2e,
        RED: 0xe74c3c,
        GREEN: 0x2ecc71,
        BLUE: 0x3498db,
        WHITE: 0xffffff,
        BLACK: 0x000000
    },

    // Legacy aliases (used by non-game scenes)
    get WIDTH() { return this.VIEWPORT_W; },
    get HEIGHT() { return this.VIEWPORT_H; }
};
