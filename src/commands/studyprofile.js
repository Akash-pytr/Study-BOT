const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { queries } = require('../database/db');
const { generateProfileCard } = require('../canvas/profileCard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('studyprofile')
        .setDescription('View a study profile card')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to view (defaults to you)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guildId;

        queries.upsertUser(targetUser.id, guildId);
        const dbUser = queries.getUser(targetUser.id, guildId);

        if (!dbUser) {
            return interaction.editReply({ content: '❌ User data not found.' });
        }

        const rankResult = queries.getUserRank(guildId, targetUser.id);
        const rank = rankResult?.rank || 0;

        try {
            const imageBuffer = await generateProfileCard({
                user: targetUser,
                dbUser,
                rank,
                guildName: interaction.guild.name,
            });

            const attachment = new AttachmentBuilder(imageBuffer, { name: 'study-profile.png' });
            return interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error('[StudyProfile] Error generating card:', error);
            return interaction.editReply({ content: '❌ Failed to generate profile card. Please try again.' });
        }
    },
};
