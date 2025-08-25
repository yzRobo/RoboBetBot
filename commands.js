// commands.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./database');

// Register slash commands
async function registerCommands(guild) {
    const commands = [
        new SlashCommandBuilder()
            .setName('bet')
            .setDescription('Betting commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('create')
                    .setDescription('Create a new bet')
                    .addStringOption(option =>
                        option.setName('type')
                            .setDescription('Type of bet')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Game Bet', value: 'game' },
                                { name: 'Player Prop', value: 'prop' },
                                { name: 'Future/Other', value: 'future' }
                            ))
                    .addNumberOption(option =>
                        option.setName('amount')
                            .setDescription('Bet amount')
                            .setRequired(true)
                            .setMinValue(1))
                    .addStringOption(option =>
                        option.setName('description')
                            .setDescription('Overall bet description')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('side_a')
                            .setDescription('First side/outcome (e.g., "Chiefs win", "Over 45.5")')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('side_b')
                            .setDescription('Second side/outcome (e.g., "Bills win", "Under 45.5")')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('odds_a')
                            .setDescription('Odds for Side A (e.g., "-110", "+150", "1.91")')
                            .setRequired(false))
                    .addStringOption(option =>
                        option.setName('odds_b')
                            .setDescription('Odds for Side B (e.g., "-110", "+150", "1.91")')
                            .setRequired(false))
                    .addStringOption(option =>
                        option.setName('home_team')
                            .setDescription('Home team (for game bets)')
                            .setRequired(false))
                    .addStringOption(option =>
                        option.setName('away_team')
                            .setDescription('Away team (for game bets)')
                            .setRequired(false))
                    .addStringOption(option =>
                        option.setName('player')
                            .setDescription('Player name (for prop bets)')
                            .setRequired(false))
                    .addStringOption(option =>
                        option.setName('details')
                            .setDescription('Any other details')
                            .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('resolve')
                    .setDescription('Request to resolve a bet (requires both participants to confirm)')
                    .addIntegerOption(option =>
                        option.setName('bet_id')
                            .setDescription('ID of the bet to resolve')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('winning_side')
                            .setDescription('Which side won?')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Side A (Away/First)', value: 'A' },
                                { name: 'Side B (Home/Second)', value: 'B' }
                            )))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('cancel')
                    .setDescription('Cancel a bet (pending: immediate, active: requires both to confirm)')
                    .addIntegerOption(option =>
                        option.setName('bet_id')
                            .setDescription('ID of the bet to cancel')
                            .setRequired(true))),
        
        new SlashCommandBuilder()
            .setName('bets')
            .setDescription('View bets')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('active')
                    .setDescription('View all active and pending bets'))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('history')
                    .setDescription('View your bet history')),
        
        new SlashCommandBuilder()
            .setName('stats')
            .setDescription('View betting statistics')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('User to view stats for (leave empty for your own)')
                    .setRequired(false)),
        
        new SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('View the betting leaderboard')
    ];

    await guild.commands.set(commands);
}

// Handle slash command interactions
async function handleInteraction(interaction, client) {
    const { commandName } = interaction;

    if (commandName === 'bet') {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'create') {
            await handleCreateBet(interaction, client);
        } else if (subcommand === 'resolve') {
            await handleResolveBet(interaction);
        } else if (subcommand === 'cancel') {
            await handleCancelBet(interaction);
        }
    } else if (commandName === 'bets') {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'active') {
            await handleViewActiveBets(interaction);
        } else if (subcommand === 'history') {
            await handleViewHistory(interaction);
        }
    } else if (commandName === 'stats') {
        await handleViewStats(interaction);
    } else if (commandName === 'leaderboard') {
        await handleViewLeaderboard(interaction);
    }
}

// Get appropriate emojis based on bet type
function getBetEmojis(betType) {
    switch(betType) {
        case 'game':
            return { sideA: '✈️', sideB: '🏠' };
        case 'prop':
            return { sideA: '✅', sideB: '❌' };
        case 'future':
            return { sideA: '🎯', sideB: '🎲' };
        default:
            return { sideA: '1️⃣', sideB: '2️⃣' };
    }
}

// Get bet type display name
function getBetTypeDisplay(betType) {
    switch(betType) {
        case 'game': return '🏈 Game Bet';
        case 'prop': return '👤 Player Prop';
        case 'future': return '🔮 Future/Other';
        default: return '🎲 Bet';
    }
}

