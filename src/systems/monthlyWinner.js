const { queries } = require('../database/db');
const { monthlyWinnerEmbed } = require('../utils/embedBuilder');
const { getCurrentMonth } = require('../utils/formatTime');

/**
 * Calculate the monthly winner, assign role, announce, and reset.
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 */
async function processMonthlyWinner(client, guildId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const guildConfig = queries.getGuildConfig(guildId);
        if (!guildConfig) return;

        const topUser = queries.getTopMonthly(guildId);
        if (topUser.length === 0) return;

        const winner = topUser[0];
        const month = getCurrentMonth();

        if (guildConfig.monthly_winner_role) {
            await removeOldMonthlyRole(guild, guildConfig.monthly_winner_role);
        }

        queries.insertMonthlyWinner(
            guildId, winner.user_id,
            parseFloat((winner.monthly_seconds / 3600).toFixed(1)),
            month, JSON.stringify([])
        );

        if (guildConfig.monthly_winner_role) {
            try {
                const member = await guild.members.fetch(winner.user_id);
                await member.roles.add(guildConfig.monthly_winner_role);
            } catch (e) {
                console.error(`[MonthlyWinner] Could not assign role to ${winner.user_id}:`, e.message);
            }
        }

        if (guildConfig.announcement_channel) {
            try {
                const channel = await guild.channels.fetch(guildConfig.announcement_channel);
                if (channel) {
                    const embed = monthlyWinnerEmbed(winner, month, guild);
                    await channel.send({ embeds: [embed] });
                }
            } catch (e) {
                console.error('[MonthlyWinner] Could not send announcement:', e.message);
            }
        }

        queries.resetMonthlyAll(guildId);
        console.log(`[MonthlyWinner] Processed winner for guild ${guildId}: ${winner.user_id}`);
    } catch (error) {
        console.error(`[MonthlyWinner] Error processing guild ${guildId}:`, error);
    }
}

async function removeOldMonthlyRole(guild, roleId) {
    try {
        const role = await guild.roles.fetch(roleId);
        if (!role) return;
        for (const [, member] of role.members) {
            await member.roles.remove(roleId).catch(() => {});
        }
    } catch (e) {
        console.error(`[MonthlyWinner] Could not remove old role:`, e.message);
    }
}

function getMonthlyHistory(guildId, limit = 24) {
    return queries.getMonthlyWinnerHistory(guildId, limit);
}

module.exports = { processMonthlyWinner, getMonthlyHistory };
