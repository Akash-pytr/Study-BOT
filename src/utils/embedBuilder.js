const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { formatSeconds, formatHours, progressBar } = require('./formatTime');

/**
 * Build a milestone celebration embed.
 */
function milestoneEmbed(user, milestoneHours, rank, level) {
    return new EmbedBuilder()
        .setColor(config.COLORS.MILESTONE)
        .setTitle('🎉 Study Milestone Reached!')
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
            { name: '👤 User', value: `${user}`, inline: true },
            { name: '🏅 Milestone', value: `**${milestoneHours} Study Hours**`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '📊 Current Rank', value: `#${rank}`, inline: true },
            { name: '⭐ Current Level', value: `${level}`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
        )
        .setFooter({ text: 'Keep up the amazing work! 📚' })
        .setTimestamp();
}

/**
 * Build a weekly winners announcement embed.
 */
function weeklyWinnersEmbed(winners, guild) {
    const emojis = ['🥇', '🥈', '🥉'];
    const titles = ['Weekly Champion', 'Weekly Elite', 'Weekly Achiever'];

    let description = '';
    winners.forEach((w, i) => {
        description += `${emojis[i]} **${titles[i]}** — <@${w.user_id}>\n`;
        description += `   📖 ${formatHours(w.weekly_seconds)} hours studied\n\n`;
    });

    return new EmbedBuilder()
        .setColor(config.COLORS.GOLD)
        .setTitle('🏆 Weekly Study Winners!')
        .setDescription(description || 'No study activity this week.')
        .setThumbnail(guild.iconURL({ size: 128 }))
        .setFooter({ text: `${guild.name} • Weekly Leaderboard` })
        .setTimestamp();
}

/**
 * Build a monthly winner announcement embed.
 */
function monthlyWinnerEmbed(winner, month, guild) {
    return new EmbedBuilder()
        .setColor(config.COLORS.GOLD)
        .setTitle('👑 Student of the Month!')
        .setDescription(`Congratulations to <@${winner.user_id}> for being the top student of **${month}**!`)
        .addFields(
            { name: '📖 Hours Studied', value: formatHours(winner.monthly_seconds), inline: true },
            { name: '⭐ Level', value: `${winner.level}`, inline: true },
            { name: '🏅 Achievements', value: `${winner.achievements_count}`, inline: true },
        )
        .setFooter({ text: `${guild.name} • Student of the Month` })
        .setTimestamp();
}

/**
 * Build a leaderboard embed.
 */
function leaderboardEmbed(users, period, guild, page = 1) {
    const emojis = ['🥇', '🥈', '🥉'];
    const periodField = {
        daily: 'daily_seconds',
        weekly: 'weekly_seconds',
        monthly: 'monthly_seconds',
        alltime: 'total_seconds',
    }[period];

    const periodTitle = {
        daily: "Today's",
        weekly: 'Weekly',
        monthly: 'Monthly',
        alltime: 'All-Time',
    }[period];

    let description = '';
    users.forEach((u, i) => {
        const rank = (page - 1) * 10 + i;
        const emoji = rank < 3 ? emojis[rank] : `\`#${rank + 1}\``;
        description += `${emoji} <@${u.user_id}> — **${formatSeconds(u[periodField])}**\n`;
    });

    return new EmbedBuilder()
        .setColor(config.COLORS.PRIMARY)
        .setTitle(`📊 ${periodTitle} Study Leaderboard`)
        .setDescription(description || 'No study activity yet.')
        .setThumbnail(guild.iconURL({ size: 128 }))
        .setFooter({ text: `${guild.name} • Page ${page}` })
        .setTimestamp();
}

/**
 * Build a study session status embed.
 */
function sessionEmbed(user, action, duration = null) {
    const embed = new EmbedBuilder()
        .setColor(action === 'start' ? config.COLORS.SUCCESS : config.COLORS.PRIMARY)
        .setThumbnail(user.displayAvatarURL({ size: 64 }));

    if (action === 'start') {
        embed.setTitle('📖 Study Session Started!')
             .setDescription(`${user}, your study session has begun. Good luck! 🍀`);
    } else if (action === 'stop') {
        embed.setTitle('✅ Study Session Complete!')
             .setDescription(`${user}, great job!`)
             .addFields({ name: '⏱ Duration', value: formatSeconds(duration), inline: true });
    } else if (action === 'status') {
        embed.setTitle('📚 Active Study Session')
             .setDescription(`${user} has been studying for **${formatSeconds(duration)}**`);
    }

    return embed.setTimestamp();
}

/**
 * Build a prestige unlock embed.
 */
function prestigeEmbed(user, tier) {
    return new EmbedBuilder()
        .setColor(config.COLORS.PRESTIGE)
        .setTitle(`${tier.emoji} Prestige Unlocked!`)
        .setDescription(`${user} has reached **${tier.name} Prestige**!\n\nThis badge is permanent and will be displayed on their profile.`)
        .setTimestamp();
}

/**
 * Build a reminder embed.
 */
function reminderEmbed(user, streak, goalProgress = null) {
    const embed = new EmbedBuilder()
        .setColor(config.COLORS.WARNING)
        .setTitle('📚 Study Reminder')
        .setDescription(`Hey ${user}, you haven't studied today!`);

    if (streak > 0) {
        embed.addFields({
            name: '🔥 Streak at Risk!',
            value: `Your **${streak}-day streak** will be lost if you don't study today!`,
        });
    }

    if (goalProgress !== null) {
        embed.addFields({
            name: '🎯 Goal Progress',
            value: progressBar(goalProgress.current, goalProgress.target),
        });
    }

    return embed.setTimestamp();
}

module.exports = {
    milestoneEmbed,
    weeklyWinnersEmbed,
    monthlyWinnerEmbed,
    leaderboardEmbed,
    sessionEmbed,
    prestigeEmbed,
    reminderEmbed,
};
