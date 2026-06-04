const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, 'study.db');

let db = null;
let stmts = null;

/**
 * Initialize the database. Must be called once before any queries.
 * @returns {Promise<void>}
 */
async function initDB() {
    const SQL = await initSqlJs();

    // Load existing database or create new
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            total_seconds INTEGER DEFAULT 0,
            daily_seconds INTEGER DEFAULT 0,
            weekly_seconds INTEGER DEFAULT 0,
            monthly_seconds INTEGER DEFAULT 0,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            best_streak INTEGER DEFAULT 0,
            last_study_date TEXT,
            goal_hours REAL DEFAULT 0,
            goal_period TEXT DEFAULT 'daily',
            reminders_enabled INTEGER DEFAULT 0,
            achievements_count INTEGER DEFAULT 0,
            prestige_level INTEGER DEFAULT 0,
            session_start INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (user_id, guild_id)
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            start_time INTEGER NOT NULL,
            end_time INTEGER NOT NULL,
            duration_seconds INTEGER NOT NULL,
            date TEXT NOT NULL
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS weekly_winners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            rank INTEGER NOT NULL,
            hours REAL NOT NULL,
            week_start TEXT NOT NULL,
            week_end TEXT NOT NULL
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS monthly_winners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            hours REAL NOT NULL,
            month TEXT NOT NULL,
            achievements TEXT DEFAULT '[]'
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            milestone_hours INTEGER NOT NULL,
            achieved_at TEXT DEFAULT (datetime('now')),
            UNIQUE(user_id, guild_id, milestone_hours)
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS guild_config (
            guild_id TEXT PRIMARY KEY,
            announcement_channel TEXT,
            achievement_channel TEXT,
            study_channels TEXT DEFAULT '[]',
            weekly_champion_role TEXT,
            weekly_elite_role TEXT,
            weekly_achiever_role TEXT,
            monthly_winner_role TEXT,
            prestige_roles TEXT DEFAULT '{}',
            milestone_roles TEXT DEFAULT '{}'
        );
    `);

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_guild ON users(guild_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_weekly ON users(guild_id, weekly_seconds DESC);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_monthly ON users(guild_id, monthly_seconds DESC);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_total ON users(guild_id, total_seconds DESC);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON study_sessions(user_id, guild_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_date ON study_sessions(date);`);

    // Save after init
    saveDB();

    console.log('✅ Database initialized successfully');
}

/**
 * Save database to disk.
 */
function saveDB() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save every 30 seconds
setInterval(() => saveDB(), 30000);

// Save on process exit
process.on('exit', () => saveDB());
process.on('SIGINT', () => { saveDB(); process.exit(0); });
process.on('SIGTERM', () => { saveDB(); process.exit(0); });

// ─── Query Helpers ────────────────────────────────────────────

/**
 * Execute a query and return the first row as an object.
 * @param {string} sql
 * @param {Array} params
 * @returns {object|undefined}
 */
function getOne(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        stmt.free();
        const row = {};
        cols.forEach((col, i) => row[col] = vals[i]);
        return row;
    }
    stmt.free();
    return undefined;
}

/**
 * Execute a query and return all rows as array of objects.
 * @param {string} sql
 * @param {Array} params
 * @returns {Array<object>}
 */
function getAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        const row = {};
        cols.forEach((col, i) => row[col] = vals[i]);
        rows.push(row);
    }
    stmt.free();
    return rows;
}

/**
 * Execute a statement (INSERT/UPDATE/DELETE).
 * @param {string} sql
 * @param {Array} params
 */
function run(sql, params = []) {
    db.run(sql, params);
    saveDB();
}

// ─── Prepared Query Functions ─────────────────────────────────

