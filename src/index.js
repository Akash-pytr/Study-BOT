require('dotenv').config();

const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initDB } = require('./database/db');

// ─── Create Client ──────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.GuildMember, Partials.Channel],
});

async function main() {
    // Initialize database first
    await initDB();

    // ─── Load Commands ──────────────────────────────────────
    client.commands = new Collection();
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`📌 Loaded command: /${command.data.name}`);
        } else {
            console.warn(`⚠️ Command at ${filePath} is missing "data" or "execute" property.`);
        }
    }

    // ─── Load Events ────────────────────────────────────────
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`📡 Loaded event: ${event.name}`);
    }

    // ─── Handle Uncaught Errors ─────────────────────────────
    process.on('unhandledRejection', error => {
        console.error('Unhandled promise rejection:', error);
    });

    process.on('uncaughtException', error => {
        console.error('Uncaught exception:', error);
    });

    // ─── Login ──────────────────────────────────────────────
    if (!process.env.BOT_TOKEN) {
        console.error('❌ BOT_TOKEN is not set in .env file!');
        process.exit(1);
    }

    await client.login(process.env.BOT_TOKEN);
}

main().catch(error => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});
