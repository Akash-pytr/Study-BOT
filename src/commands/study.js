const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { queries } = require('../database/db');
const { getTodayISO, formatSeconds } = require('../utils/formatTime');
const { sessionEmbed } = require('../utils/embedBuilder');
const { addXP } = require('../systems/xpLevels');
const { updateStreak } = require('../systems/streaks');
const { checkMilestones } = require('../systems/milestones');
const { checkPrestige } = require('../systems/prestige');
const config = require('../config');

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

        await queries.upsertUser(userId, guildId);
        const user = await queries.getUser(userId, guildId);

        if (subcommand === 'start') {
            if (user?.session_start) {
                const elapsed = Math.floor(Date.now() / 1000) - user.session_start;
                return interaction.reply({
                    content: `⚠️ You already have an active session! (${Math.floor(elapsed / 60)} minutes elapsed)\nUse \`/study stop\` to end it first.`,
                    ephemeral: true,
                });
            }

            const member = interaction.member;
            const voiceChannel = member?.voice?.channel;

            if (!voiceChannel) {
                return interaction.reply({
                    content: '⚠️ Pehle kisi voice channel mein join karo!\nStudy session tabhi start hoga jab tum VC mein ho.',
                    ephemeral: true,
                });
            }

            await queries.setSessionStart(Math.floor(Date.now() / 1000), userId, guildId);

            const embed = sessionEmbed(interaction.user, 'start');

            embed.addFields({
                name: '🎙️ Voice Channel',
                value: `${voiceChannel}`,
                inline: true,
            });

            const allActive = await queries.getActiveSessionUsers();
            const activeUsers = allActive.filter(u => u.guild_id === guildId);
            if (activeUsers.length > 1) {
                const studiersList = activeUsers
                    .filter(u => u.user_id !== userId)
                    .slice(0, 5)
                    .map(u => `<@${u.user_id}>`)
                    .join(', ');
                if (studiersList) {
                    embed.addFields({
                        name: '📚 Currently Studying',
                        value: studiersList,
                        inline: true,
                    });
                }
            }

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'stop') {
            if (!user?.session_start) {
                return interaction.reply({
                    content: '⚠️ You don\'t have an active study session.\nUse `/study start` to begin one!',
                    ephemeral: true,
                });
            }

            await interaction.deferReply();

            const endTime = Math.floor(Date.now() / 1000);
            const duration = endTime - user.session_start;
            const today = getTodayISO();

            await queries.insertSession(userId, guildId, user.session_start, endTime, duration, today);
            await queries.updateStudyTime(duration, today, userId, guildId);
            await queries.clearSession(userId, guildId);

            const minutes = duration / 60;
            const xpResult = await addXP(userId, guildId, minutes);
            const streakResult = await updateStreak(userId, guildId);

            const updatedUser = await queries.getUser(userId, guildId);
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

            if (streakResult?.isNew && streakResult.currentStreak > 1) {
                embed.addFields({
                    name: '🔥 Streak',
                    value: `${streakResult.currentStreak} days!`,
                    inline: true,
                });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'status') {
            const allActive = await queries.getActiveSessionUsers();
            
            if (!user?.session_start) {
                const guildActive = allActive.filter(u => u.guild_id === guildId);

                if (guildActive.length === 0) {
                    return interaction.reply({
                        content: '📚 No one is currently studying in this server.\nUse `/study start` to begin a session!',
                        ephemeral: true,
                    });
                }

                const now = Math.floor(Date.now() / 1000);
                const embed = new EmbedBuilder()
                    .setColor(config.COLORS.PRIMARY)
                    .setTitle('📚 Currently Studying')
                    .setDescription(
                        guildActive.map(u => {
                            const elapsed = u.session_start ? now - u.session_start : 0;
                            return `<@${u.user_id}> — **${formatSeconds(elapsed)}**`;
                        }).join('\n')
                    )
                    .setFooter({ text: 'Use /study start to join them!' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const elapsed = Math.floor(Date.now() / 1000) - user.session_start;
            const embed = sessionEmbed(interaction.user, 'status', elapsed);

            const guildActive = allActive.filter(u => u.guild_id === guildId && u.user_id !== userId);
            if (guildActive.length > 0) {
                const now = Math.floor(Date.now() / 1000);
                embed.addFields({
                    name: '👥 Also Studying',
                    value: guildActive
                        .slice(0, 5)
                        .map(u => {
                            const t = u.session_start ? now - u.session_start : 0;
                            return `<@${u.user_id}> — ${formatSeconds(t)}`;
                        })
                        .join('\n'),
                });
            }

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
