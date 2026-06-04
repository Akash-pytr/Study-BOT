const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { queries } = require('../database/db');
const config = require('../config');
const { formatSeconds, getCurrentMonth } = require('../utils/formatTime');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('monthlywinner')
        .setDescription('View the current Student of the Month'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const month = getCurrentMonth();

        const topUser = queries.getTopMonthly(guildId);

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.GOLD)
            .setTitle('👑 Student of the Month')
            .setThumbnail(interaction.guild.iconURL({ size: 128 }))
            .setTimestamp()
            .setFooter({ text: `${interaction.guild.name} • ${month}` });

        if (topUser.length > 0) {
            const winner = topUser[0];
            embed.setDescription(`The current leader for **${month}** is:`);
            embed.addFields(
                { name: '👤 Student', value: `<@${winner.user_id}>`, inline: true },
                { name: '📖 Hours Studied', value: formatSeconds(winner.monthly_seconds), inline: true },
                { name: '⭐ Level', value: `${winner.level}`, inline: true },
            );
        } else {
            embed.setDescription('No study activity this month yet. Be the first to study!');
        }

        return interaction.reply({ embeds: [embed] });
    },
};
