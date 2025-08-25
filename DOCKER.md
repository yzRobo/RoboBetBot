# Docker Setup for RoboBetBot

Run RoboBetBot in a Docker container on any platform including NAS devices (Synology, QNAP, Unraid), VPS, or local machines.

## Quick Start

### Option 1: Using Docker Compose (Standard)

For users with command-line access and local files:

1. **Clone the repository:**
```bash
git clone https://github.com/yzRobo/RoboBetBot.git
cd RoboBetBot
```

2. **Configure your bot token:**
```bash
cp .env.example .env
# Edit .env and add your Discord token
```

3. **Start the bot:**
```bash
docker-compose up -d
```

4. **Check logs:**
```bash
docker-compose logs -f
```

5. **Stop the bot:**
```bash
docker-compose down
```

### Option 2: GUI Deployment (Dockge/Portainer)

For users preferring web-based Docker management (TrueNAS, Unraid, Synology with Portainer):

We provide a special `docker-compose.dockge.yml` file optimized for GUI deployment:

1. **In your Docker GUI (Dockge/Portainer):**
   - Create new stack/app
   - Name: `robobetbot`

2. **Copy the contents of `docker-compose.dockge.yml`** from the repository

3. **Change ONE required setting:**
   ```yaml
   DISCORD_TOKEN: "PASTE_YOUR_TOKEN_HERE"
   ```
   Replace with your actual bot token

4. **Deploy** - The container will automatically:
   - Download the bot code from GitHub
   - Install dependencies
   - Start the bot

No file uploads or command line needed!

### Differences Between Compose Files

| File | Purpose | Use When |
|------|---------|----------|
| `docker-compose.yml` | Standard Docker deployment | You have files locally, using CLI, building from source |
| `docker-compose.dockge.yml` | GUI deployment | Using Dockge/Portainer/TrueNAS, want automatic setup |

Both achieve the same result - choose based on your preference and setup.

### Option 3: Using Docker CLI

For manual container management:

1. **Build the image:**
```bash
docker build -t robobetbot:latest .
```

2. **Run the container:**
```bash
docker run -d \
  --name robobetbot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=your_token_here \
  -v $(pwd)/data:/data \
  robobetbot:latest
```

## NAS Installation Guides

### Synology DSM

#### Method 1: Using Docker Package UI
1. Install Docker from Package Center
2. Open Docker application
3. Go to Registry tab
4. Go to Image > Add > Add from URL
5. Use raw GitHub URL for Dockerfile
6. Go to Container > Create
7. Configure:
   - Environment: Add DISCORD_TOKEN
   - Volume: Map /docker/robobetbot/data to /data

#### Method 2: Using Portainer
1. Install Portainer from Package Center
2. Access Portainer web UI
3. Create new stack
4. Paste `docker-compose.dockge.yml` contents
5. Update DISCORD_TOKEN
6. Deploy stack

#### Method 3: Using SSH
```bash
ssh admin@your-nas-ip
cd /volume1/docker
git clone https://github.com/yzRobo/RoboBetBot.git
cd RoboBetBot
sudo docker-compose up -d
```

### QNAP Container Station

1. Install Container Station from App Center
2. Click "Create Application"
3. Choose "Create with Docker Compose"
4. Paste `docker-compose.dockge.yml` contents
5. Modify DISCORD_TOKEN
6. Click "Create"

### Unraid

#### Using Docker Tab
1. Go to Docker tab in Unraid UI
2. Click "Add Container"
3. Configure:
   - Repository: `node:18-alpine`
   - Name: `robobetbot`
   - Environment Variables: Add DISCORD_TOKEN
   - Path: Map /mnt/user/appdata/robobetbot to /data

#### Using Compose Manager Plugin
1. Install Compose Manager from Community Applications
2. Add new stack
3. Paste `docker-compose.dockge.yml`
4. Update token and deploy

### TrueNAS SCALE

#### Using Dockge (Recommended)
1. Install Dockge from TrueCharts
2. Access Dockge web UI
3. Create new stack: `robobetbot`
4. Paste `docker-compose.dockge.yml` contents
5. Update DISCORD_TOKEN
6. Click Deploy

