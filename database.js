// database.js
const sqlite3 = require('sqlite3').verbose();

// Docker support: Use DATABASE_PATH env variable if set, otherwise use default
// This won't affect portable or development versions at all
const DATABASE_PATH = process.env.DATABASE_PATH || './bets.db';
const db = new sqlite3.Database(DATABASE_PATH);

// Initialize database tables
function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table for tracking stats
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    username TEXT,
                    total_bets INTEGER DEFAULT 0,
                    bets_won INTEGER DEFAULT 0,
                    bets_lost INTEGER DEFAULT 0,
                    total_wagered REAL DEFAULT 0,
                    total_won REAL DEFAULT 0,
                    total_lost REAL DEFAULT 0,
                    net_profit REAL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
            });

            // Bets table - updated for two-sided betting with odds
            db.run(`
                CREATE TABLE IF NOT EXISTS bets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    creator_id TEXT NOT NULL,
                    bet_type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    amount REAL NOT NULL,
                    side_a_description TEXT NOT NULL,
                    side_b_description TEXT NOT NULL,
                    side_a_odds REAL DEFAULT 2.0,
                    side_b_odds REAL DEFAULT 2.0,
                    side_a_emoji TEXT DEFAULT '✈️',
                    side_b_emoji TEXT DEFAULT '🏠',
                    side_a_user_id TEXT,
                    side_b_user_id TEXT,
                    home_team TEXT,
                    away_team TEXT,
                    player_name TEXT,
                    other_details TEXT,
                    status TEXT DEFAULT 'pending',
                    winning_side TEXT,
                    message_id TEXT,
                    channel_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    accepted_at DATETIME,
                    resolved_at DATETIME,
                    FOREIGN KEY (creator_id) REFERENCES users(user_id),
                    FOREIGN KEY (side_a_user_id) REFERENCES users(user_id),
                    FOREIGN KEY (side_b_user_id) REFERENCES users(user_id)
                )
            `, (err) => {
                if (err) reject(err);
            });

            // Resolution requests table
            db.run(`
                CREATE TABLE IF NOT EXISTS resolution_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bet_id INTEGER NOT NULL,
                    request_type TEXT NOT NULL, -- 'resolve' or 'cancel'
                    proposed_winner TEXT, -- 'A' or 'B' for resolutions, NULL for cancellations
                    side_a_confirmed BOOLEAN DEFAULT 0,
                    side_b_confirmed BOOLEAN DEFAULT 0,
                    message_id TEXT,
                    channel_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    FOREIGN KEY (bet_id) REFERENCES bets(id)
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });

            // Create indexes for better performance
            db.run(`CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_bets_creator ON bets(creator_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_bets_side_a ON bets(side_a_user_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_bets_side_b ON bets(side_b_user_id)`);
        });
    });
}

// Create or update user
function upsertUser(userId, username) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO users (user_id, username)
            VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                username = excluded.username,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, username], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

// Create a new bet
function createBet(betData) {
    return new Promise((resolve, reject) => {
        const {
            creatorId, betType, description, amount,
            sideADesc, sideBDesc, sideAOdds, sideBOdds,
            sideAEmoji, sideBEmoji,
            homeTeam, awayTeam, playerName, otherDetails,
            messageId, channelId
        } = betData;
        
        db.run(`
            INSERT INTO bets (
                creator_id, bet_type, description, amount,
                side_a_description, side_b_description,
                side_a_odds, side_b_odds,
                side_a_emoji, side_b_emoji,
                home_team, away_team, player_name, other_details,
                message_id, channel_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            creatorId, betType, description, amount,
            sideADesc, sideBDesc, sideAOdds, sideBOdds,
            sideAEmoji, sideBEmoji,
            homeTeam, awayTeam, playerName, otherDetails,
            messageId, channelId
        ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

// Join a side of the bet
function joinBetSide(betId, userId, side) {
    return new Promise((resolve, reject) => {
        const sideColumn = side === 'A' ? 'side_a_user_id' : 'side_b_user_id';
        
        // First check if side is already taken
        db.get(`SELECT ${sideColumn} FROM bets WHERE id = ?`, [betId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row && row[sideColumn]) {
                resolve({ success: false, reason: 'taken' });
                return;
            }
            
            // Join the side
            db.run(`
                UPDATE bets 
                SET ${sideColumn} = ?
                WHERE id = ? AND ${sideColumn} IS NULL
            `, [userId, betId], function(err) {
                if (err) reject(err);
                else {
                    // Check if both sides are now filled
                    db.get(`
                        SELECT side_a_user_id, side_b_user_id 
                        FROM bets WHERE id = ?
                    `, [betId], (err, row) => {
                        if (err) reject(err);
                        else if (row && row.side_a_user_id && row.side_b_user_id) {
                            // Both sides filled, activate the bet
                            db.run(`
                                UPDATE bets 
                                SET status = 'active', accepted_at = CURRENT_TIMESTAMP
                                WHERE id = ?
                            `, [betId], (err) => {
                                if (err) reject(err);
                                else resolve({ success: true, activated: true });
                            });
                        } else {
                            resolve({ success: true, activated: false });
                        }
                    });
                }
            });
        });
    });
}

// Get bet by message ID
function getBetByMessageId(messageId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT * FROM bets 
            WHERE message_id = ?
        `, [messageId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Get bet by ID
function getBetById(betId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT * FROM bets 
            WHERE id = ?
        `, [betId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Resolve a bet
function resolveBet(betId, winningSide) {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE bets 
            SET winning_side = ?, 
                status = 'resolved',
                resolved_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'active'
        `, [winningSide, betId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

// Update user stats after bet resolution
function updateUserStats(userId, won, amount, profit) {
    return new Promise((resolve, reject) => {
        const wonCol = won ? 'bets_won' : 'bets_lost';
        const wonAmountCol = won ? 'total_won' : 'total_lost';
        
        db.run(`
            UPDATE users 
            SET total_bets = total_bets + 1,
                ${wonCol} = ${wonCol} + 1,
                total_wagered = total_wagered + ?,
                ${wonAmountCol} = ${wonAmountCol} + ?,
                net_profit = net_profit + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [amount, Math.abs(profit), profit, userId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Get user stats
function getUserStats(userId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT * FROM users 
            WHERE user_id = ?
        `, [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Get leaderboard
function getLeaderboard(limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM users 
            WHERE total_bets > 0
            ORDER BY net_profit DESC 
            LIMIT ?
        `, [limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Get active bets
function getActiveBets() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT b.*, 
                   u1.username as creator_name,
                   u2.username as side_a_username,
                   u3.username as side_b_username
            FROM bets b
            LEFT JOIN users u1 ON b.creator_id = u1.user_id
            LEFT JOIN users u2 ON b.side_a_user_id = u2.user_id
            LEFT JOIN users u3 ON b.side_b_user_id = u3.user_id
            WHERE b.status IN ('pending', 'active')
            ORDER BY b.created_at DESC
        `, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Get user's bet history
function getUserBetHistory(userId, limit = 20) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT b.*,
                   u1.username as creator_name,
                   u2.username as side_a_username,
                   u3.username as side_b_username
            FROM bets b
            LEFT JOIN users u1 ON b.creator_id = u1.user_id
            LEFT JOIN users u2 ON b.side_a_user_id = u2.user_id
            LEFT JOIN users u3 ON b.side_b_user_id = u3.user_id
            WHERE (b.side_a_user_id = ? OR b.side_b_user_id = ?)
                AND b.status = 'resolved'
            ORDER BY b.resolved_at DESC
            LIMIT ?
        `, [userId, userId, limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Cancel a bet (for pending bets only)
function cancelBet(betId) {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE bets 
            SET status = 'cancelled',
                resolved_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'pending'
        `, [betId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

// Create a resolution request
function createResolutionRequest(betId, requestType, proposedWinner, messageId, channelId) {
    return new Promise((resolve, reject) => {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        db.run(`
            INSERT INTO resolution_requests (bet_id, request_type, proposed_winner, message_id, channel_id, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [betId, requestType, proposedWinner, messageId, channelId, expiresAt.toISOString()], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

// Get resolution request by message ID
function getResolutionRequestByMessageId(messageId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT rr.*, b.side_a_user_id, b.side_b_user_id, b.amount, 
                   b.side_a_odds, b.side_b_odds, b.description,
                   b.side_a_description, b.side_b_description
            FROM resolution_requests rr
            JOIN bets b ON rr.bet_id = b.id
            WHERE rr.message_id = ?
        `, [messageId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Confirm resolution request
function confirmResolutionRequest(requestId, userId, userSide) {
    return new Promise((resolve, reject) => {
        const column = userSide === 'A' ? 'side_a_confirmed' : 'side_b_confirmed';
        db.run(`
            UPDATE resolution_requests 
            SET ${column} = 1
            WHERE id = ?
        `, [requestId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            
            // Check if both sides confirmed
            db.get(`
                SELECT * FROM resolution_requests
                WHERE id = ?
            `, [requestId], (err, row) => {
                if (err) reject(err);
                else resolve({
                    success: true,
                    bothConfirmed: row.side_a_confirmed && row.side_b_confirmed,
                    request: row
                });
            });
        });
    });
}

// Cancel active bet with agreement
function cancelActiveBet(betId) {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE bets 
            SET status = 'cancelled',
                resolved_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'active'
        `, [betId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

// Delete resolution request
function deleteResolutionRequest(requestId) {
    return new Promise((resolve, reject) => {
        db.run(`
            DELETE FROM resolution_requests
            WHERE id = ?
        `, [requestId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

// Get active resolution request for a bet
function getActiveResolutionRequest(betId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT * FROM resolution_requests
            WHERE bet_id = ? AND expires_at > datetime('now')
            ORDER BY created_at DESC
            LIMIT 1
        `, [betId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

module.exports = {
    initDatabase,
    upsertUser,
    createBet,
    joinBetSide,
    getBetByMessageId,
    getBetById,
    resolveBet,
    updateUserStats,
    getUserStats,
    getLeaderboard,
    getActiveBets,
    getUserBetHistory,
    cancelBet,
    createResolutionRequest,
    getResolutionRequestByMessageId,
    confirmResolutionRequest,
    cancelActiveBet,
    deleteResolutionRequest,
    getActiveResolutionRequest
};