# Makefile for RoboBetBot
# Cross-platform bot management

.PHONY: help install start stop restart logs build-portable docker-build docker-up docker-down clean

# Default target
help:
	@echo "RoboBetBot Management Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install        Install dependencies"
	@echo "  make start          Start bot (development)"
	@echo "  make logs           Show bot logs"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build   Build Docker image"
	@echo "  make docker-up      Start with Docker Compose"
	@echo "  make docker-down    Stop Docker containers"
	@echo "  make docker-logs    Show Docker logs"
	@echo ""
	@echo "Distribution:"
	@echo "  make build-portable Build portable Windows version"
	@echo "  make release        Create full release package"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean          Remove build artifacts"
	@echo "  make backup         Backup database"

# Development targets
install:
	npm install

start:
	npm start

logs:
	tail -f *.log 2>/dev/null || echo "No log files found"

# Docker targets
docker-build:
	docker build -t robobetbot:latest .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-restart: docker-down docker-up

# Distribution targets
build-portable:
	npm run build-portable

release: clean build-portable docker-build
	@echo "Creating release package..."
	cd dist-portable && zip -r ../Discord-Betting-Bot-Portable.zip .
	@echo "Release package created: Discord-Betting-Bot-Portable.zip"

# Maintenance targets
clean:
	rm -rf dist-portable/
	rm -rf node_modules/
	rm -f *.log
	rm -f Discord-Betting-Bot-Portable.zip

backup:
	@mkdir -p backups
	@cp bets.db backups/backup-$(shell date +%Y%m%d-%H%M%S).db 2>/dev/null || echo "No database to backup"
	@echo "Backup created in backups/"

# Database management
db-reset:
	@echo "WARNING: This will delete all betting data!"
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] && rm -f bets.db && echo "Database reset" || echo "Cancelled"

# Testing
test:
	@echo "Checking bot configuration..."
	@test -f .env || (echo "ERROR: .env file missing" && exit 1)
	@echo "Configuration OK"

# Installation check
check:
	@echo "Checking requirements..."
	@command -v node >/dev/null 2>&1 || (echo "ERROR: Node.js not installed" && exit 1)
	@command -v npm >/dev/null 2>&1 || (echo "ERROR: npm not installed" && exit 1)
	@echo "Node version: $$(node -v)"
	@echo "npm version: $$(npm -v)"
	@test -f .env && echo ".env file: Found" || echo ".env file: Missing"
	@test -f bets.db && echo "Database: Found" || echo "Database: Will be created on first run"

# Docker status
docker-status:
	@docker ps -a --filter "name=robobetbot" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Platform-specific targets
ifeq ($(OS),Windows_NT)
    # Windows-specific commands
    start-win:
		@cmd /c "node bot.js"
else
    # Unix-specific commands
    install-service:
		@echo "Installing systemd service..."
		@sudo cp robobetbot.service /etc/systemd/system/
		@sudo systemctl daemon-reload
		@sudo systemctl enable robobetbot
		@echo "Service installed. Use 'sudo systemctl start robobetbot' to start"
endif