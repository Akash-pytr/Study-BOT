const config = require('../config');
const { queries } = require('../database/db');

function calculateLevel(xp) {
    let level = 0;
    let cumulativeXP = 0;
    while (true) {
        const nextLevelXP = getXPForLevel(level + 1);
        if (cumulativeXP + nextLevelXP > xp) break;
        cumulativeXP += nextLevelXP;
        level++;
    }
    return level;
}

function getXPForLevel(level) {
    return Math.floor(config.LEVEL_BASE_XP * Math.pow(level, config.LEVEL_EXPONENT));
}

function getCumulativeXP(targetLevel) {
    let total = 0;
    for (let i = 1; i <= targetLevel; i++) {
        total += getXPForLevel(i);
    }
    return total;
}

function getProgressPercent(xp, level) {
    const currentLevelXP = getCumulativeXP(level);
    const nextLevelXP = getCumulativeXP(level + 1);
    const range = nextLevelXP - currentLevelXP;
    const progress = xp - currentLevelXP;
    return Math.min(Math.max(Math.round((progress / range) * 100), 0), 100);
}

function getXPDisplay(xp, level) {
    const currentLevelXP = getCumulativeXP(level);
    const nextLevelXP = getCumulativeXP(level + 1);
    return {
        current: xp - currentLevelXP,
        needed: nextLevelXP - currentLevelXP,
        percent: getProgressPercent(xp, level),
    };
}

async function addXP(userId, guildId, minutes) {
    const user = await queries.getUser(userId, guildId);
    if (!user) return null;

    const xpGained = Math.floor(minutes * config.XP_PER_MINUTE);
    const newXP = (user.xp || 0) + xpGained;
    const oldLevel = user.level || 0;
    const newLevel = calculateLevel(newXP);

    await queries.updateXPLevel(newXP, newLevel, userId, guildId);

    return {
        xp: newXP,
        level: newLevel,
        leveledUp: newLevel > oldLevel,
        oldLevel,
    };
}

module.exports = {
    calculateLevel,
    getXPForLevel,
    getCumulativeXP,
    getProgressPercent,
    getXPDisplay,
    addXP,
};
