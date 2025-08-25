# Discord Betting Bot Setup Guide

## Prerequisites
- Node.js installed (v16.9.0 or higher)
- A Discord account
- Basic familiarity with terminal/command line
- Discord.js v14.0 or higher

## Step 1: Create Discord Application & Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application" and give it a name (e.g., "NFL Betting Bot")
3. Go to the "Bot" section in the left sidebar
4. Click "Reset Token" and copy the token (save it securely - you'll need it)
5. Under "Privileged Gateway Intents", enable:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT

## Step 2: Invite Bot to Your Server

1. In the Discord Developer Portal, go to OAuth2 → URL Generator
2. Select these scopes:
   - `bot`
   - `applications.commands`
3. Select these bot permissions:
   - Send Messages
   - Use Slash Commands
   - Read Messages/View Channels
   - Add Reactions
   - Manage Messages
   - Embed Links
4. Copy the generated URL and open it in your browser
5. Select your Discord server and authorize the bot

## Step 3: Project Setup

Create a new folder for your project and run:

```bash
mkdir discord-betting-bot
cd discord-betting-bot
npm init -y
npm install discord.js sqlite3 dotenv
```

### Git Repository Setup (Optional)

If you want to track your bot in Git:

```bash
git init
# Create .gitignore file (see provided .gitignore artifact)
git add .
git commit -m "Initial commit"
```

The `.gitignore` file will ensure your bot token, database, and other sensitive files never get pushed to GitHub.

## Step 4: Create Project Files

Create these files in your project folder:

### `.env`
```
DISCORD_TOKEN=your_bot_token_here
```

### `package.json`
Update the scripts section:
```json
{
  "scripts": {
    "start": "node bot.js",
    "dev": "node bot.js"
  }
}
```

## Step 5: Copy the Bot Code

Create these files:
1. `bot.js` - Main bot file
2. `database.js` - Database handler
3. `commands.js` - Command definitions

(See the code artifacts for the complete implementation)

## Step 6: Run the Bot

```bash
npm start
```

Your bot should now be online in your Discord server!

**Note:** If you're updating from a previous version, delete your old `bets.db` file to start fresh with the new two-sided betting system.

## 🤝 Fair Play Consensus System

The bot uses a consensus mechanism to ensure fairness:

**For Active Bets:**
- **Resolution** - Both participants must agree on who won before money changes hands
- **Cancellation** - Both participants must agree to void the bet

**For Pending Bets:**
- Can be cancelled immediately since there's no opposing party yet

This prevents disputes and ensures both parties are satisfied with the outcome. If either party doesn't confirm within 24 hours, the request expires and a new one can be initiated.

## How to Use the Bot

### Creating a Bet

The bot supports three types of bets:
- **Game Bet** - For team vs team matchups
- **Player Prop** - For player-specific bets (over/under stats, etc.)
- **Future/Other** - For championship futures, awards, or any other bets

```
/bet create type:[Game Bet/Player Prop/Future] amount:100 description:"Bills vs Chiefs Week 11" side_a:"Bills +3.5" side_b:"Chiefs -3.5" odds_a:"-110" odds_b:"-110"
```

Optional fields:
- `odds_a`: Odds for Side A (American or decimal format)
- `odds_b`: Odds for Side B (American or decimal format)
- `home_team`: The home team (for game bets)
- `away_team`: The away team (for game bets)  
- `player`: Player name (for prop bets)
- `details`: Any additional details

#### Odds Formats
The bot accepts both American and decimal odds:
- **American odds**: "+150", "-110", "+200", "-150"
- **Decimal odds**: "2.5", "1.91", "3.0"
- If no odds provided, defaults to even money (+100 / 2.0x)

Example commands:
```
# Game bet with spread and typical -110 odds
/bet create type:Game amount:50 description:"MNF Week 11 Spread" side_a:"Chiefs -3.5" side_b:"Bills +3.5" odds_a:"-110" odds_b:"-110" home_team:"Bills" away_team:"Chiefs"

# Moneyline bet with different odds
/bet create type:Game amount:100 description:"Chiefs @ Bills ML" side_a:"Chiefs ML" side_b:"Bills ML" odds_a:"+150" odds_b:"-180"

# Player prop bet with standard over/under odds
/bet create type:Prop amount:25 description:"Mahomes passing yards" side_a:"Over 275.5" side_b:"Under 275.5" odds_a:"-115" odds_b:"-105" player:"Patrick Mahomes"

# Future bet with heavy favorite
/bet create type:Future amount:100 description:"Super Bowl Winner" side_a:"Chiefs" side_b:"Field" odds_a:"+350" odds_b:"-450"
```

### Understanding Payouts
- The wager amount is what each person risks
- Odds determine the payout if you win
- Example: $100 bet at +150 odds = $150 profit if you win (plus your $100 back)
- Example: $100 bet at -110 odds = $90.91 profit if you win (plus your $100 back)

### Joining a Bet

After a bet is created, you'll see two emoji reactions:
- **Game Bets:** ✈️ for Away team (Side A), 🏠 for Home team (Side B)
- **Props:** ✅ for Over/Yes (Side A), ❌ for Under/No (Side B)
- **Futures:** 🎯 for Side A, 🎲 for Side B

Click the emoji for the side you want! First person to click each emoji locks in that side. Once both sides have a player, the bet becomes active.

### Resolving a Bet

When a bet is complete, either participant can initiate resolution:
```
/bet resolve bet_id:1 winning_side:[Side A/Side B]
```

**Resolution Process:**
1. One participant initiates the resolution with the command above
2. A confirmation message appears with the proposed outcome
3. **Both participants must react with ✅ to confirm**
4. Once both confirm, the bet automatically resolves and updates stats
5. If not confirmed within 24 hours, the request expires

This ensures both parties agree on the outcome before any money changes hands!

### Cancelling a Bet

The cancellation process depends on the bet status:

**For Pending Bets (≤1 participant):**
- Can be cancelled immediately by creator or the single participant
- No confirmation needed since there's no opposing party

**For Active Bets (both sides filled):**
```
/bet cancel bet_id:1
```
1. Either participant initiates cancellation
2. A confirmation message appears
3. **Both participants must react with ✅ to confirm**
4. Once both confirm, the bet is cancelled with no money changing hands
5. If not confirmed within 24 hours, the request expires

This prevents one person from backing out without mutual agreement!

### Viewing Stats
```
/stats [@user]
```
View your stats or another user's stats

### Leaderboard
```
/leaderboard
```
Shows top 10 users by total profit

### View Active Bets
```
/bets active
```
Shows all pending and active bets

### View Your Bet History
```
/bets history
```
Shows your completed bets

## Customization Tips

### Adding More Bet Types
In `commands.js`, you can add more bet types to the choices array in the create command.

### Customizing Emojis
In the `getBetEmojis()` function in `commands.js`, you can change the emojis for each bet type:
```javascript
case 'game':
    return { sideA: '✈️', sideB: '🏠' }; // Away/Home for game bets
case 'prop':
    return { sideA: '✅', sideB: '❌' }; // Yes/No or Over/Under
case 'future':
    return { sideA: '🎯', sideB: '🎲' }; // Custom choices
```

### Adjusting Leaderboard Size
In the `/leaderboard` command, change `LIMIT 10` to show more/fewer users.

### NFL Team Emojis
You could map team names to specific emojis:
```javascript
const teamEmojis = {
    'Chiefs': '🔴',
    'Bills': '🔵',
    'Eagles': '🦅',
    // etc.
}
```

## Troubleshooting

**Bot not responding to commands?**
- Make sure the bot has proper permissions in the channel
- Check that MESSAGE CONTENT INTENT is enabled in Discord Developer Portal
- Verify the bot is actually online (green dot in member list)

**Database errors?**
- The database file (`bets.db`) will be created automatically on first run
- If you need to reset, just delete `bets.db` and restart the bot
- **Important:** If updating from an older version, delete your old database to use the new schema

**Reactions not working?**
- Ensure the bot has "Add Reactions" and "Manage Messages" permissions
- Check that both sides haven't already been taken
- Users can't bet against themselves

**Resolution/Cancellation not working?**
- Make sure both participants react with ✅
- Only bet participants can confirm resolutions
- Requests expire after 24 hours
- Check there isn't already a pending request for that bet

**"fetchReply deprecated" warning?**
- This is fixed in the latest code
- The warning is harmless and won't affect bot functionality
- Update to the latest code version to remove the warning

## Future Enhancements You Could Add

1. **Odds/Spreads** - Add point spreads or odds for uneven matchups ✅ (Already implemented!)
2. **Parlay bets** - Combine multiple bets
3. **Season-long tracking** - Reset stats per season with historical records
4. **Auto-resolve** - Integrate with sports APIs to auto-resolve game bets
5. **Bet limits** - Daily/weekly betting limits to keep it friendly
6. **Push notifications** - DM users when their bets need confirmation or are resolved
7. **Bet expiration** - Auto-cancel bets that don't get accepted within 24 hours
8. **Custom team colors** - Color-code embeds based on teams
9. **Weekly summaries** - Automated Monday morning recaps
10. **Confidence pools** - Weekly pick'em style competitions
11. **Dispute resolution** - Add a moderator role that can force-resolve disputed bets
12. **Timeout protection** - Auto-resolve if one party doesn't respond to resolution request

## Security Notes

- **Never share your bot token** - treat it like a password
- The `.env` file should NEVER be committed to Git (use the provided `.gitignore`)
- Consider adding bet amount limits to prevent issues
- You might want to restrict bet creation/resolution to certain roles
- Back up your `bets.db` file regularly if you want to preserve bet history
- Consider implementing daily/weekly betting limits per user to keep things friendly

## Best Practices for Your Server

1. **Set Clear Rules** - Establish maximum bet amounts and how disputes will be handled
2. **Use a Dedicated Channel** - Keep betting in its own channel to avoid spam
3. **Regular Backups** - Back up the `bets.db` file weekly during the season
4. **Fair Play** - Consider having a neutral party resolve controversial bets
5. **Fun First** - Remember this is for entertainment, keep stakes reasonable