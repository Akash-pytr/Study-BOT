const { SlashCommandBuilder } = require('discord.js');
const { queries } = require('../database/db');
const { getTodayISO } = require('../utils/formatTime');
const { sessionEmbed } = require('../utils/embedBuilder');
const { addXP } = require('../systems/xpLevels');
const { updateStreak } = require('../systems/streaks');
const { checkMilestones } = require('../systems/milestones');
const { checkPrestige } = require('../systems/prestige');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('study')
        .setDescription('Manage your study sessions')
        .addSubcommand(sub =>
            sub.setName('start').setDescription('Start a study session')
        )
        .addSubcommand(sub =>
            sub.setName('stop').setDescription('Stop your current study session')
        )
        .addSubcommand(sub =>
            sub.setName('status').setDescription('Check your current study session status')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        queries.upsertUser(userId, guildId);
        const user = queries.getUser(userId, guildId);

        if (subcommand === 'start') {
            if (user.session_start) {
                const elapsed = Math.floor(Date.now() / 1000) - user.session_start;
                return interaction.reply({
                    content: `⚠️ You already have an active session! (${Math.floor(elapsed / 60)} minutes elapsed)\nUse \`/study stop\` to end it first.`,
                    ephemeral: true,
                });
            }

            queries.setSessionStart(Math.floor(Date.now() / 1000), userId, guildId);
            const embed = sessionEmbed(interaction.user, 'start');
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'stop') {
            if (!user.session_start) {
                return interaction.reply({
                    content: '⚠️ You don\'t have an active study session.\nUse `/study start` to begin one!',
                    ephemeral: true,
                });
            }

            await interaction.deferReply();

            const endTime = Math.floor(Date.now() / 1000);
            const duration = endTime - user.session_start;
            const today = getTodayISO();

            queries.insertSession(userId, guildId, user.session_start, endTime, duration, today);
            queries.updateStudyTime(duration, today, userId, guildId);
            queries.clearSession(userId, guildId);

            const minutes = duration / 60;
            const xpResult = addXP(userId, guildId, minutes);
            const streakResult = updateStreak(userId, guildId);

            const updatedUser = queries.getUser(userId, guildId);
            await checkMilestones(userId, guildId, updatedUser.total_seconds, interaction.client);
            await checkPrestige(userId, guildId, updatedUser.total_seconds, interaction.client);

            const embed = sessionEmbed(interaction.user, 'stop', duration);

            if (xpResult?.leveledUp) {
                embed.addFields({
                    name: '🎉 Level Up!',
                    value: `Level ${xpResult.oldLevel} → **Level ${xpResult.level}**`,
                    inline: true,
                });
            }

            if (streakResult.isNew && streakResult.currentStreak > 1) {
                embed.addFields({
                    name: '🔥 Streak',
                    value: `${streakResult.currentStreak} days!`,
                    inline: true,
                });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'status') {
            if (!user.session_start) {
                return interaction.reply({
                    content: '📚 You don\'t have an active study session.\nUse `/study start` to begin one!',
                    ephemeral: true,
                });
            }

            const elapsed = Math.floor(Date.now() / 1000) - user.session_start;
            const embed = sessionEmbed(interaction.user, 'status', elapsed);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
