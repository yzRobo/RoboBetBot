# RoboBetBot Deployment Options

## Comparison Table

| Feature | Portable (Windows) | Docker | Source Install |
|---------|-------------------|---------|----------------|
| **Platforms** | Windows 10/11 | Linux, Mac, Windows, NAS | Any with Node.js |
| **Installation** | None - just extract | Docker required | Node.js required |
| **Technical Skill** | None | Basic | Intermediate |
| **Auto-updates** | Manual | Easy with scripts | Git pull |
| **Resource Usage** | ~200MB | ~100MB + Docker | ~150MB |
| **Startup Time** | 3 min first run, instant after | Instant | Instant |
| **Best For** | Windows users, sharing with friends | NAS devices, servers, VPS | Developers, customization |
| **Backup** | Copy .db file | Docker volumes, automated | Manual |
| **Multiple Instances** | Separate folders | Easy with compose | Separate folders |
| **System Integration** | Standalone | Systemd, containers | PM2, systemd |

## Which Should You Choose?

### Choose **Portable** if:
- You're on Windows
- You want zero setup
- You're sharing with non-technical friends
- You want to run from USB drive
- You don't have admin rights

### Choose **Docker** if:
- You have a NAS (Synology, QNAP, Unraid)
- You're running on a VPS or server
- You want automatic restarts
- You need easy backup/restore
- You're familiar with containers
- You want to run multiple bots

### Choose **Source Install** if:
- You're a developer
- You want to modify the code
- You need direct debugging access
- You're contributing to the project
- You want the smallest footprint

## Quick Start Commands

### Portable (Windows)
```batch
Setup.bat
RunBot.bat
```

### Docker
```bash
docker-compose up -d
docker-compose logs -f
```

### Source
```bash
npm install
npm start
```

## Migration Between Platforms

### Portable → Docker
1. Copy `bets.db` from portable folder
2. Place in `data/` folder for Docker
3. Start Docker container

### Docker → Portable
1. Extract database: `docker cp robobetbot:/data/bets.db ./bets.db`
2. Copy to portable folder
3. Run portable version

### Any → Any
The `bets.db` file is compatible across all platforms. Just copy it to the appropriate location.