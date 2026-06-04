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

        // User JOINED a voice channel
        if (!oldChannelId && newChannelId) {
            if (studyChannels.length === 0 || studyChannels.includes(newChannelId)) {
                handleJoin(userId, guildId);
            }
        }
        // User LEFT a voice channel
        else if (oldChannelId && !newChannelId) {
            if (studyChannels.length === 0 || studyChannels.includes(oldChannelId)) {
                await handleLeave(userId, guildId, newState.client);
            }
        }
        // User SWITCHED channels
        else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
            const wasInStudy = studyChannels.length === 0 || studyChannels.includes(oldChannelId);
            const nowInStudy = studyChannels.length === 0 || studyChannels.includes(newChannelId);

            if (wasInStudy && !nowInStudy) {
                await handleLeave(userId, guildId, newState.client);
            } else if (!wasInStudy && nowInStudy) {
                handleJoin(userId, guildId);
            }
        }
    },
};

function handleJoin(userId, guildId) {
    queries.upsertUser(userId, guildId);
    const user = queries.getUser(userId, guildId);
    if (user.session_start) return;

    queries.setSessionStart(Math.floor(Date.now() / 1000), userId, guildId);
    console.log(`[VC] ${userId} started studying in guild ${guildId}`);
}

async function handleLeave(userId, guildId, client) {
    const user = queries.getUser(userId, guildId);
    if (!user || !user.session_start) return;

    const endTime = Math.floor(Date.now() / 1000);
    const duration = endTime - user.session_start;

    if (duration < 60) {
        queries.clearSession(userId, guildId);
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

    console.log(`[VC] ${userId} studied for ${Math.floor(duration / 60)}m in guild ${guildId}`);
}
