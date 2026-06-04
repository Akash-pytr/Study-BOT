const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { queries } = require('../database/db');
const { getWeeklyHistory } = require('../systems/weeklyWinner');
const { getMonthlyHistory } = require('../systems/monthlyWinner');
const config = require('../config');
const { formatSeconds } = require('../utils/formatTime');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('halloffame')
        .setDescription('View the server\'s Hall of Fame — best students of all time'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const guild = interaction.guild;

        const allTimeTop = queries.getLeaderboardAllTime(guildId, 10);
        const topStreaks = queries.getTopStreaks(guildId, 5);
        const monthlyHistory = getMonthlyHistory(guildId, 6);
        const weeklyHistory = getWeeklyHistory(guildId, 30)
            .filter(w => w.rank === 1)
            .slice(0, 6);

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.GOLD)
            .setTitle('🏆 Hall of Fame')
            .setThumbnail(guild.iconURL({ size: 128 }))
            .setTimestamp()
            .setFooter({ text: `${guild.name} • Permanent Record` });

        if (allTimeTop.length > 0) {
            const emojis = ['🥇', '🥈', '🥉'];
            let desc = '';
            allTimeTop.forEach((u, i) => {
                const badge = i < 3 ? emojis[i] : `\`#${i + 1}\``;
                desc += `${badge} <@${u.user_id}> — **${formatSeconds(u.total_seconds)}**\n`;
            });
            embed.addFields({ name: '📊 All-Time Top 10 — Most Study Hours', value: desc });
        } else {
            embed.addFields({ name: '📊 All-Time Top 10', value: 'No data yet.' });
        }

        if (monthlyHistory.length > 0) {
            let desc = '';
            monthlyHistory.forEach(w => {
                desc += `👑 **${w.month}** — <@${w.user_id}> (${w.hours}h)\n`;
            });
            embed.addFields({ name: '👑 Student of the Month Winners', value: desc });
        }

        if (weeklyHistory.length > 0) {
            let desc = '';
            weeklyHistory.forEach(w => {
                desc += `🥇 **${w.week_start}** — <@${w.user_id}> (${w.hours}h)\n`;
            });
            embed.addFields({ name: '🏅 Weekly Champions', value: desc });
        }

        if (topStreaks.length > 0) {
            let desc = '';
            topStreaks.forEach((u, i) => {
                const emojis = ['🔥', '🔥', '🔥', '💪', '💪'];
                desc += `${emojis[i]} <@${u.user_id}> — **${u.best_streak} days**\n`;
            });
            embed.addFields({ name: '🔥 Highest Study Streaks', value: desc });
        }

        return interaction.reply({ embeds: [embed] });
    },
};
