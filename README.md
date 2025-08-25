# RoboBetBot

A Discord bot for managing friendly sports betting within your server. Features two-sided betting with custom odds, automatic payout calculations, and comprehensive stat tracking.

## Features

- **Two-sided betting system** - Users choose sides by reacting with team emojis
- **Custom odds support** - American (-110, +150) or decimal (1.91, 2.5) formats
- **Consensus resolution** - Both parties must confirm outcomes
- **Automatic stat tracking** - Win/loss records, profit tracking, leaderboards
- **Multiple bet types** - Game bets, player props, futures
- **SQLite database** - Persistent storage of all bets and statistics

## Quick Start (Portable Version)

### For Windows Users - No Installation Required

1. Download the latest release from [Releases](https://github.com/yzRobo/RoboBetBot/releases)
2. Extract the ZIP file anywhere
3. Run `Setup.bat` and enter your Discord bot token
4. Run `RunBot.bat` to start the bot

The portable version automatically downloads Node.js and all dependencies. No technical knowledge required.

## Developer Setup

### Requirements

- Node.js 16.9.0 or higher
- Discord bot token
- Discord server with bot permissions

### Installation

1. Clone the repository
```bash
git clone https://github.com/yzRobo/RoboBetBot.git
cd RoboBetBot
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env and add your Discord bot token
```

4. Start the bot
```bash
npm start
```

### Building Portable Version

To create a portable distribution:

```bash
npm run build-portable
```

This generates a `dist-portable/` folder containing:
- RunBot.bat - Main launcher
- Setup.bat - Configuration wizard  
- All bot files and dependencies
- Self-contained Node.js runtime

ZIP the folder to distribute to others.

## Discord Bot Setup

### Getting a Bot Token
1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application
3. Go to Bot section
4. Copy token for configuration
5. Here you can customize the bot how you see fit (Name, bot image, etc.). This is how it will display in discord

### Required Permissions
- Send Messages
- Use Application Commands  
- Read Messages/View Channels
- Add Reactions
- Manage Messages
- Embed Links

### Invite Link Generation
1. Go to Discord Developer Portal
2. Select your application
3. Navigate to OAuth2 > URL Generator
4. Select `bot` and `applications.commands` scopes
5. Select required permissions listed above
6. Use generated URL to invite bot to your server

## Commands

### Creating Bets
```
/bet create type:Game amount:50 description:"Bills @ Chiefs" 
side_a:"Chiefs -3" side_b:"Bills +3" 
odds_a:"-110" odds_b:"-110"
```

### Managing Bets
- `/bet resolve bet_id:1 winning_side:A` - Resolve a bet (requires both parties to confirm)
- `/bet cancel bet_id:1` - Cancel a bet

### Viewing Information
- `/bets active` - Show all active and pending bets
- `/bets history` - View your betting history
- `/stats [@user]` - View betting statistics
- `/leaderboard` - Display profit leaderboard

## How It Works

1. **Create a bet** - Define both sides, amounts, and optional odds
2. **Users join** - Click emoji reactions to claim sides (✈️ for away, 🏠 for home)
3. **Bet activates** - Once both sides are claimed
4. **Resolution** - Either party initiates, both must confirm with ✅
5. **Automatic settlement** - Stats and payouts calculated instantly

## Project Structure

```
RoboBetBot/
├── bot.js              # Main bot file
├── database.js         # Database operations
├── commands.js         # Command handlers
├── .env                # Bot token (not in repo)
├── .env.example        # Environment template
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies
├── scripts/
│   └── build-portable.js   # Portable build script
├── dist-portable/      # Generated portable version
└── bets.db            # SQLite database (created on run)
```

## Database Schema

- **users** - User statistics and profit tracking
- **bets** - All bet records with sides, odds, and outcomes
- **resolution_requests** - Pending resolution confirmations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

**GPL-3.0** - This ensures CardCast remains free and open source forever.

Key points:
- Free to use for any purpose
- Modify and distribute freely
- Must keep source code open
- Include license in distributions

See [LICENSE](LICENSE) file for full details.

## Support

Report issues at: https://github.com/yzRobo/RoboBetBot/issues
