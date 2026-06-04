const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMonthlyHistory } = require('../systems/monthlyWinner');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('monthlyhistory')
        .setDescription('View the history of all Students of the Month'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const history = getMonthlyHistory(guildId, 12);

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.GOLD)
            .setTitle('📜 Student of the Month — History')
            .setThumbnail(interaction.guild.iconURL({ size: 128 }))
            .setTimestamp()
            .setFooter({ text: `${interaction.guild.name} • Monthly Winners` });

        if (history.length === 0) {
            embed.setDescription('No monthly winners recorded yet.');
        } else {
            let description = '';
            history.forEach(w => {
                description += `👑 **${w.month}** — <@${w.user_id}> — ${w.hours}h\n`;
            });
            embed.setDescription(description);
        }

        return interaction.reply({ embeds: [embed] });
    },
};
