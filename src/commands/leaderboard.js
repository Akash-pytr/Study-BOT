const { SlashCommandBuilder } = require('discord.js');
const { queries } = require('../database/db');
const { leaderboardEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the study leaderboard')
        .addStringOption(option =>
            option.setName('period')
                .setDescription('Time period for the leaderboard')
                .setRequired(false)
                .addChoices(
                    { name: '📅 Today', value: 'daily' },
                    { name: '📆 This Week', value: 'weekly' },
                    { name: '🗓 This Month', value: 'monthly' },
                    { name: '🏆 All Time', value: 'alltime' },
                )
        ),

    async execute(interaction) {
        const period = interaction.options.getString('period') || 'weekly';
        const guildId = interaction.guildId;

        const queryMap = {
            daily: () => queries.getLeaderboardDaily(guildId, 10),
            weekly: () => queries.getLeaderboardWeekly(guildId, 10),
            monthly: () => queries.getLeaderboardMonthly(guildId, 10),
            alltime: () => queries.getLeaderboardAllTime(guildId, 10),
        };

        const users = queryMap[period]();
        const embed = leaderboardEmbed(users, period, interaction.guild);

        return interaction.reply({ embeds: [embed] });
    },
};
