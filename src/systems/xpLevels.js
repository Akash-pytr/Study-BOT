const config = require('../config');
const { queries } = require('../database/db');

/**
 * Calculate the level from total XP.
 * Formula: XP needed for level N = LEVEL_BASE_XP * N^LEVEL_EXPONENT
 * @param {number} xp
 * @returns {number} level
 */
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

/**
 * Get XP required for a specific level (not cumulative).
 * @param {number} level
 * @returns {number}
 */
function getXPForLevel(level) {
    return Math.floor(config.LEVEL_BASE_XP * Math.pow(level, config.LEVEL_EXPONENT));
}

/**
 * Get cumulative XP required to reach a level.
 * @param {number} targetLevel
 * @returns {number}
 */
function getCumulativeXP(targetLevel) {
    let total = 0;
    for (let i = 1; i <= targetLevel; i++) {
        total += getXPForLevel(i);
    }
    return total;
}

/**
 * Get progress percentage toward next level.
 * @param {number} xp
 * @param {number} level
 * @returns {number} 0-100
 */
function getProgressPercent(xp, level) {
    const currentLevelXP = getCumulativeXP(level);
    const nextLevelXP = getCumulativeXP(level + 1);
    const range = nextLevelXP - currentLevelXP;
    const progress = xp - currentLevelXP;
    return Math.min(Math.max(Math.round((progress / range) * 100), 0), 100);
}

/**
 * Get XP values for display on profile.
 * @param {number} xp
 * @param {number} level
 * @returns {{ current: number, needed: number, percent: number }}
 */
function getXPDisplay(xp, level) {
    const currentLevelXP = getCumulativeXP(level);
    const nextLevelXP = getCumulativeXP(level + 1);
    return {
        current: xp - currentLevelXP,
        needed: nextLevelXP - currentLevelXP,
        percent: getProgressPercent(xp, level),
    };
}

/**
 * Add XP to a user after a study session and update their level.
 * @param {string} userId
 * @param {string} guildId
 * @param {number} minutes - study duration in minutes
 * @returns {{ xp: number, level: number, leveledUp: boolean, oldLevel: number }}
 */
function addXP(userId, guildId, minutes) {
    const user = queries.getUser(userId, guildId);
    if (!user) return null;

    const xpGained = Math.floor(minutes * config.XP_PER_MINUTE);
    const newXP = user.xp + xpGained;
    const oldLevel = user.level;
    const newLevel = calculateLevel(newXP);

    queries.updateXPLevel(newXP, newLevel, userId, guildId);

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
