const config = require('../config');
const { queries } = require('../database/db');
const { prestigeEmbed } = require('../utils/embedBuilder');

async function checkPrestige(userId, guildId, totalSeconds, client) {
    const totalHours = totalSeconds / 3600;
    const user = await queries.getUser(userId, guildId);
    if (!user) return null;

    let qualifiedTier = null;
    for (const tier of config.PRESTIGE_TIERS) {
        if (totalHours >= tier.hours && tier.level > (user.prestige_level || 0)) {
            qualifiedTier = tier;
        }
    }

    if (!qualifiedTier) return null;

    await queries.updatePrestige(qualifiedTier.level, userId, guildId);

    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const guildConfig = await queries.getGuildConfig(guildId);

        const channelId = guildConfig?.achievement_channel || guildConfig?.announcement_channel;
        if (channelId) {
            const channel = await guild.channels.fetch(channelId);
            if (channel) {
                const embed = prestigeEmbed(member.user, qualifiedTier);
                await channel.send({ embeds: [embed] });
            }
        }

        if (guildConfig?.prestige_roles) {
            try {
                const roles = JSON.parse(guildConfig.prestige_roles);
                const roleId = roles[String(qualifiedTier.level)];
                if (roleId) {
                    await member.roles.add(roleId).catch(() => {});
                }
            } catch (e) { /* skip */ }
        }
    } catch (error) {
        console.error(`[Prestige] Error for ${userId}:`, error.message);
    }

    return qualifiedTier;
} 

function getPrestigeTier(prestigeLevel) {
    return config.PRESTIGE_TIERS.find(t => t.level === prestigeLevel) || null;
}

module.exports = { checkPrestige, getPrestigeTier };
