# 📚 Study Bot — Discord Study Tracker

A feature-rich Discord bot for tracking study sessions, rewarding top students, and gamifying the learning experience with levels, XP, streaks, milestones, and prestige badges.

---

## ✨ Features

| System | Description |
|---|---|
| 📖 **Study Tracking** | Manual `/study start/stop` + automatic voice channel tracking |
| 📊 **Study Profile** | Canvas-rendered profile card with all stats |
| 🥇 **Weekly Top Student** | Auto top-3 roles + weekly announcements |
| 👑 **Student of the Month** | Auto #1 role + monthly announcements |
| 📢 **Milestone Announcements** | 10 tiers (1h → 5000h) with celebration embeds |
| 🏆 **Hall of Fame** | All-time records, monthly/weekly/streak history |
| 🔔 **Smart Reminders** | Daily DMs with streak protection + goal progress |
| 🎖 **Server Prestige** | 5 permanent badge tiers (Bronze → Legendary) |
| ⭐ **XP & Levels** | Exponential leveling curve with level-up notifications |
| 🔥 **Streaks** | Consecutive day tracking with personal bests |
| 🎯 **Goals** | Daily/weekly/monthly study hour goals |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- A [Discord Bot](https://discord.com/developers/applications) application

### 1. Clone & Install

```bash
cd "Study - Bot"
npm install
```

### 2. Configure

Edit the `.env` file with your bot credentials:

```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
```

**How to get these:**
- `BOT_TOKEN`: Discord Developer Portal → Your App → Bot → Token
- `CLIENT_ID`: Discord Developer Portal → Your App → General → Application ID
- `GUILD_ID`: Right-click your Discord server → Copy Server ID (enable Developer Mode in settings)

### 3. Register Commands

```bash
npm run deploy-commands
```

### 4. Start the Bot

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

---

## ⚙️ Bot Setup (In Discord)

After starting the bot, use the `/setup` command (admin only):

```
/setup announcement_channel #announcements
/setup achievement_channel #achievements
/setup study_channel #study-room-1
/setup weekly_roles @Champion @Elite @Achiever
/setup monthly_role @Student-of-the-Month
/setup view
```

---

## 📋 Command Reference

| Command | Description |
|---|---|
| `/study start` | Start a manual study session |
| `/study stop` | Stop your current session |
| `/study status` | Check elapsed time |
| `/studyprofile [user]` | View a beautiful profile card |
| `/leaderboard [period]` | View daily/weekly/monthly/alltime rankings |
| `/weeklywinners` | View current + past weekly winners |
| `/monthlywinner` | View current month's top student |
| `/monthlyhistory` | View all past monthly winners |
| `/halloffame` | View the server's all-time records |
| `/setgoal <hours> [period]` | Set a study hour goal |
| `/reminder enable/disable` | Toggle daily study reminders |
| `/setup <option>` | Configure bot settings (admin only) |

---

## 📁 Project Structure

```
Study - Bot/
├── src/
│   ├── index.js              # Entry point
│   ├── deploy-commands.js     # Command registration
│   ├── config.js              # Bot configuration
│   ├── database/db.js         # SQLite database
│   ├── commands/              # All slash commands
│   ├── events/                # Discord event handlers
│   ├── systems/               # Core game systems
│   ├── canvas/profileCard.js  # Profile card renderer
│   └── utils/                 # Helper utilities
├── data/                      # SQLite database file (auto-created)
├── .env                       # Bot secrets
└── package.json
```

---

## 🔧 Required Bot Permissions

When inviting your bot, ensure these permissions are enabled:

- **Send Messages**
- **Embed Links**
- **Attach Files** (for profile cards)
- **Manage Roles** (for winner/prestige roles)
- **View Channels**
- **Connect** (to detect voice channel presence)

**Required Intents** (Discord Developer Portal → Bot):
- ✅ Server Members Intent
- ✅ Message Content Intent (optional)

---

## 📝 License

MIT
