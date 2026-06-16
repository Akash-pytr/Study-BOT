const config = require('../config');
const { queries } = require('../database/db');
const { milestoneEmbed } = require('../utils/embedBuilder');

async function checkMilestones(userId, guildId, totalSeconds, client) {
    const totalHours = totalSeconds / 3600;
    const dbMilestones = await queries.getMilestones(userId, guildId);
    const achieved = dbMilestones.map(m => m.milestone_hours);
    const newMilestones = [];

    for (const threshold of config.MILESTONES) {
        if (totalHours >= threshold && !achieved.includes(threshold)) {
            await queries.insertMilestone(userId, guildId, threshold);
            await queries.incrementAchievements(userId, guildId);
            newMilestones.push(threshold);
            await announceMilestone(userId, guildId, threshold, client);
        }
    }

    return newMilestones;
}

async function announceMilestone(userId, guildId, milestoneHours, client) {
    try {
        const guildConfig = await queries.getGuildConfig(guildId);
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const user = await queries.getUser(userId, guildId);

        const rankResult = await queries.getUserRank(guildId, userId);
        const rank = rankResult?.rank || '?';

        const channelId = guildConfig?.achievement_channel || guildConfig?.announcement_channel;
        if (channelId) {
            const channel = await guild.channels.fetch(channelId);
            if (channel) {
                const embed = milestoneEmbed(member.user, milestoneHours, rank, user?.level || 0);
                await channel.send({ embeds: [embed] });
            }
        }

        if (guildConfig?.milestone_roles) {
            try {
                const milestoneRoles = JSON.parse(guildConfig.milestone_roles);
                const roleId = milestoneRoles[String(milestoneHours)];
                if (roleId) {
                    await member.roles.add(roleId).catch(() => {});
                }
            } catch (e) { /* skip */ }
        }
    } catch (error) {
        console.error(`[Milestones] Error announcing milestone for ${userId}:`, error.message);
    }
}

module.exports = { checkMilestones };
