export const CONFIG = {
    LANE: {
        COUNT: 3,
        POSITIONS: [-2, 0, 2], // X coordinates
        WIDTH: 1.8,
        GAP: 0.5
    },
    PLAYER: {
        SWITCH_DURATION: 0.12,
        INVULNERABLE_DURATION: 2000,
        RESPAWN_OPACITY: 0.5
    },
    PLATFORM: {
        LENGTH: 4,
        HEIGHT: 0.2,
        SPAWN_INTERVAL: 1.5,
        SPAWN_DISTANCE: 20,
        DESPAWN_DISTANCE: -10,
        POOL_SIZE: 50,
        MAX_ACTIVE: 25
    },
    DIFFICULTY: {
        SPEED: {
            BASE: 2.5,
            INCREMENT: 0.25,
            INTERVAL: 5,
            MAX: 8
        },
        RULE_CHANGE: [
            { time: 0, interval: 5.0 },
            { time: 10, interval: 4.0 },
            { time: 20, interval: 3.0 },
            { time: 30, interval: 2.5 }
        ]
    },
    SCORING: {
        BASE_PER_SECOND: 100,
        PERFECT_SHIFT_BONUS: 50,
        PERFECT_SHIFT_WINDOW: 500, // ms
        COMBO: {
            LEVEL1: 3, // 2x
            LEVEL2: 6  // 3x (max)
        }
    },
    ONBOARDING: {
        FIRST_GAME_SPEED_MULT: 0.5,
        FIRST_RULE_DURATION: 8000,
        HINT_DURATION: 3000
    },
    STORAGE_KEYS: {
        HIGHSCORE: 'shift_or_die_highscore',
        DATA: 'shift_or_die_data',
        SETTINGS: 'shift_or_die_settings'
    }
};