// Convert American odds to decimal odds
function americanToDecimal(american) {
    const num = parseFloat(american);
    if (num > 0) {
        return (num / 100) + 1;
    } else {
        return (100 / Math.abs(num)) + 1;
    }
}

// Parse odds input (handles American and decimal formats)
function parseOdds(oddsStr) {
    if (!oddsStr) return 2.0; // Default to even money
    
    // Remove whitespace
    oddsStr = oddsStr.trim();
    
    // Check if American odds (starts with + or -, or is just a negative number)
    if (oddsStr.startsWith('+') || oddsStr.startsWith('-')) {
        return americanToDecimal(oddsStr);
    }
    
    // Otherwise treat as decimal odds
    const decimal = parseFloat(oddsStr);
    if (isNaN(decimal) || decimal < 1.01) return 2.0;
    return decimal;
}

// Format odds for display (shows both American and decimal)
function formatOdds(decimal) {
    // Convert to American
    let american;
    if (decimal >= 2.0) {
        american = `+${Math.round((decimal - 1) * 100)}`;
    } else {
        american = `-${Math.round(100 / (decimal - 1))}`;
    }
    
    return `${american} (${decimal.toFixed(2)}x)`;
}

// Calculate potential payout
function calculatePayout(amount, odds) {
    return amount * odds;
}

// Create a new bet
async function handleCreateBet(interaction, client) {
    const betType = interaction.options.getString('type');
    const amount = interaction.options.getNumber('amount');
    const description = interaction.options.getString('description');
    const sideADesc = interaction.options.getString('side_a');
    const sideBDesc = interaction.options.getString('side_b');
    const sideAOddsStr = interaction.options.getString('odds_a');
    const sideBOddsStr = interaction.options.getString('odds_b');
    const homeTeam = interaction.options.getString('home_team');
    const awayTeam = interaction.options.getString('away_team');
    const playerName = interaction.options.getString('player');
    const otherDetails = interaction.options.getString('details');
    const creator = interaction.user;

    // Parse odds
    const sideAOdds = parseOdds(sideAOddsStr);
    const sideBOdds = parseOdds(sideBOddsStr);

    // Get emojis for this bet type
    const emojis = getBetEmojis(betType);

    // Ensure user exists in database
    await db.upsertUser(creator.id, creator.username);

    // Create embed for the bet
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`${getBetTypeDisplay(betType)} - ${amount}`)
        .setDescription(`**${description}**`)
        .addFields(
            { 
                name: `${emojis.sideA} Side A`, 
                value: `${sideADesc}\n**Odds:** ${formatOdds(sideAOdds)}\n**To Win:** ${(calculatePayout(amount, sideAOdds) - amount).toFixed(2)}`, 
                inline: true 
            },
            { 
                name: `${emojis.sideB} Side B`, 
                value: `${sideBDesc}\n**Odds:** ${formatOdds(sideBOdds)}\n**To Win:** ${(calculatePayout(amount, sideBOdds) - amount).toFixed(2)}`, 
                inline: true 
            },
            { name: '\u200B', value: '\u200B', inline: true } // Empty field for spacing
        );

    // Add type-specific fields
    if (betType === 'game' && (homeTeam || awayTeam)) {
        embed.addFields(
            { name: '✈️ Away', value: awayTeam || 'N/A', inline: true },
            { name: '🏠 Home', value: homeTeam || 'N/A', inline: true },
            { name: '\u200B', value: '\u200B', inline: true }
        );
    } else if (betType === 'prop' && playerName) {
        embed.addFields(
            { name: '👤 Player', value: playerName, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },
            { name: '\u200B', value: '\u200B', inline: true }
        );
    }

    if (otherDetails) {
        embed.addFields({ name: '📝 Additional Details', value: otherDetails, inline: false });
    }

    embed.addFields(
        { name: 'Wager Amount', value: `${amount.toFixed(2)} each side`, inline: true },
        { name: 'Status', value: '⏳ Waiting for participants', inline: true },
        { name: 'Bet ID', value: 'Creating...', inline: true }
    );

    embed.setFooter({ 
        text: betType === 'game' ? 
            `React with ${emojis.sideA} for Away team or ${emojis.sideB} for Home team | Created by ${creator.username}` :
            `React with ${emojis.sideA} for Side A or ${emojis.sideB} for Side B | Created by ${creator.username}` 
    });
    embed.setTimestamp();

    // Send the embed
    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();
    
    // Add reactions for both sides
    await message.react(emojis.sideA);
    await message.react(emojis.sideB);

    // Create bet in database with message ID
    const betData = {
        creatorId: creator.id,
        betType,
        description,
        amount,
        sideADesc,
        sideBDesc,
        sideAOdds,
        sideBOdds,
        sideAEmoji: emojis.sideA,
        sideBEmoji: emojis.sideB,
        homeTeam,
        awayTeam,
        playerName,
        otherDetails,
        messageId: message.id,
        channelId: interaction.channelId
    };

    const betId = await db.createBet(betData);

    // Update embed with bet ID
    const fieldIndex = embed.data.fields.findIndex(f => f.name === 'Bet ID');
    embed.data.fields[fieldIndex].value = `#${betId}`;
    await message.edit({ embeds: [embed] });

    // Store in active bets map
    client.activeBets.set(message.id, betId);
}

