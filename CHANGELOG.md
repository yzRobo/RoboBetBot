# Changelog

All notable changes to RoboBetBot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

## [1.2.1] - 2025-08-26

### Fixed
- **Critical bug**: Bet creators can now properly join their own bets (take one side)
- **Emoji conflict**: Changed prop bet emojis from ✅/❌ to ⬆️/⬇️ to avoid conflict with cancellation emoji
- **Reaction handling**: Fixed issue where valid reactions were being incorrectly removed
- **Creator participation**: Creators can now take one side of their bet but still cannot bet against themselves

### Changed
- Prop bet emojis updated: ⬆️ for Over/Yes (Side A), ⬇️ for Under/No (Side B)
- Improved reaction validation logic to only remove truly invalid reactions
- Better separation between bet-joining emojis and resolution/cancellation emojis

## [1.2.0] - 2025-08-25

### Added
- **Emoji-Based Resolution & Cancellation** - No typing needed!
  - Active bets now show 🅰️ (Side A wins), 🅱️ (Side B wins), and ❌ (Cancel) emojis
  - Both players click the same emoji to resolve or cancel - automatic and instant
  - Resolution tracking shows who voted for what outcome
  - Status updates in chat ("Player X voted Side A wins, waiting for Player Y...")
- **Dual resolution methods** - Use either emoji reactions OR slash commands
- **Resolution state tracking** - Bot remembers who voted for what even if reactions are removed

### Fixed
- **Active bet cancellation** - Fixed bug preventing cancellation of active bets
  - Active bets can now be properly cancelled with mutual agreement
  - Both emoji (❌) and command (`/bet cancel`) methods work correctly

### Changed
- Improved resolution UX - Added visual feedback when waiting for confirmation
- Updated bet embeds to show resolution instructions when active
- Enhanced error messages for clearer user guidance

### Technical
- Added in-memory resolution tracking system
- Improved reaction handling for better performance
- Updated confirmation flow for both resolution and cancellation

## [1.1.0] - 2025-08-25

### Added
- **Full Docker Support**
  - Native Docker containerization for cross-platform deployment
  - Automated container builds with health monitoring
  - Resource management and limits for optimal performance
  - Non-root user execution for enhanced security

- **NAS Device Integration**
  - GUI-based deployment via Dockge, Portainer, and native NAS interfaces
  - Native support for Synology DSM, QNAP, Unraid, TrueNAS SCALE, OpenMediaVault
  - Pre-configured compose files for each platform
  - Auto-clone from GitHub functionality - no file uploads needed

- **New Deployment Options**
  - Three deployment methods: Portable (Windows), Docker, Source
  - Comprehensive comparison guide (DEPLOYMENT_OPTIONS.md)
  - Docker management script (docker.sh) for Linux/Mac
  - Cross-platform Makefile for consistent commands

### Added Documentation
- **DOCKER.md** - Complete Docker deployment guide
- **DEPLOYMENT_OPTIONS.md** - Comparison of all deployment methods  
- **CONTRIBUTING.md** - Guidelines for contributors
- Platform-specific instructions for all major NAS brands
- Migration guides between deployment methods

### Technical Improvements
- Alpine Linux base for minimal container size (~100MB)
- DATABASE_PATH environment variable support
- Docker volume management for persistent storage
- Timezone support for proper logging
- Health checks with auto-restart capability

### Changed
- Enhanced database.js to support Docker environments
- Improved error handling for missing environment variables

## [1.0.0] - 2025-08-25

### Added
- Initial release of RoboBetBot
- Two-sided betting system with emoji reactions
- Custom odds support (American and decimal formats)
- Consensus-based bet resolution
- Automatic payout calculations
- SQLite database for persistent storage
- Comprehensive stat tracking
- Profit/loss leaderboards
- Three bet types: Game, Prop, Future
- Slash commands for Discord integration
- Portable Windows build system
- Setup wizard for easy configuration
- Complete documentation

### Features
- `/bet create` - Create new bets with custom parameters
- `/bet resolve` - Resolve bets with mutual agreement
- `/bet cancel` - Cancel pending or active bets
- `/bets active` - View all active bets
- `/bets history` - View personal betting history
- `/stats` - Check user statistics
- `/leaderboard` - Server-wide rankings

### Technical
- Discord.js v14 integration
- SQLite3 database
- Node.js 16.9.0+ support
- Portable build script
- Self-contained Windows executable

[Unreleased]: https://github.com/yzRobo/RoboBetBot/compare/v1.2.1...HEAD
[1.2.1]: https://github.com/yzRobo/RoboBetBot/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/yzRobo/RoboBetBot/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/yzRobo/RoboBetBot/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/yzRobo/RoboBetBot/releases/tag/v1.0.0