#### Using Apps > Custom App
1. Go to Apps section
2. Click "Launch Docker Image"
3. Configure:
   - Image: `node:18-alpine`
   - Environment Variables: Add all from compose file
   - Storage: Add host path for /data
4. Deploy

### Portainer (Universal)

Works on any system with Portainer installed:

1. Access Portainer UI
2. Go to Stacks
3. Add Stack
4. Name: `robobetbot`
5. Web editor: Paste `docker-compose.dockge.yml`
6. Update DISCORD_TOKEN
7. Deploy the stack

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DISCORD_TOKEN` | Your Discord bot token | Yes | None |
| `DATABASE_PATH` | Path to SQLite database | No | `/data/bets.db` |
| `TZ` | Timezone for logs | No | `UTC` |
| `GITHUB_REPO` | Repository URL (Dockge only) | No | Main repo |

## Volume Mounts

| Container Path | Description | Required |
|----------------|-------------|----------|
| `/data` | Database storage | Yes |
| `/app` | Application code (Dockge) | Auto-managed |

## Docker Management Script

For Linux/Mac users, a management script is provided:

```bash
chmod +x docker.sh

./docker.sh build    # Build image
./docker.sh start    # Start container
./docker.sh stop     # Stop container
./docker.sh logs     # View logs
./docker.sh backup   # Backup database
./docker.sh shell    # Container shell access
```

## Volume Path Configuration

### IMPORTANT: Choosing the Right Data Path

The bot needs a place to store its database (`bets.db`). You **must** update the volume path in the compose file to match your system.

#### For NAS Users

Find your dataset/share path and update the compose file:

| NAS System | Typical Path Format | Example |
|------------|-------------------|---------|
| **TrueNAS SCALE** | `/mnt/poolname/dataset` | `/mnt/tank/RoboBetBot:/data` |
| **TrueNAS CORE** | `/mnt/poolname/dataset` | `/mnt/tank/RoboBetBot:/data` |
| **Synology** | `/volume1/docker/appname` | `/volume1/docker/robobetbot:/data` |
| **QNAP** | `/share/Container/appname` | `/share/Container/robobetbot:/data` |
| **Unraid** | `/mnt/user/appdata/appname` | `/mnt/user/appdata/robobetbot:/data` |
| **OMV** | `/srv/dev-disk-by-uuid/path` | `/srv/appdata/robobetbot:/data` |

#### For VPS/Linux Users

Create a directory and use its absolute path:
```bash
mkdir -p /opt/robobetbot/data
# Then in compose: /opt/robobetbot/data:/data
```

#### For Docker Desktop Users

Use a relative path (creates folder where compose file is):
```yaml
volumes:
  - ./data:/data  # This is the default
```

### Finding Your Correct Path

**TrueNAS Users:**
1. Go to Storage → Pools/Datasets
2. Find your dataset
3. Note the "Path" or "Mount Point"
4. Use this in your compose file

**Synology Users:**
1. Open File Station
2. Navigate to your docker folder
3. Right-click → Properties
4. Use the "Location" path

**Command Line Method (All Systems):**
```bash
# Find where you want to store data
pwd  # Shows current directory
df -h  # Shows mounted filesystems
ls /mnt/  # Common mount point
ls /volume*/  # Synology volumes
```

### Why This Matters

- **Wrong path**: Data gets lost when container updates
- **Right path**: Data persists forever, easy backups
- **Default `./data`**: Only good for testing, not production

## Makefile Commands

Cross-platform commands using make:

```bash
make docker-build   # Build Docker image
make docker-up      # Start with Docker Compose
make docker-down    # Stop containers
make docker-logs    # Show logs
make backup         # Backup database
```

## Backup and Restore

### Manual Backup

```bash
# Create backup
docker exec robobetbot sqlite3 /data/bets.db ".backup /data/backup.db"
docker cp robobetbot:/data/backup.db ./backup-$(date +%Y%m%d).db

