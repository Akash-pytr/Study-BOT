module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`[InteractionCreate] No command matching "${interaction.commandName}" was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`[InteractionCreate] Error executing /${interaction.commandName}:`, error);

            const errorMessage = '❌ There was an error while executing this command. Please try again.';

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
            }
        }
    },
};
