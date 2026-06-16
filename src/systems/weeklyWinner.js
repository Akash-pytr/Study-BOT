const { queries } = require('../database/db');
const { weeklyWinnersEmbed } = require('../utils/embedBuilder');
const { getWeekStartISO, getWeekEndISO } = require('../utils/formatTime');

async function processWeeklyWinners(client, guildId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const guildConfig = await queries.getGuildConfig(guildId);
        if (!guildConfig) return;

        const top3 = await queries.getTopWeekly(guildId);
        if (top3.length === 0) return;

        const weekStart = getWeekStartISO();
        const weekEnd = getWeekEndISO();
        const roleIds = [
            guildConfig.weekly_champion_role,
            guildConfig.weekly_elite_role,
            guildConfig.weekly_achiever_role,
        ];

        await removeOldWeeklyRoles(guild, roleIds);

        for (let i = 0; i < top3.length; i++) {
            const winner = top3[i];
            const rank = i + 1;

            await queries.insertWeeklyWinner(
                guildId, winner.user_id, rank,
                parseFloat((winner.weekly_seconds / 3600).toFixed(1)),
                weekStart, weekEnd
            );

            if (roleIds[i]) {
                try {
                    const member = await guild.members.fetch(winner.user_id);
                    await member.roles.add(roleIds[i]);
                } catch (e) {
                    console.error(`[WeeklyWinner] Could not assign role to ${winner.user_id}:`, e.message);
                }
            }
        }

        if (guildConfig.announcement_channel) {
            try {
                const channel = await guild.channels.fetch(guildConfig.announcement_channel);
                if (channel) {
                    const embed = weeklyWinnersEmbed(top3, guild);
                    await channel.send({ embeds: [embed] });
                }
            } catch (e) {
                console.error('[WeeklyWinner] Could not send announcement:', e.message);
            }
        }

        await queries.resetWeeklyAll(guildId);
        console.log(`[WeeklyWinner] Processed winners for guild ${guildId}`);
    } catch (error) {
        console.error(`[WeeklyWinner] Error processing guild ${guildId}:`, error);
    }
}

async function removeOldWeeklyRoles(guild, roleIds) {
    for (const roleId of roleIds) {
        if (!roleId) continue;
        try {
            const role = await guild.roles.fetch(roleId);
            if (!role) continue;
            for (const [, member] of role.members) {
                await member.roles.remove(roleId).catch(() => {});
            }
        } catch (e) {
            console.error(`[WeeklyWinner] Could not remove role ${roleId}:`, e.message);
        }
    }
}

async function getWeeklyHistory(guildId, limit = 30) {
    return await queries.getWeeklyWinnerHistory(guildId, limit);
}

module.exports = { processWeeklyWinners, getWeeklyHistory };
