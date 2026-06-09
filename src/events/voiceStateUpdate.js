const { queries } = require('../database/db');
const { getTodayISO } = require('../utils/formatTime');
const { addXP } = require('../systems/xpLevels');
const { updateStreak } = require('../systems/streaks');
const { checkMilestones } = require('../systems/milestones');
const { checkPrestige } = require('../systems/prestige');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const userId = newState.member?.id || oldState.member?.id;
        const guildId = newState.guild?.id || oldState.guild?.id;

        if (!userId || !guildId) return;
        if (newState.member?.user?.bot || oldState.member?.user?.bot) return;

        const guildConfig = queries.getGuildConfig(guildId);
        let studyChannels = [];
        try {
            studyChannels = JSON.parse(guildConfig?.study_channels || '[]');
        } catch (e) { studyChannels = []; }

        const oldChannelId = oldState.channelId;
        const newChannelId = newState.channelId;

        const isStudyChannel = (channelId) => {
            if (!channelId) return false;
            return studyChannels.length === 0 || studyChannels.includes(channelId);
        };

        // User JOINED a voice channel (was not in any VC before)
        if (!oldChannelId && newChannelId) {
            if (isStudyChannel(newChannelId)) {
                handleJoin(userId, guildId);
            }
        }
        // User LEFT a voice channel (completely disconnected from VC)
        else if (oldChannelId && !newChannelId) {
            // ALWAYS auto-stop session when user leaves VC — regardless of which channel
            // This fixes the issue where manually started sessions keep running after VC leave
            await handleLeave(userId, guildId, newState.client);
        }
        // User SWITCHED channels
        else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
            const wasInStudy = isStudyChannel(oldChannelId);
            const nowInStudy = isStudyChannel(newChannelId);

            if (wasInStudy && !nowInStudy) {
                // Moved from study VC to non-study VC → auto-stop session
                await handleLeave(userId, guildId, newState.client);
            } else if (!wasInStudy && nowInStudy) {
                // Moved from non-study VC to study VC → auto-start session
                handleJoin(userId, guildId);
            }
            // If both are study channels or both are non-study, do nothing
        }
    },
};

function handleJoin(userId, guildId) {
    queries.upsertUser(userId, guildId);
    const user = queries.getUser(userId, guildId);
    if (user.session_start) return; // Already has an active session

    queries.setSessionStart(Math.floor(Date.now() / 1000), userId, guildId);
    console.log(`[VC] ${userId} auto-started studying in guild ${guildId}`);
}

async function handleLeave(userId, guildId, client) {
    const user = queries.getUser(userId, guildId);
    if (!user || !user.session_start) return; // No active session

    const endTime = Math.floor(Date.now() / 1000);
    const duration = endTime - user.session_start;

    // Ignore sessions shorter than 60 seconds (accidental joins)
    if (duration < 60) {
        queries.clearSession(userId, guildId);
        console.log(`[VC] ${userId} session too short (${duration}s), discarded`);
        return;
    }

    const today = getTodayISO();

    queries.insertSession(userId, guildId, user.session_start, endTime, duration, today);
    queries.updateStudyTime(duration, today, userId, guildId);
    queries.clearSession(userId, guildId);

    const minutes = duration / 60;
    addXP(userId, guildId, minutes);
    updateStreak(userId, guildId);

    const updatedUser = queries.getUser(userId, guildId);
    await checkMilestones(userId, guildId, updatedUser.total_seconds, client);
    await checkPrestige(userId, guildId, updatedUser.total_seconds, client);

    console.log(`[VC] ${userId} auto-stopped studying — ${Math.floor(duration / 60)}m in guild ${guildId}`);
}