// Handle reaction for joining a bet side
async function handleReactionAdd(reaction, user, client) {
    const messageId = reaction.message.id;
    
    // Check if this is a bet message
    const bet = await db.getBetByMessageId(messageId);
    if (!bet) return;

    // Can't bet against yourself
    if ((bet.side_a_user_id === user.id) || (bet.side_b_user_id === user.id)) {
        await reaction.users.remove(user.id);
        return;
    }

    // Determine which side based on emoji
    let side;
    if (reaction.emoji.name === bet.side_a_emoji) {
        side = 'A';
    } else if (reaction.emoji.name === bet.side_b_emoji) {
        side = 'B';
    } else {
        return; // Not a valid bet emoji
    }

    // Ensure user exists in database
    await db.upsertUser(user.id, user.username);

    // Try to join the side
    const result = await db.joinBetSide(bet.id, user.id, side);
    
    if (!result.success) {
        // Side already taken
        await reaction.users.remove(user.id);
        return;
    }

    // Update the embed
    const message = reaction.message;
    const embed = EmbedBuilder.from(message.embeds[0]);
    
    // Find and update the appropriate side field
    let sideFieldName;
    if (bet.bet_type === 'game') {
        sideFieldName = side === 'A' ? 
            `${bet.side_a_emoji} Away Team (Side A)` : 
            `${bet.side_b_emoji} Home Team (Side B)`;
    } else {
        sideFieldName = side === 'A' ? 
            `${bet.side_a_emoji} Side A` : 
            `${bet.side_b_emoji} Side B`;
    }
    
    const fieldIndex = embed.data.fields.findIndex(f => f.name === sideFieldName);
    if (fieldIndex !== -1) {
        const sideDesc = side === 'A' ? bet.side_a_description : bet.side_b_description;
        const sideOdds = side === 'A' ? bet.side_a_odds : bet.side_b_odds;
        const potentialWin = calculatePayout(bet.amount, sideOdds) - bet.amount;
        
        embed.data.fields[fieldIndex].value = 
            `${sideDesc}\n**Odds:** ${formatOdds(sideOdds)}\n**To Win:** ${potentialWin.toFixed(2)}\n**Taken by:** <@${user.id}>`;
    }

    if (result.activated) {
        // Both sides filled - bet is active
        const statusFieldIndex = embed.data.fields.findIndex(f => f.name === 'Status');
        embed.data.fields[statusFieldIndex].value = '✅ Active - Both sides filled!';
        embed.setColor(0x00FF00);
        embed.setFooter({ text: 'Bet is now active! Good luck to both players!' });

        // Get the other user's ID
        const updatedBet = await db.getBetById(bet.id);
        const otherUserId = side === 'A' ? updatedBet.side_b_user_id : updatedBet.side_a_user_id;
        const otherSideOdds = side === 'A' ? bet.side_b_odds : bet.side_a_odds;
        const userOdds = side === 'A' ? bet.side_a_odds : bet.side_b_odds;
        
        await message.edit({ embeds: [embed] });
        await message.channel.send(
            `🎲 **Bet #${bet.id} is now active!**\n` +
            `<@${user.id}> (Side ${side} @ ${formatOdds(userOdds)}) vs <@${otherUserId}> (Side ${side === 'A' ? 'B' : 'A'} @ ${formatOdds(otherSideOdds)})\n` +
            `**Stakes:** ${bet.amount} each`
        );

        // Remove from active bets map since it's now filled
        client.activeBets.delete(messageId);
    } else {
        // Update status to show one side filled
        const statusFieldIndex = embed.data.fields.findIndex(f => f.name === 'Status');
        embed.data.fields[statusFieldIndex].value = `⏳ Side ${side} taken, waiting for opponent`;
        
        await message.edit({ embeds: [embed] });
    }
}

