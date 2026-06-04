const cron = require('node-cron');
const { queries } = require('../database/db');
const { processWeeklyWinners } = require('../systems/weeklyWinner');
const { processMonthlyWinner } = require('../systems/monthlyWinner');
const { sendReminders } = require('../systems/reminders');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`\n✅ Study Bot is online as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
        console.log('─'.repeat(40));

        // Ensure guild configs exist for all guilds
        for (const [guildId] of client.guilds.cache) {
            queries.upsertGuildConfig(guildId);
        }

        // ─── Daily Reset: Midnight UTC ───────────────────────────
        cron.schedule('0 0 * * *', () => {
            console.log('[Cron] Running daily reset...');
            for (const [guildId] of client.guilds.cache) {
                queries.resetDailyAll(guildId);
            }
            console.log('[Cron] Daily reset complete.');
        });

        // ─── Weekly Winners: Sunday 23:59 UTC ────────────────────
        cron.schedule('59 23 * * 0', async () => {
            console.log('[Cron] Calculating weekly winners...');
            for (const [guildId] of client.guilds.cache) {
                await processWeeklyWinners(client, guildId);
            }
            console.log('[Cron] Weekly winners processed.');
        });

        // ─── Monthly Winner: Last day of month 23:59 UTC ─────────
        cron.schedule('59 23 28-31 * *', async () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (tomorrow.getDate() === 1) {
                console.log('[Cron] Calculating monthly winner...');
                for (const [guildId] of client.guilds.cache) {
                    await processMonthlyWinner(client, guildId);
                }
                console.log('[Cron] Monthly winner processed.');
            }
        });

        // ─── Daily Reminders: 8 PM UTC ──────────────────────────
        cron.schedule('0 20 * * *', async () => {
            console.log('[Cron] Sending daily reminders...');
            await sendReminders(client);
        });

        console.log('⏰ Cron jobs scheduled:');
        console.log('   • Daily reset at 00:00 UTC');
        console.log('   • Weekly winners at Sun 23:59 UTC');
        console.log('   • Monthly winner at month-end 23:59 UTC');
        console.log('   • Daily reminders at 20:00 UTC');
        console.log('─'.repeat(40));
    },
};
