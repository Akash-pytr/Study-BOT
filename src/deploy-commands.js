require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initDB } = require('./database/db');

async function deploy() {
    // Initialize database first (needed by some command files on require)
    await initDB();

    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command) {
            commands.push(command.data.toJSON());
            console.log(`📌 Queued: /${command.data.name}`);
        }
    }

    const { BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

    if (!BOT_TOKEN || !CLIENT_ID) {
        console.error('❌ Missing BOT_TOKEN or CLIENT_ID in .env file!');
        process.exit(1);
    }

    const rest = new REST().setToken(BOT_TOKEN);

    try {
        console.log(`\n🔄 Registering ${commands.length} application (/) commands...\n`);

        if (GUILD_ID) {
            const data = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands },
            );
            console.log(`✅ Successfully registered ${data.length} guild commands.`);
            console.log(`   Guild: ${GUILD_ID}`);
        } else {
            const data = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully registered ${data.length} global commands.`);
            console.log('   ⚠️ Global commands can take up to 1 hour to propagate.');
        }

        console.log('\nRegistered commands:');
        commands.forEach(cmd => console.log(`   /${cmd.name} — ${cmd.description}`));
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
}

deploy();
