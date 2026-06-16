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

        const guildConfig = await queries.getGuildConfig(guildId);
        let studyChannels = [];
        try {
            studyChannels = JSON.parse(guildConfig?.study_channels || '[]');
        } catch (e) { studyChannels = []; }

        const oldChannelId = oldState.channelId;
        const newChannelId = newState.channelId;

        const isStudyChannel = (channelId) => {
            if (!channelId) return false;
            return studyChannels.length > 0 && studyChannels.includes(channelId);
        };

        if (!oldChannelId && newChannelId) {
            if (isStudyChannel(newChannelId)) {
                await handleJoin(userId, guildId);
            }
        }
        else if (oldChannelId && !newChannelId) {
            await handleLeave(userId, guildId, newState.client);
        }
        else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
            const wasInStudy = isStudyChannel(oldChannelId);
            const nowInStudy = isStudyChannel(newChannelId);

            if (wasInStudy && !nowInStudy) {
                await handleLeave(userId, guildId, newState.client);
            } else if (!wasInStudy && nowInStudy) {
                await handleJoin(userId, guildId);
            }
        }
    },
};

async function handleJoin(userId, guildId) {
    await queries.upsertUser(userId, guildId);
    const user = await queries.getUser(userId, guildId);
    if (user?.session_start) return;

    await queries.setSessionStart(Math.floor(Date.now() / 1000), userId, guildId);
    console.log(`[VC] ${userId} auto-started studying in guild ${guildId}`);
}

async function handleLeave(userId, guildId, client) {
    const user = await queries.getUser(userId, guildId);
    if (!user || !user.session_start) return;

    const endTime = Math.floor(Date.now() / 1000);
    const duration = endTime - user.session_start;

    if (duration < 60) {
        await queries.clearSession(userId, guildId);
        console.log(`[VC] ${userId} session too short (${duration}s), discarded`);
        return;
    }

    const today = getTodayISO();

    await queries.insertSession(userId, guildId, user.session_start, endTime, duration, today);
    await queries.updateStudyTime(duration, today, userId, guildId);
    await queries.clearSession(userId, guildId);

    const minutes = duration / 60;
    await addXP(userId, guildId, minutes);
    await updateStreak(userId, guildId);

    const updatedUser = await queries.getUser(userId, guildId);
    await checkMilestones(userId, guildId, updatedUser.total_seconds, client);
    await checkPrestige(userId, guildId, updatedUser.total_seconds, client);

    console.log(`[VC] ${userId} auto-stopped studying — ${Math.floor(duration / 60)}m in guild ${guildId}`);
}
