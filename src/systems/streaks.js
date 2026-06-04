const { queries } = require('../database/db');
const { getTodayISO } = require('../utils/formatTime');

/**
 * Update a user's streak after a study session.
 * @param {string} userId
 * @param {string} guildId
 * @returns {{ currentStreak: number, bestStreak: number, isNew: boolean }}
 */
function updateStreak(userId, guildId) {
    const user = queries.getUser(userId, guildId);
    if (!user) return { currentStreak: 0, bestStreak: 0, isNew: false };

    const today = getTodayISO();

    if (user.last_study_date === today) {
        return {
            currentStreak: user.current_streak,
            bestStreak: user.best_streak,
            isNew: false,
        };
    }

    let newStreak;

    if (!user.last_study_date) {
        newStreak = 1;
    } else {
        const lastDate = new Date(user.last_study_date);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            newStreak = user.current_streak + 1;
        } else {
            newStreak = 1;
        }
    }

    const newBest = Math.max(newStreak, user.best_streak);
    queries.updateStreak(newStreak, newBest, userId, guildId);

    return {
        currentStreak: newStreak,
        bestStreak: newBest,
        isNew: newStreak > user.current_streak,
    };
}

/**
 * Check if a user is at risk of losing their streak.
 * @param {string} userId
 * @param {string} guildId
 * @returns {{ atRisk: boolean, currentStreak: number }}
 */
function checkStreakRisk(userId, guildId) {
    const user = queries.getUser(userId, guildId);
    if (!user || user.current_streak === 0) {
        return { atRisk: false, currentStreak: 0 };
    }

    const today = getTodayISO();
    return {
        atRisk: user.last_study_date !== today && user.current_streak >= 3,
        currentStreak: user.current_streak,
    };
}

module.exports = { updateStreak, checkStreakRisk };
