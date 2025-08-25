#!/bin/bash

# Docker management script for RoboBetBot
# Usage: ./docker.sh [build|start|stop|restart|logs|backup|shell]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="robobetbot"
CONTAINER_NAME="robobetbot"
VERSION="1.0.0"

# Functions
print_help() {
    echo "RoboBetBot Docker Management"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build     Build the Docker image"
    echo "  start     Start the bot container"
    echo "  stop      Stop the bot container"
    echo "  restart   Restart the bot container"
    echo "  logs      Show bot logs (follow mode)"
    echo "  backup    Backup the database"
    echo "  restore   Restore database from backup"
    echo "  shell     Open shell in container"
    echo "  status    Show container status"
    echo "  update    Pull latest changes and rebuild"
    echo ""
}

build_image() {
    echo -e "${YELLOW}Building Docker image...${NC}"
    docker build -t ${IMAGE_NAME}:${VERSION} -t ${IMAGE_NAME}:latest .
    echo -e "${GREEN}✓ Image built successfully${NC}"
}

start_container() {
    echo -e "${YELLOW}Starting RoboBetBot...${NC}"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${RED}Error: .env file not found!${NC}"
        echo "Please create .env file with your Discord token:"
        echo "  cp .env.example .env"
        echo "  Edit .env and add your token"
        exit 1
    fi
    
    # Use docker-compose if available
    if [ -f docker-compose.yml ]; then
        docker-compose up -d
    else
        docker run -d \
            --name ${CONTAINER_NAME} \
            --restart unless-stopped \
            --env-file .env \
            -v $(pwd)/data:/data \
            ${IMAGE_NAME}:latest
    fi
    
    echo -e "${GREEN}✓ Bot started successfully${NC}"
    echo "Use '$0 logs' to view logs"
}

stop_container() {
    echo -e "${YELLOW}Stopping RoboBetBot...${NC}"
    
    if [ -f docker-compose.yml ]; then
        docker-compose down
    else
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ Bot stopped${NC}"
}

restart_container() {
    stop_container
    start_container
}

show_logs() {
    echo -e "${YELLOW}Showing bot logs (Ctrl+C to exit)...${NC}"
    
    if [ -f docker-compose.yml ]; then
        docker-compose logs -f
    else
        docker logs -f ${CONTAINER_NAME}
    fi
}

backup_database() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backup_${TIMESTAMP}.db"
    
    echo -e "${YELLOW}Creating database backup...${NC}"
    
    # Create backups directory if it doesn't exist
    mkdir -p backups
    
    # Copy database from container
    docker cp ${CONTAINER_NAME}:/data/bets.db ./backups/${BACKUP_FILE}
    
    echo -e "${GREEN}✓ Database backed up to: backups/${BACKUP_FILE}${NC}"
}

restore_database() {
    echo -e "${YELLOW}Available backups:${NC}"
    ls -la backups/*.db 2>/dev/null || echo "No backups found"
    
    echo ""
    read -p "Enter backup filename to restore (e.g., backup_20240101_120000.db): " BACKUP_FILE
    
    if [ ! -f "backups/${BACKUP_FILE}" ]; then
        echo -e "${RED}Error: Backup file not found!${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Restoring database from ${BACKUP_FILE}...${NC}"
    
    # Stop bot before restore
    stop_container
    
    # Copy backup to data directory
    cp "backups/${BACKUP_FILE}" ./data/bets.db
    
    # Start bot again
    start_container
    
    echo -e "${GREEN}✓ Database restored successfully${NC}"
}

open_shell() {
    echo -e "${YELLOW}Opening shell in container...${NC}"
    docker exec -it ${CONTAINER_NAME} sh
}

show_status() {
    echo -e "${YELLOW}Container Status:${NC}"
    docker ps -a --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo -e "${YELLOW}Resource Usage:${NC}"
    docker stats ${CONTAINER_NAME} --no-stream 2>/dev/null || echo "Container not running"
    
    echo ""
    echo -e "${YELLOW}Image Info:${NC}"
    docker images ${IMAGE_NAME} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
}

update_bot() {
    echo -e "${YELLOW}Updating RoboBetBot...${NC}"
    
    # Pull latest changes
    git pull origin main
    
    # Rebuild image
    build_image
    
    # Restart container
    restart_container
    
    echo -e "${GREEN}✓ Update complete${NC}"
}

# Main script
case "$1" in
    build)
        build_image
        ;;
    start)
        start_container
        ;;
    stop)
        stop_container
        ;;
    restart)
        restart_container
        ;;
    logs)
        show_logs
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database
        ;;
    shell)
        open_shell
        ;;
    status)
        show_status
        ;;
    update)
        update_bot
        ;;
    *)
        print_help
        ;;
esac