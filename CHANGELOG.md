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

## [1.0.0] - 2024-12-21

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

[Unreleased]: https://github.com/yzRobo/RoboBetBot/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yzRobo/RoboBetBot/releases/tag/v1.0.0