# Restore backup
docker cp ./backup.db robobetbot:/data/restore.db
docker exec robobetbot sqlite3 /data/bets.db ".restore /data/restore.db"
```

### Automated Backups

Add to crontab for daily backups:
```bash
0 2 * * * docker exec robobetbot sqlite3 /data/bets.db ".backup /data/backup-$(date +\%Y\%m\%d).db"
```

### NAS Backup Integration

Most NAS systems can backup Docker volumes:
- Synology: Hyper Backup
- QNAP: Hybrid Backup Sync
- Unraid: Appdata Backup Plugin
- TrueNAS: Periodic Snapshot Tasks

## Updating the Bot

### Standard Compose Method
```bash
cd RoboBetBot
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Dockge Method
The container auto-pulls from GitHub on restart:
1. Stop container in Dockge
2. Start container
3. Bot code updates automatically

### Docker Hub Method
```bash
docker pull yourusername/robobetbot:latest
docker-compose up -d
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs robobetbot

# Verify token is set
docker exec robobetbot printenv DISCORD_TOKEN

# Check if port is in use (if applicable)
netstat -tulpn | grep 3000
```

### Bot shows as offline
- Verify Discord token is correct
- Check network connectivity
- Ensure container is running: `docker ps`
- Review logs for authentication errors

### Permission issues
```bash
# Fix data directory permissions
sudo chown -R 1000:1000 ./data

# Or run container as root (not recommended)
# Add to docker-compose.yml:
# user: root
```

### Database locked error
```bash
# Restart container
docker restart robobetbot

# If persists, stop and remove lock
docker stop robobetbot
rm ./data/bets.db-wal ./data/bets.db-shm
docker start robobetbot
```

### High memory usage
Add resource limits to compose file:
```yaml
services:
  robobetbot:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

## Monitoring

### View logs
```bash
# Follow logs in real-time
docker logs -f robobetbot

# Last 100 lines
docker logs --tail 100 robobetbot

# With timestamps
docker logs -t robobetbot
```

### Check resource usage
```bash
# Live stats
docker stats robobetbot

# One-time check
docker stats --no-stream robobetbot
```

### Access container shell
```bash
# Interactive shell
docker exec -it robobetbot sh

# Run single command
docker exec robobetbot node -v
```

### Health check
```bash
# Check if container is healthy
docker inspect --format='{{.State.Health.Status}}' robobetbot
```

## Security Best Practices

1. **Token Management**
   - Never commit `.env` files
   - Use Docker secrets in production
   - Rotate tokens regularly

2. **Network Security**
   - Bot doesn't need incoming ports
   - Use internal Docker networks
   - Enable firewall on host

3. **Container Security**
   - Run as non-root user (default)
   - Keep base image updated
   - Use read-only filesystem where possible

4. **Data Protection**
   - Regular backups
   - Encrypt backup files
   - Secure backup storage location

## Advanced Configurations

### Using External Database

For PostgreSQL instead of SQLite:
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: robobets
      POSTGRES_USER: botuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

  robobetbot:
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://botuser:${DB_PASSWORD}@postgres:5432/robobets
```

### Multi-Container Setup

Run multiple bots for different servers:
```yaml
services:
  bot1:
    image: robobetbot
    container_name: robobetbot-server1
    environment:
      DISCORD_TOKEN: ${TOKEN_SERVER1}
    volumes:
      - ./data/server1:/data

  bot2:
    image: robobetbot
    container_name: robobetbot-server2
    environment:
      DISCORD_TOKEN: ${TOKEN_SERVER2}
    volumes:
      - ./data/server2:/data
```

### Kubernetes Deployment

Basic Kubernetes manifest:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: robobetbot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: robobetbot
  template:
    metadata:
      labels:
        app: robobetbot
    spec:
      containers:
      - name: bot
        image: robobetbot:latest
        env:
        - name: DISCORD_TOKEN
          valueFrom:
            secretKeyRef:
              name: discord-secret
              key: token
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: robobetbot-pvc
```

## Support

For Docker-specific issues:
1. Check container logs first
2. Verify environment variables
3. Ensure proper volume permissions
4. Test with minimal configuration
5. Check Docker daemon status

For NAS-specific setup, consult your device's Docker documentation.

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Dockge Documentation](https://github.com/louislam/dockge)
- [Portainer Documentation](https://docs.portainer.io/)
- [TrueNAS SCALE Apps](https://www.truenas.com/docs/scale/apps/)