const { PermissionFlagsBits } = require('discord.js');

/**
 * Check if a member has administrator permissions.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function isAdmin(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Check if the bot can manage roles in a guild.
 * @param {import('discord.js').Guild} guild
 * @returns {boolean}
 */
function canManageRoles(guild) {
    return guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles);
}

/**
 * Check if the bot's highest role is above a target role.
 * @param {import('discord.js').Guild} guild
 * @param {string} roleId
 * @returns {boolean}
 */
function canAssignRole(guild, roleId) {
    const role = guild.roles.cache.get(roleId);
    if (!role) return false;
    const botHighest = guild.members.me.roles.highest;
    return botHighest.position > role.position;
}

module.exports = { isAdmin, canManageRoles, canAssignRole };
