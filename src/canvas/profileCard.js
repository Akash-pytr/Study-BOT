const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const config = require('../config');
const { getXPDisplay } = require('../systems/xpLevels');
const { getPrestigeTier } = require('../systems/prestige');
const { formatSeconds, formatHours } = require('../utils/formatTime');

const CARD = config.CARD;

/**
 * Generate a study profile card as a PNG Buffer.
 *
 * @param {object} params
 * @param {import('discord.js').User} params.user - Discord user
 * @param {object} params.dbUser - Database user row
 * @param {number} params.rank - Global rank
 * @param {string} params.guildName - Guild name for branding
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateProfileCard({ user, dbUser, rank, guildName }) {
    const canvas = createCanvas(CARD.WIDTH, CARD.HEIGHT);
    const ctx = canvas.getContext('2d');

    // ── Background Gradient ──
    const bgGrad = ctx.createLinearGradient(0, 0, CARD.WIDTH, CARD.HEIGHT);
    bgGrad.addColorStop(0, CARD.BACKGROUND_START);
    bgGrad.addColorStop(1, CARD.BACKGROUND_END);
    ctx.fillStyle = bgGrad;
    roundRect(ctx, 0, 0, CARD.WIDTH, CARD.HEIGHT, 20);
    ctx.fill();

    // ── Accent stripe at top ──
    const stripeGrad = ctx.createLinearGradient(0, 0, CARD.WIDTH, 0);
    stripeGrad.addColorStop(0, CARD.ACCENT);
    stripeGrad.addColorStop(1, '#0f3460');
    ctx.fillStyle = stripeGrad;
    ctx.fillRect(0, 0, CARD.WIDTH, 6);

    // ── Avatar ──
    const avatarSize = 100;
    const avatarX = 40;
    const avatarY = (CARD.HEIGHT - avatarSize) / 2;

    try {
        const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarURL);

        // Circular clip
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Avatar border
        ctx.strokeStyle = CARD.ACCENT;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
        ctx.stroke();
    } catch (e) {
        // Fallback: colored circle
        ctx.fillStyle = CARD.ACCENT;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(user.username[0].toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 12);
        ctx.textAlign = 'start';
    }

    // ── Prestige Badge (next to avatar) ──
    const prestige = getPrestigeTier(dbUser.prestige_level);
    if (prestige) {
        ctx.font = 'bold 22px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(prestige.emoji, avatarX + avatarSize + 8, avatarY + 20);
    }

    // ── Username + Level ──
    const textX = 170;
    ctx.fillStyle = CARD.TEXT_PRIMARY;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(user.displayName || user.username, textX, 50);

    ctx.fillStyle = CARD.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.fillText(`@${user.username}`, textX, 70);

    // ── Level Badge ──
    const levelText = `LVL ${dbUser.level}`;
    ctx.font = 'bold 14px sans-serif';
    const levelWidth = ctx.measureText(levelText).width + 20;
    const levelX = textX + ctx.measureText(user.displayName || user.username).width + 15;

    // Only draw if it fits
    if (levelX + levelWidth < CARD.WIDTH - 20) {
        ctx.fillStyle = CARD.ACCENT;
        roundRect(ctx, levelX, 33, levelWidth, 24, 12);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(levelText, levelX + levelWidth / 2, 49);
        ctx.textAlign = 'start';
    }

    // ── XP Progress Bar ──
    const xpDisplay = getXPDisplay(dbUser.xp, dbUser.level);
    const barX = textX;
    const barY = 82;
    const barWidth = 340;
    const barHeight = 16;

    // Bar background
    ctx.fillStyle = CARD.XP_BAR_BG;
    roundRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
    ctx.fill();

    // Bar fill
    const fillWidth = Math.max((barWidth * xpDisplay.percent) / 100, barHeight);
    const barGrad = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
    barGrad.addColorStop(0, CARD.XP_BAR_FILL_START);
    barGrad.addColorStop(1, CARD.XP_BAR_FILL_END);
    ctx.fillStyle = barGrad;
    roundRect(ctx, barX, barY, fillWidth, barHeight, barHeight / 2);
    ctx.fill();

    // XP text
    ctx.fillStyle = CARD.TEXT_SECONDARY;
    ctx.font = '12px sans-serif';
    ctx.fillText(`${xpDisplay.current} / ${xpDisplay.needed} XP`, barX + barWidth + 10, barY + 13);

    // ── Stats Grid ──
    const statsY = 120;
    const stats = [
        { label: '📖 Total', value: formatSeconds(dbUser.total_seconds) },
        { label: '📅 Today', value: formatSeconds(dbUser.daily_seconds) },
        { label: '📆 Weekly', value: formatSeconds(dbUser.weekly_seconds) },
        { label: '🗓 Monthly', value: formatSeconds(dbUser.monthly_seconds) },
    ];

    const colWidth = 130;
    stats.forEach((stat, i) => {
        const sx = textX + i * colWidth;
        ctx.fillStyle = CARD.TEXT_SECONDARY;
        ctx.font = '12px sans-serif';
        ctx.fillText(stat.label, sx, statsY);

        ctx.fillStyle = CARD.TEXT_PRIMARY;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(stat.value, sx, statsY + 22);
    });

    // ── Second Row Stats ──
    const stats2Y = 175;
    const stats2 = [
        { label: '🔥 Streak', value: `${dbUser.current_streak}d` },
        { label: '🏅 Best', value: `${dbUser.best_streak}d` },
        { label: '🌍 Rank', value: `#${rank}` },
        { label: '🏆 Achievements', value: `${dbUser.achievements_count}` },
    ];

    stats2.forEach((stat, i) => {
        const sx = textX + i * colWidth;
        ctx.fillStyle = CARD.TEXT_SECONDARY;
        ctx.font = '12px sans-serif';
        ctx.fillText(stat.label, sx, stats2Y);

        ctx.fillStyle = CARD.TEXT_PRIMARY;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(stat.value, sx, stats2Y + 22);
    });

    // ── Goal Progress Bar (if set) ──
    if (dbUser.goal_hours > 0) {
        const goalY = 225;
        const periodSeconds = {
            daily: dbUser.daily_seconds,
            weekly: dbUser.weekly_seconds,
            monthly: dbUser.monthly_seconds,
        }[dbUser.goal_period] || dbUser.daily_seconds;

        const goalProgress = Math.min(periodSeconds / (dbUser.goal_hours * 3600), 1);

        ctx.fillStyle = CARD.TEXT_SECONDARY;
        ctx.font = '12px sans-serif';
        ctx.fillText(`🎯 ${dbUser.goal_period.charAt(0).toUpperCase() + dbUser.goal_period.slice(1)} Goal`, textX, goalY);

        // Bar BG
        ctx.fillStyle = CARD.XP_BAR_BG;
        roundRect(ctx, textX, goalY + 8, barWidth, 14, 7);
        ctx.fill();

        // Bar fill
        const goalFillWidth = Math.max(barWidth * goalProgress, 14);
        const goalGrad = ctx.createLinearGradient(textX, 0, textX + goalFillWidth, 0);
        goalGrad.addColorStop(0, CARD.GOAL_BAR_FILL_START);
        goalGrad.addColorStop(1, CARD.GOAL_BAR_FILL_END);
        ctx.fillStyle = goalGrad;
        roundRect(ctx, textX, goalY + 8, goalFillWidth, 14, 7);
        ctx.fill();

        // Goal text
        ctx.fillStyle = CARD.TEXT_SECONDARY;
        ctx.font = '12px sans-serif';
        ctx.fillText(
            `${formatHours(periodSeconds)} / ${dbUser.goal_hours}h (${Math.round(goalProgress * 100)}%)`,
            textX + barWidth + 10,
            goalY + 19
        );
    }

    // ── Server Branding ──
    ctx.fillStyle = CARD.TEXT_SECONDARY;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(guildName, CARD.WIDTH - 25, CARD.HEIGHT - 15);

    // ── Rank Badge (top right) ──
    const rankBadge = `#${rank}`;
    ctx.font = 'bold 28px sans-serif';
    const rankWidth = ctx.measureText(rankBadge).width + 24;
    const rankBadgeX = CARD.WIDTH - rankWidth - 20;

    ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
    roundRect(ctx, rankBadgeX, 25, rankWidth, 40, 12);
    ctx.fill();

    ctx.fillStyle = CARD.ACCENT;
    ctx.textAlign = 'center';
    ctx.fillText(rankBadge, rankBadgeX + rankWidth / 2, 54);
    ctx.textAlign = 'start';

    // ── XP Total (under rank) ──
    ctx.fillStyle = CARD.TEXT_SECONDARY;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${dbUser.xp.toLocaleString()} Total XP`, rankBadgeX + rankWidth / 2, 72);
    ctx.textAlign = 'start';

    return canvas.toBuffer('image/png');
}

/**
 * Draw a rounded rectangle path.
 */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

module.exports = { generateProfileCard };
