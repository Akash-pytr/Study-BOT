const mongoose = require('mongoose');
require('dotenv').config();

// ─────────────────────────────────────────────────────────────
// ── Mongoose Schemas & Models
// ─────────────────────────────────────────────────────────────

// ── Users ────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    user_id:          { type: String, required: true },
    guild_id:         { type: String, required: true },
    xp:               { type: Number, default: 0 },
    level:            { type: Number, default: 1 },
    total_seconds:    { type: Number, default: 0 },
    daily_seconds:    { type: Number, default: 0 },
    weekly_seconds:   { type: Number, default: 0 },
    monthly_seconds:  { type: Number, default: 0 },
    current_streak:   { type: Number, default: 0 },
    best_streak:      { type: Number, default: 0 },
    last_study_date:  { type: String, default: null },
    session_start:    { type: Number, default: null },   // Unix timestamp
    goal_hours:       { type: Number, default: null },
    goal_period:      { type: String, default: null },
    reminders_enabled:{ type: Number, default: 0 },
    prestige_level:   { type: Number, default: 0 },
    achievements:     { type: Number, default: 0 },
}, { timestamps: true });

userSchema.index({ user_id: 1, guild_id: 1 }, { unique: true });
const User = mongoose.model('User', userSchema);

// ── Guild Config ─────────────────────────────────────────────
const guildConfigSchema = new mongoose.Schema({
    guild_id:              { type: String, required: true, unique: true },
    announcement_channel:  { type: String, default: null },
    achievement_channel:   { type: String, default: null },
    study_channels:        { type: String, default: null },
    weekly_champion_role:  { type: String, default: null },
    weekly_elite_role:     { type: String, default: null },
    weekly_achiever_role:  { type: String, default: null },
    monthly_winner_role:   { type: String, default: null },
    prestige_roles:        { type: String, default: null },
    milestone_roles:       { type: String, default: null },
}, { timestamps: true });

const GuildConfig = mongoose.model('GuildConfig', guildConfigSchema);

// ── Study Sessions ────────────────────────────────────────────
const studySessionSchema = new mongoose.Schema({
    user_id:          { type: String, required: true },
    guild_id:         { type: String, required: true },
    start_time:       { type: Number },
    end_time:         { type: Number },
    duration_seconds: { type: Number },
    date:             { type: String },
}, { timestamps: true });

const StudySession = mongoose.model('StudySession', studySessionSchema);

// ── Weekly Winners ────────────────────────────────────────────
const weeklyWinnerSchema = new mongoose.Schema({
    guild_id:   { type: String, required: true },
    user_id:    { type: String, required: true },
    rank:       { type: Number },
    hours:      { type: Number },
    week_start: { type: String },
    week_end:   { type: String },
}, { timestamps: true });

const WeeklyWinner = mongoose.model('WeeklyWinner', weeklyWinnerSchema);

// ── Monthly Winners ───────────────────────────────────────────
const monthlyWinnerSchema = new mongoose.Schema({
    guild_id:     { type: String, required: true },
    user_id:      { type: String, required: true },
    hours:        { type: Number },
    month:        { type: String },
    achievements: { type: Number },
}, { timestamps: true });

const MonthlyWinner = mongoose.model('MonthlyWinner', monthlyWinnerSchema);

// ── Milestones ────────────────────────────────────────────────
const milestoneSchema = new mongoose.Schema({
    user_id:         { type: String, required: true },
    guild_id:        { type: String, required: true },
    milestone_hours: { type: Number, required: true },
}, { timestamps: true });

milestoneSchema.index({ user_id: 1, guild_id: 1, milestone_hours: 1 }, { unique: true });
const Milestone = mongoose.model('Milestone', milestoneSchema);

// ─────────────────────────────────────────────────────────────
// ── DB Init & Save (no-op)
// ─────────────────────────────────────────────────────────────

async function initDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri.includes('<username>')) {
        console.error('❌ MONGODB_URI is missing or still has placeholder values in .env file!');
        console.error('   Set it to your MongoDB Atlas connection string.');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas');
}

