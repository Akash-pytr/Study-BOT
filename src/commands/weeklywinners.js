const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getWeeklyHistory } = require('../systems/weeklyWinner');
const { queries } = require('../database/db');
const config = require('../config');
const { formatSeconds } = require('../utils/formatTime');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weeklywinners')
        .setDescription('View current and past weekly study winners'),

    async execute(interaction) {
        const guildId = interaction.guildId;

        const currentTop3 = queries.getTopWeekly(guildId);
        const history = getWeeklyHistory(guildId, 15);

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.GOLD)
            .setTitle('🏆 Weekly Study Winners')
            .setThumbnail(interaction.guild.iconURL({ size: 128 }))
            .setTimestamp();

        if (currentTop3.length > 0) {
            const emojis = ['🥇', '🥈', '🥉'];
            let currentDesc = '';
            currentTop3.forEach((u, i) => {
                currentDesc += `${emojis[i]} <@${u.user_id}> — **${formatSeconds(u.weekly_seconds)}**\n`;
            });
            embed.addFields({ name: '📊 This Week (Live)', value: currentDesc });
        } else {
            embed.addFields({ name: '📊 This Week (Live)', value: 'No study activity yet this week.' });
        }

        if (history.length > 0) {
            const weeks = new Map();
            for (const w of history) {
                const key = `${w.week_start} → ${w.week_end}`;
                if (!weeks.has(key)) weeks.set(key, []);
                weeks.get(key).push(w);
            }

            let pastDesc = '';
            let count = 0;
            for (const [weekRange, winners] of weeks) {
                if (count >= 4) break;
                pastDesc += `**${weekRange}**\n`;
                const emojis = ['🥇', '🥈', '🥉'];
                winners.forEach(w => {
                    pastDesc += `${emojis[w.rank - 1] || '•'} <@${w.user_id}> — ${w.hours}h\n`;
                });
                pastDesc += '\n';
                count++;
            }
            embed.addFields({ name: '📜 Past Winners', value: pastDesc.trim() || 'No history yet.' });
        }

        embed.setFooter({ text: `${interaction.guild.name} • Weekly Champions` });
        return interaction.reply({ embeds: [embed] });
    },
};
