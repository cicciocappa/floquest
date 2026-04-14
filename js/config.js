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
    LIVES_PER_LEVEL: 3,
    TOTAL_QUESTIONS: 10,

    // Walk
    WALK_RIGHT_PX: 100,
    WALK_CYCLES_APPROACH: 3,
    WALK_CYCLES_QUESTION: 12,
    WALK_CYCLES_PRE_SELECTED: 3,

    // Bonus phase
    BONUS_DURATION: 60,
    BONUS_QUESTIONS: 16,

    // World
    WORLD_W: 40000,

    // Level background tiles
    BG_START_TILE: 1024,   // x where first tile begins (after picking image)
    BG_WIDTH_TILE: 1980,   // width of each repeating tile

    // Score
    SCORE: {
        BASE: 100,
        SPEED_BONUS: 50,
        FIRST_TRY_BONUS: 50,
        LEVEL_COMPLETE: 200,
        PERFECT_LEVEL: 500,
        BONUS_PER_COIN: 50
    },
    SPEED_THRESHOLD: 5000,
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