function saveDB() {
    // No-op — MongoDB writes are instant
}

// ─────────────────────────────────────────────────────────────
// ── Queries (same API as before — no changes needed elsewhere)
// ─────────────────────────────────────────────────────────────

const queries = {

    // ── User Operations ──────────────────────────────────────

    async getUser(userId, guildId) {
        try {
            const user = await User.findOne({ user_id: userId, guild_id: guildId }).lean();
            return user || undefined;
        } catch (err) {
            console.error('getUser error:', err);
            return undefined;
        }
    },

    async upsertUser(userId, guildId) {
        try {
            await User.findOneAndUpdate(
                { user_id: userId, guild_id: guildId },
                { $setOnInsert: { user_id: userId, guild_id: guildId } },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error('upsertUser error:', err);
        }
    },

    /**
     * Replaces Supabase RPC update_study_time.
     * Atomically increments daily/weekly/monthly/total seconds.
     */
    async updateStudyTime(duration, today, userId, guildId) {
        try {
            await User.findOneAndUpdate(
                { user_id: userId, guild_id: guildId },
                {
                    $inc: {
                        total_seconds:   duration,
                        daily_seconds:   duration,
                        weekly_seconds:  duration,
                        monthly_seconds: duration,
                    },
                    $set: { last_study_date: today },
                }
            );
        } catch (err) {
            console.error('updateStudyTime error:', err);
        }
    },

    async updateXPLevel(xp, level, userId, guildId) {
        try {
            await User.findOneAndUpdate(
                { user_id: userId, guild_id: guildId },
                { $set: { xp, level } }
            );
        } catch (err) {
            console.error('updateXPLevel error:', err);
        }
    },

    async updateStreak(currentStreak, bestStreak, userId, guildId) {
        try {
            await User.findOneAndUpdate(
                { user_id: userId, guild_id: guildId },
                { $set: { current_streak: currentStreak, best_streak: bestStreak } }
            );
        } catch (err) {
            console.error('updateStreak error:', err);
        }
    },

    async setSessionStart(timestamp, userId, guildId) {
        try {
            await User.findOneAndUpdate(
                { user_id: userId, guild_id: guildId },
                { $set: { session_start: timestamp } }
            );
        } catch (err) {
            console.error('setSessionStart error:', err);
        }
    },

    async clearSession(userId, guildId) {
        try {
            await User.findOneAndUpdate(
                { user_id: userId, guild_id: guildId },
                { $set: { session_start: null } }
            );
        } catch (err) {
            console.error('clearSession error:', err);
        }
    },

    async setGoal(hours, period, userId, guildId) {
        try {
            await User.findOneAndUpdate(
                { user_id: userId, guild_id: guildId },
                { $set: { goal_hours: hours, goal_period: period } }
            );
        } catch (err) {
            console.error('setGoal error:', err);
        }
    },

    async setReminders(enabled, userId, guildId) {
        try {
            await User.findOneAndUpdate(
                { user_id: userId, guild_id: guildId },
                { $set: { reminders_enabled: enabled } }
            );
        } catch (err) {
            console.error('setReminders error:', err);
        }
    },

    async updatePrestige(level, userId, guildId) {
        try {
            await User.findOneAndUpdate(
                { user_id: userId, guild_id: guildId },
                { $set: { prestige_level: level } }
            );
        } catch (err) {
            console.error('updatePrestige error:', err);
        }
    },

    /**
     * Replaces Supabase RPC increment_achievements.
     */
    async incrementAchievements(userId, guildId) {
        try {
            await User.findOneAndUpdate(
                { user_id: userId, guild_id: guildId },
                { $inc: { achievements: 1 } }
            );
        } catch (err) {
            console.error('incrementAchievements error:', err);
        }
    },

    // ── Leaderboard Queries ───────────────────────────────────

    async getLeaderboardDaily(guildId, limit) {
        try {
            return await User.find({ guild_id: guildId, daily_seconds: { $gt: 0 } })
                .sort({ daily_seconds: -1 })
                .limit(limit)
                .lean();
        } catch (err) {
            console.error('getLeaderboardDaily error:', err);
            return [];
        }
    },

    async getLeaderboardWeekly(guildId, limit) {
        try {
            return await User.find({ guild_id: guildId, weekly_seconds: { $gt: 0 } })
                .sort({ weekly_seconds: -1 })
                .limit(limit)
                .lean();
        } catch (err) {
            console.error('getLeaderboardWeekly error:', err);
            return [];
        }
    },

    async getLeaderboardMonthly(guildId, limit) {
        try {
            return await User.find({ guild_id: guildId, monthly_seconds: { $gt: 0 } })
                .sort({ monthly_seconds: -1 })
                .limit(limit)
                .lean();
        } catch (err) {
            console.error('getLeaderboardMonthly error:', err);
            return [];
        }
    },

    async getLeaderboardAllTime(guildId, limit) {
        try {
            return await User.find({ guild_id: guildId, total_seconds: { $gt: 0 } })
                .sort({ total_seconds: -1 })
                .limit(limit)
                .lean();
        } catch (err) {
            console.error('getLeaderboardAllTime error:', err);
            return [];
        }
    },

    async getUserRank(guildId, userId) {
        try {
            const userData = await User.findOne({ user_id: userId, guild_id: guildId })
                .select('total_seconds')
                .lean();
            const totalSeconds = userData?.total_seconds || 0;

            const count = await User.countDocuments({
                guild_id: guildId,
                total_seconds: { $gt: totalSeconds },
            });
            return { rank: count + 1 };
        } catch (err) {
            console.error('getUserRank error:', err);
            return { rank: 0 };
        }
    },

    // ── Weekly/Monthly Winners ────────────────────────────────

    async getTopWeekly(guildId) {
        try {
            return await User.find({ guild_id: guildId, weekly_seconds: { $gt: 0 } })
                .sort({ weekly_seconds: -1 })
                .limit(3)
                .lean();
        } catch (err) {
            console.error('getTopWeekly error:', err);
            return [];
        }
    },

    async getTopMonthly(guildId) {
        try {
            return await User.find({ guild_id: guildId, monthly_seconds: { $gt: 0 } })
                .sort({ monthly_seconds: -1 })
                .limit(1)
                .lean();
        } catch (err) {
            console.error('getTopMonthly error:', err);
            return [];
        }
    },

    async insertWeeklyWinner(guildId, userId, rank, hours, weekStart, weekEnd) {
        try {
            await WeeklyWinner.create({ guild_id: guildId, user_id: userId, rank, hours, week_start: weekStart, week_end: weekEnd });
        } catch (err) {
            console.error('insertWeeklyWinner error:', err);
        }
    },

    async insertMonthlyWinner(guildId, userId, hours, month, achievements) {
        try {
            await MonthlyWinner.create({ guild_id: guildId, user_id: userId, hours, month, achievements });
        } catch (err) {
            console.error('insertMonthlyWinner error:', err);
        }
    },

    async getWeeklyWinnerHistory(guildId, limit) {
        try {
            return await WeeklyWinner.find({ guild_id: guildId })
                .sort({ week_start: -1 })
                .limit(limit)
                .lean();
        } catch (err) {
            console.error('getWeeklyWinnerHistory error:', err);
            return [];
        }
    },

    async getMonthlyWinnerHistory(guildId, limit) {
        try {
            return await MonthlyWinner.find({ guild_id: guildId })
                .sort({ month: -1 })
                .limit(limit)
                .lean();
        } catch (err) {
            console.error('getMonthlyWinnerHistory error:', err);
            return [];
        }
    },

    // ── Resets ────────────────────────────────────────────────

    async resetDailyAll(guildId) {
        try {
            await User.updateMany({ guild_id: guildId }, { $set: { daily_seconds: 0 } });
        } catch (err) {
            console.error('resetDailyAll error:', err);
        }
    },

    async resetWeeklyAll(guildId) {
        try {
            await User.updateMany({ guild_id: guildId }, { $set: { weekly_seconds: 0 } });
        } catch (err) {
            console.error('resetWeeklyAll error:', err);
        }
    },

    async resetMonthlyAll(guildId) {
        try {
            await User.updateMany({ guild_id: guildId }, { $set: { monthly_seconds: 0 } });
        } catch (err) {
            console.error('resetMonthlyAll error:', err);
        }
    },

    // ── Sessions ──────────────────────────────────────────────

    async insertSession(userId, guildId, startTime, endTime, duration, date) {
        try {
            await StudySession.create({
                user_id: userId,
                guild_id: guildId,
                start_time: startTime,
                end_time: endTime,
                duration_seconds: duration,
                date,
            });
        } catch (err) {
            console.error('insertSession error:', err);
        }
    },

    // ── Milestones ────────────────────────────────────────────

    async getMilestones(userId, guildId) {
        try {
            return await Milestone.find({ user_id: userId, guild_id: guildId })
                .select('milestone_hours -_id')
                .lean();
        } catch (err) {
            console.error('getMilestones error:', err);
            return [];
        }
    },

    async insertMilestone(userId, guildId, milestoneHours) {
        try {
            await Milestone.create({ user_id: userId, guild_id: guildId, milestone_hours: milestoneHours });
        } catch (err) {
            // Ignore duplicate key error (code 11000) — same as Supabase 23505
            if (err.code !== 11000) console.error('insertMilestone error:', err);
        }
    },

    // ── Streak Queries ────────────────────────────────────────

    async getTopStreaks(guildId, limit) {
        try {
            return await User.find({ guild_id: guildId, best_streak: { $gt: 0 } })
                .sort({ best_streak: -1 })
                .limit(limit)
                .lean();
        } catch (err) {
            console.error('getTopStreaks error:', err);
            return [];
        }
    },

    // ── Reminder Users ────────────────────────────────────────

    async getReminderUsers(guildId) {
        try {
            return await User.find({ guild_id: guildId, reminders_enabled: 1 }).lean();
        } catch (err) {
            console.error('getReminderUsers error:', err);
            return [];
        }
    },

    async getActiveSessionUsers() {
        try {
            return await User.find({ session_start: { $ne: null } }).lean();
        } catch (err) {
            console.error('getActiveSessionUsers error:', err);
            return [];
        }
    },

    // ── Guild Config ──────────────────────────────────────────

    async getGuildConfig(guildId) {
        try {
            const config = await GuildConfig.findOne({ guild_id: guildId }).lean();
            return config || undefined;
        } catch (err) {
            console.error('getGuildConfig error:', err);
            return undefined;
        }
    },

    async upsertGuildConfig(guildId) {
        try {
            await GuildConfig.findOneAndUpdate(
                { guild_id: guildId },
                { $setOnInsert: { guild_id: guildId } },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error('upsertGuildConfig error:', err);
        }
    },

    async getAllGuilds() {
        try {
            return await GuildConfig.find({}).select('guild_id -_id').lean();
        } catch (err) {
            console.error('getAllGuilds error:', err);
            return [];
        }
    },
};

// ─────────────────────────────────────────────────────────────
// ── Helper: update a single guild_config field
// ─────────────────────────────────────────────────────────────

async function updateGuildConfig(guildId, field, value) {
    const allowed = [
        'announcement_channel', 'achievement_channel', 'study_channels',
        'weekly_champion_role', 'weekly_elite_role', 'weekly_achiever_role',
        'monthly_winner_role', 'prestige_roles', 'milestone_roles',
    ];
    if (!allowed.includes(field)) throw new Error(`Invalid config field: ${field}`);

    try {
        await GuildConfig.findOneAndUpdate(
            { guild_id: guildId },
            { $set: { [field]: value } }
        );
    } catch (err) {
        console.error('updateGuildConfig error:', err);
    }
}

module.exports = { initDB, queries, updateGuildConfig, saveDB };
