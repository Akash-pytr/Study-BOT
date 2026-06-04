/**
 * Format seconds into a human-readable string.
 */

/**
 * Convert seconds to "Xh Ym" format.
 * @param {number} seconds
 * @returns {string}
 */
function formatSeconds(seconds) {
    if (!seconds || seconds <= 0) return '0m';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
}

/**
 * Convert seconds to decimal hours string.
 * @param {number} seconds
 * @returns {string}
 */
function formatHours(seconds) {
    if (!seconds || seconds <= 0) return '0.0';
    return (seconds / 3600).toFixed(1);
}

/**
 * Convert seconds to full descriptive string.
 * @param {number} seconds
 * @returns {string}
 */
function formatFull(seconds) {
    if (!seconds || seconds <= 0) return '0 minutes';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const parts = [];

    if (hrs > 0) parts.push(`${hrs} hour${hrs !== 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} minute${mins !== 1 ? 's' : ''}`);

    return parts.join(' ');
}

/**
 * Get today's date in ISO format (YYYY-MM-DD).
 * @returns {string}
 */
function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get the start of the current week (Monday) in ISO format.
 * @returns {string}
 */
function getWeekStartISO() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
}

/**
 * Get the end of the current week (Sunday) in ISO format.
 * @returns {string}
 */
function getWeekEndISO() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(now.setDate(diff));
    return sunday.toISOString().split('T')[0];
}

/**
 * Get current month in YYYY-MM format.
 * @returns {string}
 */
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Create a text-based progress bar.
 * @param {number} current
 * @param {number} max
 * @param {number} length - character length of bar
 * @returns {string}
 */
function progressBar(current, max, length = 20) {
    const percent = Math.min(current / max, 1);
    const filled = Math.round(length * percent);
    const empty = length - filled;
    return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${Math.round(percent * 100)}%`;
}

module.exports = {
    formatSeconds,
    formatHours,
    formatFull,
    getTodayISO,
    getWeekStartISO,
    getWeekEndISO,
    getCurrentMonth,
    progressBar,
};
