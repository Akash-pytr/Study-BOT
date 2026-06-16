const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL or Key is missing in .env file!');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

async function initDB() {
    console.log('✅ Connected to Supabase');
}

function saveDB() {
    // No-op for Supabase
}

const queries = {
    // ── User Operations ──
    async getUser(userId, guildId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .eq('guild_id', guildId)
            .single();
        if (error && error.code !== 'PGRST116') console.error('getUser error:', error);
        return data || undefined;
    },

    async upsertUser(userId, guildId) {
        const { error } = await supabase
            .from('users')
            .upsert({ user_id: userId, guild_id: guildId }, { onConflict: 'user_id, guild_id', ignoreDuplicates: true });
        if (error) console.error('upsertUser error:', error);
    },

    async updateStudyTime(duration, today, userId, guildId) {
        const { error } = await supabase.rpc('update_study_time', {
            p_duration: duration,
            p_today: today,
            p_user_id: userId,
            p_guild_id: guildId
        });
        if (error) console.error('updateStudyTime error:', error);
    },

    async updateXPLevel(xp, level, userId, guildId) {
        const { error } = await supabase
            .from('users')
            .update({ xp, level })
            .eq('user_id', userId)
            .eq('guild_id', guildId);
        if (error) console.error('updateXPLevel error:', error);
    },

    async updateStreak(currentStreak, bestStreak, userId, guildId) {
        const { error } = await supabase
            .from('users')
            .update({ current_streak: currentStreak, best_streak: bestStreak })
            .eq('user_id', userId)
            .eq('guild_id', guildId);
        if (error) console.error('updateStreak error:', error);
    },

    async setSessionStart(timestamp, userId, guildId) {
        const { error } = await supabase
            .from('users')
            .update({ session_start: timestamp })
            .eq('user_id', userId)
            .eq('guild_id', guildId);
        if (error) console.error('setSessionStart error:', error);
    },

    async clearSession(userId, guildId) {
        const { error } = await supabase
            .from('users')
            .update({ session_start: null })
            .eq('user_id', userId)
            .eq('guild_id', guildId);
        if (error) console.error('clearSession error:', error);
    },

    async setGoal(hours, period, userId, guildId) {
        const { error } = await supabase
            .from('users')
            .update({ goal_hours: hours, goal_period: period })
            .eq('user_id', userId)
            .eq('guild_id', guildId);
        if (error) console.error('setGoal error:', error);
    },

    async setReminders(enabled, userId, guildId) {
        const { error } = await supabase
            .from('users')
            .update({ reminders_enabled: enabled })
            .eq('user_id', userId)
            .eq('guild_id', guildId);
        if (error) console.error('setReminders error:', error);
    },

    async updatePrestige(level, userId, guildId) {
        const { error } = await supabase
            .from('users')
            .update({ prestige_level: level })
            .eq('user_id', userId)
            .eq('guild_id', guildId);
        if (error) console.error('updatePrestige error:', error);
    },

    async incrementAchievements(userId, guildId) {
        const { error } = await supabase.rpc('increment_achievements', {
            p_user_id: userId,
            p_guild_id: guildId
        });
        if (error) console.error('incrementAchievements error:', error);
    },

    // ── Leaderboard Queries ──
    async getLeaderboardDaily(guildId, limit) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('guild_id', guildId)
            .gt('daily_seconds', 0)
            .order('daily_seconds', { ascending: false })
            .limit(limit);
        if (error) console.error('getLeaderboardDaily error:', error);
        return data || [];
    },

    async getLeaderboardWeekly(guildId, limit) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('guild_id', guildId)
            .gt('weekly_seconds', 0)
            .order('weekly_seconds', { ascending: false })
            .limit(limit);
        if (error) console.error('getLeaderboardWeekly error:', error);
        return data || [];
    },

    async getLeaderboardMonthly(guildId, limit) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('guild_id', guildId)
            .gt('monthly_seconds', 0)
            .order('monthly_seconds', { ascending: false })
            .limit(limit);
        if (error) console.error('getLeaderboardMonthly error:', error);
        return data || [];
    },

    async getLeaderboardAllTime(guildId, limit) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('guild_id', guildId)
            .gt('total_seconds', 0)
            .order('total_seconds', { ascending: false })
            .limit(limit);
        if (error) console.error('getLeaderboardAllTime error:', error);
        return data || [];
    },

    async getUserRank(guildId, userId) {
        // Need to fetch user's total_seconds first
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('total_seconds')
            .eq('user_id', userId)
            .eq('guild_id', guildId)
            .single();
            
        if (userError && userError.code !== 'PGRST116') console.error('getUserRank user fetch error:', userError);
        
        const totalSeconds = userData ? userData.total_seconds || 0 : 0;
        
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('guild_id', guildId)
            .gt('total_seconds', totalSeconds);
            
        if (error) console.error('getUserRank count error:', error);
        return { rank: (count || 0) + 1 };
    },

    // ── Weekly/Monthly Winners ──
    async getTopWeekly(guildId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('guild_id', guildId)
            .gt('weekly_seconds', 0)
            .order('weekly_seconds', { ascending: false })
            .limit(3);
        if (error) console.error('getTopWeekly error:', error);
        return data || [];
    },

    async getTopMonthly(guildId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('guild_id', guildId)
            .gt('monthly_seconds', 0)
            .order('monthly_seconds', { ascending: false })
            .limit(1);
        if (error) console.error('getTopMonthly error:', error);
        return data || [];
    },

    async insertWeeklyWinner(guildId, userId, rank, hours, weekStart, weekEnd) {
        const { error } = await supabase
            .from('weekly_winners')
            .insert({ guild_id: guildId, user_id: userId, rank, hours, week_start: weekStart, week_end: weekEnd });
        if (error) console.error('insertWeeklyWinner error:', error);
    },

    async insertMonthlyWinner(guildId, userId, hours, month, achievements) {
        const { error } = await supabase
            .from('monthly_winners')
            .insert({ guild_id: guildId, user_id: userId, hours, month, achievements });
        if (error) console.error('insertMonthlyWinner error:', error);
    },

    async getWeeklyWinnerHistory(guildId, limit) {
        const { data, error } = await supabase
            .from('weekly_winners')
            .select('*')
            .eq('guild_id', guildId)
            .order('week_start', { ascending: false })
            .limit(limit);
        if (error) console.error('getWeeklyWinnerHistory error:', error);
        return data || [];
    },

    async getMonthlyWinnerHistory(guildId, limit) {
        const { data, error } = await supabase
            .from('monthly_winners')
            .select('*')
            .eq('guild_id', guildId)
            .order('month', { ascending: false })
            .limit(limit);
        if (error) console.error('getMonthlyWinnerHistory error:', error);
        return data || [];
    },

    // ── Resets ──
    async resetDailyAll(guildId) {
        const { error } = await supabase
            .from('users')
            .update({ daily_seconds: 0 })
            .eq('guild_id', guildId);
        if (error) console.error('resetDailyAll error:', error);
    },

    async resetWeeklyAll(guildId) {
        const { error } = await supabase
            .from('users')
            .update({ weekly_seconds: 0 })
            .eq('guild_id', guildId);
        if (error) console.error('resetWeeklyAll error:', error);
    },

    async resetMonthlyAll(guildId) {
        const { error } = await supabase
            .from('users')
            .update({ monthly_seconds: 0 })
            .eq('guild_id', guildId);
        if (error) console.error('resetMonthlyAll error:', error);
    },

    // ── Sessions ──
    async insertSession(userId, guildId, startTime, endTime, duration, date) {
        const { error } = await supabase
            .from('study_sessions')
            .insert({ user_id: userId, guild_id: guildId, start_time: startTime, end_time: endTime, duration_seconds: duration, date });
        if (error) console.error('insertSession error:', error);
    },

    // ── Milestones ──
    async getMilestones(userId, guildId) {
        const { data, error } = await supabase
            .from('milestones')
            .select('milestone_hours')
            .eq('user_id', userId)
            .eq('guild_id', guildId);
        if (error) console.error('getMilestones error:', error);
        return data || [];
    },

    async insertMilestone(userId, guildId, milestoneHours) {
        const { error } = await supabase
            .from('milestones')
            .insert({ user_id: userId, guild_id: guildId, milestone_hours: milestoneHours });
        if (error && error.code !== '23505') console.error('insertMilestone error:', error); // ignore unique violation
    },

    // ── Streak Queries ──
    async getTopStreaks(guildId, limit) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('guild_id', guildId)
            .gt('best_streak', 0)
            .order('best_streak', { ascending: false })
            .limit(limit);
        if (error) console.error('getTopStreaks error:', error);
        return data || [];
    },

    // ── Reminder Users ──
    async getReminderUsers(guildId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('guild_id', guildId)
            .eq('reminders_enabled', 1);
        if (error) console.error('getReminderUsers error:', error);
        return data || [];
    },

    async getActiveSessionUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .not('session_start', 'is', null);
        if (error) console.error('getActiveSessionUsers error:', error);
        return data || [];
    },

    // ── Guild Config ──
    async getGuildConfig(guildId) {
        const { data, error } = await supabase
            .from('guild_config')
            .select('*')
            .eq('guild_id', guildId)
            .single();
        if (error && error.code !== 'PGRST116') console.error('getGuildConfig error:', error);
        return data || undefined;
    },

    async upsertGuildConfig(guildId) {
        const { error } = await supabase
            .from('guild_config')
            .upsert({ guild_id: guildId }, { onConflict: 'guild_id', ignoreDuplicates: true });
        if (error) console.error('upsertGuildConfig error:', error);
    },

    async getAllGuilds() {
        const { data, error } = await supabase
            .from('guild_config')
            .select('guild_id');
        if (error) console.error('getAllGuilds error:', error);
        return data || [];
    },
};

// ─── Helper to update a single guild_config field ──────────
async function updateGuildConfig(guildId, field, value) {
    const allowed = [
        'announcement_channel', 'achievement_channel', 'study_channels',
        'weekly_champion_role', 'weekly_elite_role', 'weekly_achiever_role',
        'monthly_winner_role', 'prestige_roles', 'milestone_roles',
    ];
    if (!allowed.includes(field)) throw new Error(`Invalid config field: ${field}`);
    
    const { error } = await supabase
        .from('guild_config')
        .update({ [field]: value })
        .eq('guild_id', guildId);
    if (error) console.error('updateGuildConfig error:', error);
}

module.exports = { initDB, queries, updateGuildConfig, saveDB };
