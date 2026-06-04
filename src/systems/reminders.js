const { queries } = require('../database/db');
const { reminderEmbed } = require('../utils/embedBuilder');
const { getTodayISO } = require('../utils/formatTime');
const { checkStreakRisk } = require('./streaks');

/**
 * Send study reminders to all opted-in users across all guilds.
 * @param {import('discord.js').Client} client
 */
async function sendReminders(client) {
    const guilds = queries.getAllGuilds();
    const today = getTodayISO();

    for (const { guild_id: guildId } of guilds) {
        const users = queries.getReminderUsers(guildId);

        for (const user of users) {
            if (user.last_study_date === today) continue;
            if (user.session_start) continue;

            try {
                const discordUser = await client.users.fetch(user.user_id);
                const streakInfo = checkStreakRisk(user.user_id, guildId);

                let goalProgress = null;
                if (user.goal_hours > 0) {
                    const periodSeconds = {
                        daily: user.daily_seconds,
                        weekly: user.weekly_seconds,
                        monthly: user.monthly_seconds,
                    }[user.goal_period] || user.daily_seconds;

                    goalProgress = {
                        current: periodSeconds / 3600,
                        target: user.goal_hours,
                    };
                }

                const embed = reminderEmbed(
                    discordUser,
                    streakInfo.atRisk ? user.current_streak : 0,
                    goalProgress
                );

                await discordUser.send({ embeds: [embed] }).catch(() => {});
            } catch (error) {
                console.error(`[Reminders] Could not remind ${user.user_id}:`, error.message);
            }
        }
    }

    console.log(`[Reminders] Sent daily reminders at ${new Date().toISOString()}`);
}

module.exports = { sendReminders };
