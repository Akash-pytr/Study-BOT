const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { queries } = require('../database/db');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setgoal')
        .setDescription('Set a study hour goal')
        .addNumberOption(option =>
            option.setName('hours')
                .setDescription('Number of hours for your goal')
                .setRequired(true)
                .setMinValue(0.5)
                .setMaxValue(24)
        )
        .addStringOption(option =>
            option.setName('period')
                .setDescription('Goal period (default: daily)')
                .setRequired(false)
                .addChoices(
                    { name: '📅 Daily', value: 'daily' },
                    { name: '📆 Weekly', value: 'weekly' },
                    { name: '🗓 Monthly', value: 'monthly' },
                )
        ),

    async execute(interaction) {
        const hours = interaction.options.getNumber('hours');
        const period = interaction.options.getString('period') || 'daily';
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        queries.upsertUser(userId, guildId);
        queries.setGoal(hours, period, userId, guildId);

        const periodLabels = {
            daily: '📅 Daily',
            weekly: '📆 Weekly',
            monthly: '🗓 Monthly',
        };

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.SUCCESS)
            .setTitle('🎯 Study Goal Set!')
            .addFields(
                { name: 'Goal', value: `**${hours} hours**`, inline: true },
                { name: 'Period', value: periodLabels[period], inline: true },
            )
            .setDescription('Your goal will be tracked and displayed on your study profile.\nEnable `/reminder enable` to get progress updates!')
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
