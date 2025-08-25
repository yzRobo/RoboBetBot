# RoboBetBot

A Discord bot for managing friendly sports betting within your server. Features two-sided betting with custom odds, automatic payout calculations, and comprehensive stat tracking.

## Features

- **Two-sided betting system** - Users choose sides by reacting with team emojis
- **Custom odds support** - American (-110, +150) or decimal (1.91, 2.5) formats
- **Consensus resolution** - Both parties must confirm outcomes
- **Automatic stat tracking** - Win/loss records, profit tracking, leaderboards
- **Multiple bet types** - Game bets, player props, futures
- **SQLite database** - Persistent storage of all bets and statistics

## Quick Start

### Option 1: Portable Version (Windows - No Installation Required)

1. Download the latest release from [Releases](https://github.com/yzRobo/RoboBetBot/releases)
2. Extract the ZIP file anywhere
3. Run `Setup.bat` and enter your Discord bot token
4. Run `RunBot.bat` to start the bot

The portable version automatically downloads Node.js and all dependencies. No technical knowledge required.

### Option 2: Docker (Cross-Platform - NAS, VPS, Linux, Mac)

#### Standard Docker Deployment
```bash
# Clone repository
git clone https://github.com/yzRobo/RoboBetBot.git
cd RoboBetBot

# Configure bot token
cp .env.example .env
# Edit .env with your Discord token

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

#### GUI Deployment (Dockge/Portainer/TrueNAS)
For web-based Docker management:

1. Use `docker-compose.dockge.yml` 
2. Change `DISCORD_TOKEN` to your token
3. Deploy through your GUI

Perfect for Synology, QNAP, Unraid, TrueNAS, or any Docker GUI. See [DOCKER.md](DOCKER.md) for detailed instructions.

### Option 3: Developer Setup (Source Installation)

#### Requirements

- Node.js 16.9.0 or higher
- Discord bot token
- Discord server with bot permissions

#### Installation

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

## Discord Bot Setup

### Getting a Bot Token
1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application
3. Go to Bot section
4. Copy token for configuration
5. Customize the bot (name, avatar, etc.) - this is how it will display in Discord

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

## Building and Distribution

### Building Portable Version

To create a portable Windows distribution:

```bash
npm run build-portable
```

This generates a `dist-portable/` folder containing:
- RunBot.bat - Main launcher
- Setup.bat - Configuration wizard  
- All bot files and dependencies
- Self-contained Node.js runtime

ZIP the folder to distribute to others.

### Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t robobetbot .

# Run with Docker Compose
docker-compose up -d

# Or use the management script (Linux/Mac)
chmod +x docker.sh
./docker.sh start
```

See [DOCKER.md](DOCKER.md) for detailed Docker instructions including NAS setup.

## Project Structure

```
RoboBetBot/
├── bot.js                     # Main bot file
├── database.js                # Database operations
├── commands.js                # Command handlers
├── .env                       # Bot token (not in repo)
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies
├── package-lock.json          # Dependency lock file
├── README.md                  # This file
├── LICENSE                    # GPL-3.0 license
├── CHANGELOG.md               # Version history
├── CONTRIBUTING.md            # Contribution guidelines
├── Dockerfile                 # Docker container definition
├── docker-compose.yml         # Docker Compose configuration
├── docker-compose.dockge.yml  # Dockge/GUI optimized compose
├── .dockerignore              # Docker ignore rules
├── DOCKER.md                  # Docker documentation
├── docker.sh                  # Docker management script
├── Makefile                   # Cross-platform commands
├── scripts/
│   └── build-portable.js     # Portable build script
├── dist-portable/             # Generated portable version (not in repo)
├── data/                      # Docker volume mount point (not in repo)
└── bets.db                    # SQLite database (created on run)
```

## Deployment Options

| Platform | Method | Difficulty | Best For |
|----------|--------|------------|----------|
| Windows | Portable EXE | Easiest | Friends, non-technical users |
| NAS | Docker (Dockge) | Easy | Home servers, always-on |
| VPS | Docker (CLI) | Easy | Cloud hosting |
| Development | Source | Moderate | Development, customization |

## Database Schema

- **users** - User statistics and profit tracking
- **bets** - All bet records with sides, odds, and outcomes
- **resolution_requests** - Pending resolution confirmations

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:
- Reporting issues
- Submitting pull requests
- Code style standards
- Development setup

## License

**GPL-3.0** - This ensures RoboBetBot remains free and open source forever.

Key points:
- Free to use for any purpose
- Modify and distribute freely
- Must keep source code open
- Include license in distributions

See [LICENSE](LICENSE) file for full details.

## Support

Report issues at: https://github.com/yzRobo/RoboBetBot/issues

## Acknowledgments

Created and maintained by yzRobo