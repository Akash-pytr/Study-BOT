/**
 * Centralized configuration for the Study Bot.
 * These are defaults; per-guild overrides live in the guild_config table.
 */

module.exports = {
    // ─── XP & Leveling ────────────────────────────────────────
    XP_PER_MINUTE: 10,
    LEVEL_EXPONENT: 1.5,
    LEVEL_BASE_XP: 100, // XP for level 1→2 = 100 * 1^1.5 = 100

    // ─── Milestone Thresholds (in hours) ──────────────────────
    MILESTONES: [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],

    // ─── Prestige Tiers ───────────────────────────────────────
    PRESTIGE_TIERS: [
        { hours: 100, level: 1, name: 'Bronze', emoji: '🥉' },
        { hours: 500, level: 2, name: 'Silver', emoji: '🥈' },
        { hours: 1000, level: 3, name: 'Gold', emoji: '🥇' },
        { hours: 2500, level: 4, name: 'Diamond', emoji: '💎' },
        { hours: 5000, level: 5, name: 'Legendary', emoji: '👑' },
    ],

    // ─── Colors ───────────────────────────────────────────────
    COLORS: {
        PRIMARY: 0x5865F2,    // Discord blurple
        SUCCESS: 0x57F287,    // Green
        WARNING: 0xFEE75C,    // Yellow
        ERROR: 0xED4245,      // Red
        GOLD: 0xF1C40F,       // Gold
        MILESTONE: 0xE91E63,  // Pink
        PRESTIGE: 0x9B59B6,   // Purple
        PROFILE: 0x2B2D31,    // Dark embed
    },

    // ─── Weekly Winner Role Names (for display) ──────────────
    WEEKLY_RANKS: [
        { rank: 1, name: 'Weekly Champion', emoji: '🥇' },
        { rank: 2, name: 'Weekly Elite', emoji: '🥈' },
        { rank: 3, name: 'Weekly Achiever', emoji: '🥉' },
    ],

    // ─── Reminder Schedule ────────────────────────────────────
    REMINDER_HOUR: 20, // 8 PM UTC

    // ─── Canvas Profile Card ─────────────────────────────────
    CARD: {
        WIDTH: 934,
        HEIGHT: 282,
        BACKGROUND_START: '#1a1a2e',
        BACKGROUND_END: '#16213e',
        ACCENT: '#e94560',
        TEXT_PRIMARY: '#ffffff',
        TEXT_SECONDARY: '#a0a0b0',
        XP_BAR_BG: '#2a2a3e',
        XP_BAR_FILL_START: '#e94560',
        XP_BAR_FILL_END: '#0f3460',
        GOAL_BAR_FILL_START: '#57F287',
        GOAL_BAR_FILL_END: '#45b575',
    },
};
