require('dotenv').config();

const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initDB } = require('./database/db');

// ─── Handle Uncaught Errors ─────────────────────────────────
process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
});

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

client.commands = new Collection();

async function main() {
    // ─── Validate Token ──────────────────────────────────────
    if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN.trim() === '' || process.env.BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        console.error('❌ BOT_TOKEN is not set or invalid in .env file!');
        process.exit(1);
    }

    // Initialize database first
    await initDB();

    // ─── Load Commands ──────────────────────────────────────
    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if (command && 'data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`📌 Loaded command: /${command.data.name}`);
            } else {
                console.warn(`⚠️ Command at ${filePath} is missing "data" or "execute" property.`);
            }
        }
    }

    // ─── Load Events ────────────────────────────────────────
    const eventsPath = path.join(__dirname, 'events');
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            if (event && event.name && typeof event.execute === 'function') {
                if (event.once) {
                    client.once(event.name, (...args) => 
                        event.execute(...args).catch(err => console.error(`❌ Error in event "${event.name}":`, err))
                    );
                } else {
                    client.on(event.name, (...args) => 
                        event.execute(...args).catch(err => console.error(`❌ Error in event "${event.name}":`, err))
                    );
                }
                console.log(`📡 Loaded event: ${event.name}`);
            }
        }
    }

    // ─── Login ──────────────────────────────────────────────
    await client.login(process.env.BOT_TOKEN);
}

main().catch(error => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});

