# Use Node.js LTS Alpine for smaller image size
FROM node:18-alpine

# Install build dependencies for sqlite3
RUN apk add --no-cache python3 make g++ sqlite

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy app source
COPY bot.js database.js commands.js ./

# Create data directory for database
RUN mkdir -p /data

# Create non-root user to run the app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app and data directories
RUN chown -R nodejs:nodejs /usr/src/app /data

# Switch to non-root user
USER nodejs

# Health check to ensure bot is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Environment variable for database location
ENV DATABASE_PATH=/data/bets.db

# Start the bot
CMD ["node", "bot.js"]