const queries = {
    // ── User Operations ──
    getUser(userId, guildId) {
        return getOne(`SELECT * FROM users WHERE user_id = ? AND guild_id = ?`, [userId, guildId]);
    },

    upsertUser(userId, guildId) {
        run(`INSERT OR IGNORE INTO users (user_id, guild_id) VALUES (?, ?)`, [userId, guildId]);
    },

    updateStudyTime(duration, today, userId, guildId) {
        run(`UPDATE users SET
            total_seconds = total_seconds + ?,
            daily_seconds = daily_seconds + ?,
            weekly_seconds = weekly_seconds + ?,
            monthly_seconds = monthly_seconds + ?,
            last_study_date = ?
        WHERE user_id = ? AND guild_id = ?`,
        [duration, duration, duration, duration, today, userId, guildId]);
    },

    updateXPLevel(xp, level, userId, guildId) {
        run(`UPDATE users SET xp = ?, level = ? WHERE user_id = ? AND guild_id = ?`,
        [xp, level, userId, guildId]);
    },

    updateStreak(currentStreak, bestStreak, userId, guildId) {
        run(`UPDATE users SET current_streak = ?, best_streak = ? WHERE user_id = ? AND guild_id = ?`,
        [currentStreak, bestStreak, userId, guildId]);
    },

    setSessionStart(timestamp, userId, guildId) {
        run(`UPDATE users SET session_start = ? WHERE user_id = ? AND guild_id = ?`,
        [timestamp, userId, guildId]);
    },

    clearSession(userId, guildId) {
        run(`UPDATE users SET session_start = NULL WHERE user_id = ? AND guild_id = ?`,
        [userId, guildId]);
    },

    setGoal(hours, period, userId, guildId) {
        run(`UPDATE users SET goal_hours = ?, goal_period = ? WHERE user_id = ? AND guild_id = ?`,
        [hours, period, userId, guildId]);
    },

    setReminders(enabled, userId, guildId) {
        run(`UPDATE users SET reminders_enabled = ? WHERE user_id = ? AND guild_id = ?`,
        [enabled, userId, guildId]);
    },

    updatePrestige(level, userId, guildId) {
        run(`UPDATE users SET prestige_level = ? WHERE user_id = ? AND guild_id = ?`,
        [level, userId, guildId]);
    },

    incrementAchievements(userId, guildId) {
        run(`UPDATE users SET achievements_count = achievements_count + 1 WHERE user_id = ? AND guild_id = ?`,
        [userId, guildId]);
    },

    // ── Leaderboard Queries ──
    getLeaderboardDaily(guildId, limit) {
        return getAll(`SELECT * FROM users WHERE guild_id = ? AND daily_seconds > 0
            ORDER BY daily_seconds DESC LIMIT ?`, [guildId, limit]);
    },

    getLeaderboardWeekly(guildId, limit) {
        return getAll(`SELECT * FROM users WHERE guild_id = ? AND weekly_seconds > 0
            ORDER BY weekly_seconds DESC LIMIT ?`, [guildId, limit]);
    },

    getLeaderboardMonthly(guildId, limit) {
        return getAll(`SELECT * FROM users WHERE guild_id = ? AND monthly_seconds > 0
            ORDER BY monthly_seconds DESC LIMIT ?`, [guildId, limit]);
    },

    getLeaderboardAllTime(guildId, limit) {
        return getAll(`SELECT * FROM users WHERE guild_id = ? AND total_seconds > 0
            ORDER BY total_seconds DESC LIMIT ?`, [guildId, limit]);
    },

    getUserRank(guildId, userId) {
        return getOne(`SELECT COUNT(*) + 1 as rank FROM users
            WHERE guild_id = ? AND total_seconds > (
                SELECT COALESCE(total_seconds, 0) FROM users WHERE user_id = ? AND guild_id = ?
            )`, [guildId, userId, guildId]);
    },

    // ── Weekly/Monthly Winners ──
    getTopWeekly(guildId) {
        return getAll(`SELECT * FROM users WHERE guild_id = ? AND weekly_seconds > 0
            ORDER BY weekly_seconds DESC LIMIT 3`, [guildId]);
    },

    getTopMonthly(guildId) {
        return getAll(`SELECT * FROM users WHERE guild_id = ? AND monthly_seconds > 0
            ORDER BY monthly_seconds DESC LIMIT 1`, [guildId]);
    },

    insertWeeklyWinner(guildId, userId, rank, hours, weekStart, weekEnd) {
        run(`INSERT INTO weekly_winners (guild_id, user_id, rank, hours, week_start, week_end)
            VALUES (?, ?, ?, ?, ?, ?)`, [guildId, userId, rank, hours, weekStart, weekEnd]);
    },

    insertMonthlyWinner(guildId, userId, hours, month, achievements) {
        run(`INSERT INTO monthly_winners (guild_id, user_id, hours, month, achievements)
            VALUES (?, ?, ?, ?, ?)`, [guildId, userId, hours, month, achievements]);
    },

    getWeeklyWinnerHistory(guildId, limit) {
        return getAll(`SELECT * FROM weekly_winners WHERE guild_id = ?
            ORDER BY week_start DESC LIMIT ?`, [guildId, limit]);
    },

    getMonthlyWinnerHistory(guildId, limit) {
        return getAll(`SELECT * FROM monthly_winners WHERE guild_id = ?
            ORDER BY month DESC LIMIT ?`, [guildId, limit]);
    },

    // ── Resets ──
    resetDailyAll(guildId) {
        run(`UPDATE users SET daily_seconds = 0 WHERE guild_id = ?`, [guildId]);
    },

    resetWeeklyAll(guildId) {
        run(`UPDATE users SET weekly_seconds = 0 WHERE guild_id = ?`, [guildId]);
    },

    resetMonthlyAll(guildId) {
        run(`UPDATE users SET monthly_seconds = 0 WHERE guild_id = ?`, [guildId]);
    },

    // ── Sessions ──
    insertSession(userId, guildId, startTime, endTime, duration, date) {
        run(`INSERT INTO study_sessions (user_id, guild_id, start_time, end_time, duration_seconds, date)
            VALUES (?, ?, ?, ?, ?, ?)`, [userId, guildId, startTime, endTime, duration, date]);
    },

    // ── Milestones ──
    getMilestones(userId, guildId) {
        return getAll(`SELECT milestone_hours FROM milestones WHERE user_id = ? AND guild_id = ?`,
            [userId, guildId]);
    },

    insertMilestone(userId, guildId, milestoneHours) {
        run(`INSERT OR IGNORE INTO milestones (user_id, guild_id, milestone_hours) VALUES (?, ?, ?)`,
            [userId, guildId, milestoneHours]);
    },

    // ── Streak Queries ──
    getTopStreaks(guildId, limit) {
        return getAll(`SELECT * FROM users WHERE guild_id = ? AND best_streak > 0
            ORDER BY best_streak DESC LIMIT ?`, [guildId, limit]);
    },

    // ── Reminder Users ──
    getReminderUsers(guildId) {
        return getAll(`SELECT * FROM users WHERE guild_id = ? AND reminders_enabled = 1`, [guildId]);
    },

    getActiveSessionUsers() {
        return getAll(`SELECT * FROM users WHERE session_start IS NOT NULL`);
    },

    // ── Guild Config ──
    getGuildConfig(guildId) {
        return getOne(`SELECT * FROM guild_config WHERE guild_id = ?`, [guildId]);
    },

    upsertGuildConfig(guildId) {
        run(`INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)`, [guildId]);
    },

    getAllGuilds() {
        return getAll(`SELECT DISTINCT guild_id FROM guild_config`);
    },
};

// ─── Helper to update a single guild_config field ──────────
function updateGuildConfig(guildId, field, value) {
    const allowed = [
        'announcement_channel', 'achievement_channel', 'study_channels',
        'weekly_champion_role', 'weekly_elite_role', 'weekly_achiever_role',
        'monthly_winner_role', 'prestige_roles', 'milestone_roles',
    ];
    if (!allowed.includes(field)) throw new Error(`Invalid config field: ${field}`);
    run(`UPDATE guild_config SET ${field} = ? WHERE guild_id = ?`, [value, guildId]);
}

module.exports = { initDB, queries, updateGuildConfig, saveDB };
