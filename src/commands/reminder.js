const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { queries } = require('../database/db');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Manage your study reminders')
        .addSubcommand(sub =>
            sub.setName('enable').setDescription('Enable daily study reminders via DM')
        )
        .addSubcommand(sub =>
            sub.setName('disable').setDescription('Disable study reminders')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        queries.upsertUser(userId, guildId);

        if (subcommand === 'enable') {
            queries.setReminders(1, userId, guildId);

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.SUCCESS)
                .setTitle('🔔 Reminders Enabled')
                .setDescription('You will now receive daily study reminders via DM.\n\nReminders include:\n• 📚 Daily study reminder\n• 🔥 Streak protection alerts\n• 🎯 Goal progress updates')
                .setFooter({ text: 'Use /reminder disable to turn off' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'disable') {
            queries.setReminders(0, userId, guildId);

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR)
                .setTitle('🔕 Reminders Disabled')
                .setDescription('You will no longer receive study reminders.\n\nUse `/reminder enable` to turn them back on anytime.')
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
