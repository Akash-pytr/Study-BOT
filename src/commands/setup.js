const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { queries, updateGuildConfig } = require('../database/db');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure the study bot for this server (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('announcement_channel')
                .setDescription('Set the channel for announcements')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('The announcement channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('achievement_channel')
                .setDescription('Set the channel for milestone/achievement announcements')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('The achievement channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('study_channel')
                .setDescription('Add a voice channel as a study channel (for VC tracking)')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('The voice channel')
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('weekly_roles')
                .setDescription('Set roles for weekly winners')
                .addRoleOption(opt => opt.setName('champion').setDescription('🥇 Weekly Champion role').setRequired(true))
                .addRoleOption(opt => opt.setName('elite').setDescription('🥈 Weekly Elite role').setRequired(true))
                .addRoleOption(opt => opt.setName('achiever').setDescription('🥉 Weekly Achiever role').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('monthly_role')
                .setDescription('Set the Student of the Month role')
                .addRoleOption(opt => opt.setName('role').setDescription('👑 Student of the Month role').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current bot configuration')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        await queries.upsertGuildConfig(guildId);

        if (subcommand === 'announcement_channel') {
            const channel = interaction.options.getChannel('channel');
            await updateGuildConfig(guildId, 'announcement_channel', channel.id);
            return interaction.reply({
                embeds: [successEmbed(`Announcement channel set to ${channel}`)],
                ephemeral: true,
            });
        }

        if (subcommand === 'achievement_channel') {
            const channel = interaction.options.getChannel('channel');
            await updateGuildConfig(guildId, 'achievement_channel', channel.id);
            return interaction.reply({
                embeds: [successEmbed(`Achievement channel set to ${channel}`)],
                ephemeral: true,
            });
        }

        if (subcommand === 'study_channel') {
            const channel = interaction.options.getChannel('channel');
            const guildConfig = await queries.getGuildConfig(guildId);
            let channels = [];
            try {
                channels = JSON.parse(guildConfig?.study_channels || '[]');
            } catch (e) { channels = []; }

            if (!channels.includes(channel.id)) {
                channels.push(channel.id);
            }

            await updateGuildConfig(guildId, 'study_channels', JSON.stringify(channels));
            return interaction.reply({
                embeds: [successEmbed(`Added ${channel} as a study voice channel.\nTotal study channels: ${channels.length}`)],
                ephemeral: true,
            });
        }

        if (subcommand === 'weekly_roles') {
            const champion = interaction.options.getRole('champion');
            const elite = interaction.options.getRole('elite');
            const achiever = interaction.options.getRole('achiever');

            // Optimized: parallel DB calls instead of 3 sequential calls
            await Promise.all([
                updateGuildConfig(guildId, 'weekly_champion_role', champion.id),
                updateGuildConfig(guildId, 'weekly_elite_role', elite.id),
                updateGuildConfig(guildId, 'weekly_achiever_role', achiever.id),
            ]);
            return interaction.reply({
                embeds: [successEmbed(`Weekly roles set:\n🥇 Champion: ${champion}\n🥈 Elite: ${elite}\n🥉 Achiever: ${achiever}`)],
                ephemeral: true,
            });
        }

        if (subcommand === 'monthly_role') {
            const role = interaction.options.getRole('role');
            await updateGuildConfig(guildId, 'monthly_winner_role', role.id);
            return interaction.reply({
                embeds: [successEmbed(`Student of the Month role set to ${role}`)],
                ephemeral: true,
            });
        }

        if (subcommand === 'view') {
            const cfg = await queries.getGuildConfig(guildId);

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.PRIMARY)
                .setTitle('⚙️ Study Bot Configuration')
                .addFields(
                    { name: '📢 Announcement Channel', value: cfg?.announcement_channel ? `<#${cfg.announcement_channel}>` : 'Not set', inline: true },
                    { name: '🏅 Achievement Channel', value: cfg?.achievement_channel ? `<#${cfg.achievement_channel}>` : 'Not set', inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: '🎙 Study Voice Channels', value: formatStudyChannels(cfg?.study_channels), inline: false },
                    { name: '🥇 Weekly Champion Role', value: cfg?.weekly_champion_role ? `<@&${cfg.weekly_champion_role}>` : 'Not set', inline: true },
                    { name: '🥈 Weekly Elite Role', value: cfg?.weekly_elite_role ? `<@&${cfg.weekly_elite_role}>` : 'Not set', inline: true },
                    { name: '🥉 Weekly Achiever Role', value: cfg?.weekly_achiever_role ? `<@&${cfg.weekly_achiever_role}>` : 'Not set', inline: true },
                    { name: '👑 Monthly Winner Role', value: cfg?.monthly_winner_role ? `<@&${cfg.monthly_winner_role}>` : 'Not set', inline: true },
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};

function successEmbed(message) {
    return new EmbedBuilder()
        .setColor(config.COLORS.SUCCESS)
        .setTitle('✅ Configuration Updated')
        .setDescription(message)
        .setTimestamp();
}

function formatStudyChannels(json) {
    try {
        const channels = JSON.parse(json || '[]');
        if (channels.length === 0) return 'None configured (all VCs will be tracked)';
        return channels.map(id => `<#${id}>`).join(', ');
    } catch {
        return 'None configured';
    }
}