// Resolve a bet
async function handleResolveBet(interaction) {
    const betId = interaction.options.getInteger('bet_id');
    const winningSide = interaction.options.getString('winning_side');
    const resolver = interaction.user;

    // Get the bet
    const bet = await db.getBetById(betId);
    
    if (!bet) {
        await interaction.reply({ content: '❌ Bet not found!', ephemeral: true });
        return;
    }

    if (bet.status !== 'active') {
        await interaction.reply({ content: '❌ This bet is not active!', ephemeral: true });
        return;
    }

    // Only creator can resolve (you could change this to allow either participant)
    if (bet.creator_id !== resolver.id) {
        await interaction.reply({ content: '❌ Only the bet creator can resolve it!', ephemeral: true });
        return;
    }

    // Resolve the bet
    await db.resolveBet(betId, winningSide);

    // Determine winner and loser
    const winnerId = winningSide === 'A' ? bet.side_a_user_id : bet.side_b_user_id;
    const loserId = winningSide === 'A' ? bet.side_b_user_id : bet.side_a_user_id;
    
    // Calculate payouts based on odds
    const winnerOdds = winningSide === 'A' ? bet.side_a_odds : bet.side_b_odds;
    const winnerPayout = calculatePayout(bet.amount, winnerOdds) - bet.amount; // Profit only
    const loserLoss = -bet.amount;
    
    // Update stats
    await db.updateUserStats(winnerId, true, bet.amount, winnerPayout);
    await db.updateUserStats(loserId, false, bet.amount, loserLoss);

    // Send confirmation
    const winnerDesc = winningSide === 'A' ? bet.side_a_description : bet.side_b_description;
    const loserDesc = winningSide === 'A' ? bet.side_b_description : bet.side_a_description;
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Bet Resolved!')
        .setDescription(`**Bet #${betId}: ${bet.description}**`)
        .addFields(
            { 
                name: '🏆 Winner', 
                value: `<@${winnerId}>\n**Side ${winningSide}:** ${winnerDesc}\n**Wagered:** ${bet.amount.toFixed(2)}\n**Won:** +${winnerPayout.toFixed(2)}\n**Total Return:** ${(bet.amount + winnerPayout).toFixed(2)}`, 
                inline: true 
            },
            { 
                name: '❌ Loser', 
                value: `<@${loserId}>\n**Side ${winningSide === 'A' ? 'B' : 'A'}:** ${loserDesc}\n**Lost:** -${bet.amount.toFixed(2)}`, 
                inline: true 
            }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// Cancel a bet
async function handleCancelBet(interaction) {
    const betId = interaction.options.getInteger('bet_id');
    const canceller = interaction.user;

    // Get the bet
    const bet = await db.getBetById(betId);
    
    if (!bet) {
        await interaction.reply({ content: '❌ Bet not found!', ephemeral: true });
        return;
    }

    if (bet.status !== 'pending') {
        await interaction.reply({ content: '❌ Only pending bets can be cancelled!', ephemeral: true });
        return;
    }

    // Only creator can cancel
    if (bet.creator_id !== canceller.id) {
        await interaction.reply({ content: '❌ Only the bet creator can cancel it!', ephemeral: true });
        return;
    }

    // Cancel the bet
    await db.cancelBet(betId);

    await interaction.reply({ content: `✅ Bet #${betId} has been cancelled.` });
}

// View active bets
async function handleViewActiveBets(interaction) {
    const bets = await db.getActiveBets();

    if (bets.length === 0) {
        await interaction.reply({ content: 'No active bets at the moment!' });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📊 Active & Pending Bets')
        .setTimestamp();

    for (const bet of bets.slice(0, 10)) { // Show max 10
        const status = bet.status === 'pending' ? '⏳ Pending' : '✅ Active';
        const sideAInfo = `${bet.side_a_description} @ ${formatOdds(bet.side_a_odds)}`;
        const sideBInfo = `${bet.side_b_description} @ ${formatOdds(bet.side_b_odds)}`;
        
        const participants = bet.status === 'active' ? 
            `**Side A:** <@${bet.side_a_user_id}> (${sideAInfo})\n**Side B:** <@${bet.side_b_user_id}> (${sideBInfo})` : 
            `**Side A:** ${bet.side_a_user_id ? `<@${bet.side_a_user_id}>` : 'Open'} (${sideAInfo})\n**Side B:** ${bet.side_b_user_id ? `<@${bet.side_b_user_id}>` : 'Open'} (${sideBInfo})`;
        
        embed.addFields({
            name: `Bet #${bet.id} - ${status} - ${bet.amount}`,
            value: `**${bet.description}**\n${participants}`,
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

// View bet history
async function handleViewHistory(interaction) {
    const userId = interaction.user.id;
    const history = await db.getUserBetHistory(userId);

    if (history.length === 0) {
        await interaction.reply({ content: 'You have no bet history yet!' });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📜 Your Bet History')
        .setTimestamp();

    for (const bet of history.slice(0, 10)) { // Show max 10
        const userSide = bet.side_a_user_id === userId ? 'A' : 'B';
        const userOdds = userSide === 'A' ? bet.side_a_odds : bet.side_b_odds;
        const won = bet.winning_side === userSide;
        const emoji = won ? '✅' : '❌';
        const profit = won ? (calculatePayout(bet.amount, userOdds) - bet.amount) : -bet.amount;
        const profitStr = profit >= 0 ? `+${profit.toFixed(2)}` : `-${Math.abs(profit).toFixed(2)}`;
        
        const opponentId = userSide === 'A' ? bet.side_b_user_id : bet.side_a_user_id;
        const userChoice = userSide === 'A' ? bet.side_a_description : bet.side_b_description;
        
        embed.addFields({
            name: `${emoji} Bet #${bet.id} - ${profitStr}`,
            value: `**${bet.description}**\n**Your pick:** ${userChoice} @ ${formatOdds(userOdds)}\n**Opponent:** <@${opponentId}>\n**Wager:** ${bet.amount}`,
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

// View stats
async function handleViewStats(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const stats = await db.getUserStats(targetUser.id);

    if (!stats || stats.total_bets === 0) {
        await interaction.reply({ content: `${targetUser.username} has no betting history yet!` });
        return;
    }

    const winRate = ((stats.bets_won / stats.total_bets) * 100).toFixed(1);
    const avgBet = (stats.total_wagered / stats.total_bets).toFixed(2);

    const embed = new EmbedBuilder()
        .setColor(stats.net_profit >= 0 ? 0x00FF00 : 0xFF0000)
        .setTitle(`📊 ${targetUser.username}'s Betting Stats`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
            { name: 'Total Bets', value: stats.total_bets.toString(), inline: true },
            { name: 'Won', value: stats.bets_won.toString(), inline: true },
            { name: 'Lost', value: stats.bets_lost.toString(), inline: true },
            { name: 'Win Rate', value: `${winRate}%`, inline: true },
            { name: 'Average Bet', value: `$${avgBet}`, inline: true },
            { name: 'Total Wagered', value: `$${stats.total_wagered.toFixed(2)}`, inline: true },
            { name: 'Total Won', value: `$${stats.total_won.toFixed(2)}`, inline: true },
            { name: 'Total Lost', value: `$${stats.total_lost.toFixed(2)}`, inline: true },
            { name: 'Net Profit', value: `${stats.net_profit >= 0 ? '+' : ''}$${stats.net_profit.toFixed(2)}`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// View leaderboard
async function handleViewLeaderboard(interaction) {
    const leaderboard = await db.getLeaderboard(10);

    if (leaderboard.length === 0) {
        await interaction.reply({ content: 'No betting data yet!' });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 Betting Leaderboard')
        .setDescription('Top 10 by Net Profit')
        .setTimestamp();

    let description = '';
    for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const profit = user.net_profit >= 0 ? `+$${user.net_profit.toFixed(2)}` : `-$${Math.abs(user.net_profit).toFixed(2)}`;
        const winRate = user.total_bets > 0 ? ((user.bets_won / user.total_bets) * 100).toFixed(1) : '0.0';
        
        description += `${medal} **${user.username}**\n`;
        description += `   Profit: **${profit}** | Record: ${user.bets_won}W-${user.bets_lost}L (${winRate}%)\n\n`;
    }

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed] });
}

module.exports = {
    registerCommands,
    handleInteraction,
    handleReactionAdd
};