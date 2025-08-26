// commands.js - Updated with proper peer-to-peer odds handling
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./database');

// Track resolution attempts (messageId -> { sideA: Set<userId>, sideB: Set<userId>, cancel: Set<userId> })
const resolutionTracking = new Map();

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
                            .setDescription('Base amount to win (pot will be calculated from odds)')
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
            await handleResolveBet(interaction, client);
        } else if (subcommand === 'cancel') {
            await handleCancelBet(interaction, client);
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
            return { sideA: '⬆️', sideB: '⬇️' };
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

// Calculate stake needed based on odds to win a specific amount
function calculateStakeToWin(amountToWin, odds) {
    // For decimal odds: stake = amountToWin / (odds - 1)
    return amountToWin / (odds - 1);
}

// Calculate proper stakes for balanced peer-to-peer betting
function calculateBalancedStakes(baseAmount, oddsA, oddsB) {
    // In true peer-to-peer betting, the pot must balance
    // Winner gets their stake back plus the loser's stake
    
    let stakeA, stakeB, toWinA, toWinB;
    
    if (oddsA >= oddsB) {
        // Side A is underdog (higher odds)
        // Underdog stakes less to win more
        stakeA = baseAmount;
        toWinA = baseAmount * (oddsA - 1);
        stakeB = toWinA;  // Favorite must stake what underdog wins
        toWinB = stakeA;  // Favorite wins the underdog's stake
    } else {
        // Side B is underdog (higher odds)
        // Underdog stakes less to win more
        stakeB = baseAmount;
        toWinB = baseAmount * (oddsB - 1);
        stakeA = toWinB;  // Favorite must stake what underdog wins
        toWinA = stakeB;  // Favorite wins the underdog's stake
    }
    
    // Verify the pot balances
    const totalPot = stakeA + stakeB;
    
    return {
        stakeA: stakeA,
        stakeB: stakeB,
        toWinA: toWinA,
        toWinB: toWinB,
        totalPot: totalPot
    };
}

// Create a new bet
async function handleCreateBet(interaction, client) {
    const betType = interaction.options.getString('type');
    const baseAmount = interaction.options.getNumber('amount');
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

    // Calculate proper stakes for balanced betting
    const stakes = calculateBalancedStakes(baseAmount, sideAOdds, sideBOdds);

    // Get emojis for this bet type
    const emojis = getBetEmojis(betType);

    // Ensure user exists in database
    await db.upsertUser(creator.id, creator.username);

    // Create embed for the bet
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`${getBetTypeDisplay(betType)} - Pot: $${stakes.totalPot.toFixed(2)}`)
        .setDescription(`**${description}**`)
        .addFields(
            { 
                name: `${emojis.sideA} Side A`, 
                value: `${sideADesc}\n**Odds:** ${formatOdds(sideAOdds)}\n**Stake:** $${stakes.stakeA.toFixed(2)}\n**To Win:** $${stakes.toWinA.toFixed(2)}`, 
                inline: true 
            },
            { 
                name: `${emojis.sideB} Side B`, 
                value: `${sideBDesc}\n**Odds:** ${formatOdds(sideBOdds)}\n**Stake:** $${stakes.stakeB.toFixed(2)}\n**To Win:** $${stakes.toWinB.toFixed(2)}`, 
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
        { name: 'Total Pot', value: `$${stakes.totalPot.toFixed(2)}`, inline: true },
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

    // Create bet in database with UPDATED stake amounts
    const betData = {
        creatorId: creator.id,
        betType,
        description,
        amount: baseAmount, // Store base amount
        sideAStake: stakes.stakeA, // NEW: Store actual stake for side A
        sideBStake: stakes.stakeB, // NEW: Store actual stake for side B
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

// Handle joining a bet through emoji reaction
async function handleJoinBet(reaction, user, client, bet) {
    // Determine which side based on emoji
    let side;
    if (reaction.emoji.name === bet.side_a_emoji) {
        side = 'A';
    } else if (reaction.emoji.name === bet.side_b_emoji) {
        side = 'B';
    } else {
        return;
    }

    // Can't bet against yourself
    if ((side === 'A' && bet.side_b_user_id === user.id) || 
        (side === 'B' && bet.side_a_user_id === user.id)) {
        await reaction.users.remove(user.id);
        return;
    }

    // Check if user already has this side
    if ((side === 'A' && bet.side_a_user_id === user.id) || 
        (side === 'B' && bet.side_b_user_id === user.id)) {
        return;
    }

    // Ensure user exists in database
    await db.upsertUser(user.id, user.username);

    // Try to join the side
    const result = await db.joinBetSide(bet.id, user.id, side);
    
    if (!result.success) {
        await reaction.users.remove(user.id);
        return;
    }

    // Update the embed
    const message = reaction.message;
    const embed = EmbedBuilder.from(message.embeds[0]);
    
    // Calculate stakes for display
    const stakes = calculateBalancedStakes(bet.amount, bet.side_a_odds, bet.side_b_odds);
    
    // Find and update the appropriate side field
    const sideFieldIndex = embed.data.fields.findIndex(f => 
        f.name.includes('Side A') || f.name.includes('Side B')
    );
    if (side === 'A' && sideFieldIndex !== -1) {
        embed.data.fields[sideFieldIndex].value = 
            `${bet.side_a_description}\n**Odds:** ${formatOdds(bet.side_a_odds)}\n**Stake:** $${stakes.stakeA.toFixed(2)}\n**To Win:** $${stakes.toWinA.toFixed(2)}\n**Taken by:** <@${user.id}>`;
    } else if (side === 'B' && sideFieldIndex !== -1) {
        const sideFieldIndexB = sideFieldIndex + 1;
        embed.data.fields[sideFieldIndexB].value = 
            `${bet.side_b_description}\n**Odds:** ${formatOdds(bet.side_b_odds)}\n**Stake:** $${stakes.stakeB.toFixed(2)}\n**To Win:** $${stakes.toWinB.toFixed(2)}\n**Taken by:** <@${user.id}>`;
    }

    if (result.activated) {
        // Both sides filled - bet is active
        const statusFieldIndex = embed.data.fields.findIndex(f => f.name === 'Status');
        embed.data.fields[statusFieldIndex].value = '✅ Active - Both sides filled!';
        embed.setColor(0x00FF00);
        embed.setFooter({ text: 'Bet is active! React with 🅰️ (A wins), 🅱️ (B wins), or ❌ (cancel) - both players must agree' });

        const updatedBet = await db.getBetById(bet.id);
        const otherUserId = side === 'A' ? updatedBet.side_b_user_id : updatedBet.side_a_user_id;
        
        await message.edit({ embeds: [embed] });
        
        // Clear existing reactions and add resolution/cancellation emojis
        await message.reactions.removeAll();
        await addResolutionEmojis(message);
        
        await message.channel.send(
            `🎲 **Bet #${bet.id} is now active!**\n` +
            `<@${user.id}> (Side ${side} @ ${formatOdds(side === 'A' ? bet.side_a_odds : bet.side_b_odds)}) vs <@${otherUserId}> (Side ${side === 'A' ? 'B' : 'A'} @ ${formatOdds(side === 'A' ? bet.side_b_odds : bet.side_a_odds)})\n` +
            `**Stakes:** Side A: $${stakes.stakeA.toFixed(2)} | Side B: $${stakes.stakeB.toFixed(2)}\n` +
            `**Total Pot:** $${stakes.totalPot.toFixed(2)}\n\n` +
            `**To resolve:** Both players react with 🅰️ (Side A wins) or 🅱️ (Side B wins)\n` +
            `**To cancel:** Both players react with ❌`
        );

        client.activeBets.delete(messageId);
        
        resolutionTracking.set(messageId, {
            sideA: new Set(),
            sideB: new Set(),
            cancel: new Set()
        });
    } else {
        const statusFieldIndex = embed.data.fields.findIndex(f => f.name === 'Status');
        embed.data.fields[statusFieldIndex].value = `⏳ Side ${side} taken, waiting for opponent`;
        
        await message.edit({ embeds: [embed] });
    }
}

// Handle emoji-based resolution
async function handleEmojiResolution(reaction, user, client, bet) {
    const messageId = reaction.message.id;
    
    if (!resolutionTracking.has(messageId)) {
        resolutionTracking.set(messageId, {
            sideA: new Set(),
            sideB: new Set(),
            cancel: new Set()
        });
    }
    
    const tracking = resolutionTracking.get(messageId);
    const winningSide = reaction.emoji.name === '🅰️' ? 'A' : 'B';
    const trackingKey = winningSide === 'A' ? 'sideA' : 'sideB';
    
    tracking[trackingKey].add(user.id);
    
    if (winningSide === 'A') {
        tracking.sideB.delete(user.id);
    } else {
        tracking.sideA.delete(user.id);
    }
    tracking.cancel.delete(user.id);
    
    if (tracking[trackingKey].has(bet.side_a_user_id) && tracking[trackingKey].has(bet.side_b_user_id)) {
        await db.resolveBet(bet.id, winningSide);
        
        // Calculate PROPER payouts with different stakes
        const stakes = calculateBalancedStakes(bet.amount, bet.side_a_odds, bet.side_b_odds);
        const winnerId = winningSide === 'A' ? bet.side_a_user_id : bet.side_b_user_id;
        const loserId = winningSide === 'A' ? bet.side_b_user_id : bet.side_a_user_id;
        
        // Winner gets their stake back plus winnings
        const winnerStake = winningSide === 'A' ? stakes.stakeA : stakes.stakeB;
        const winnerWinnings = winningSide === 'A' ? stakes.toWinA : stakes.toWinB;
        const loserStake = winningSide === 'A' ? stakes.stakeB : stakes.stakeA;
        
        // Update stats with actual staked amounts
        await db.updateUserStats(winnerId, true, winnerStake, winnerWinnings);
        await db.updateUserStats(loserId, false, loserStake, -loserStake);
        
        const winnerDesc = winningSide === 'A' ? bet.side_a_description : bet.side_b_description;
        const loserDesc = winningSide === 'A' ? bet.side_b_description : bet.side_a_description;
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Bet Resolved via Emoji Consensus!')
            .setDescription(`**Bet #${bet.id}: ${bet.description}**`)
            .addFields(
                { 
                    name: '🏆 Winner', 
                    value: `<@${winnerId}>\n**Side ${winningSide}:** ${winnerDesc}\n**Staked:** $${winnerStake.toFixed(2)}\n**Won:** +$${winnerWinnings.toFixed(2)}\n**Total Return:** $${(winnerStake + winnerWinnings).toFixed(2)}`, 
                    inline: true 
                },
                { 
                    name: '❌ Loser', 
                    value: `<@${loserId}>\n**Side ${winningSide === 'A' ? 'B' : 'A'}:** ${loserDesc}\n**Lost:** -$${loserStake.toFixed(2)}`, 
                    inline: true 
                }
            )
            .setFooter({ text: 'Resolved by mutual emoji agreement' })
            .setTimestamp();

        await reaction.message.channel.send({ embeds: [embed] });
        
        const originalEmbed = EmbedBuilder.from(reaction.message.embeds[0]);
        originalEmbed.setColor(0x808080);
        originalEmbed.setTitle(originalEmbed.data.title + ' [RESOLVED]');
        const statusFieldIndex = originalEmbed.data.fields.findIndex(f => f.name === 'Status');
        originalEmbed.data.fields[statusFieldIndex].value = `🏁 Resolved - Side ${winningSide} Won`;
        await reaction.message.edit({ embeds: [originalEmbed] });
        
        resolutionTracking.delete(messageId);
    } else {
        const otherUserId = user.id === bet.side_a_user_id ? bet.side_b_user_id : bet.side_a_user_id;
        await reaction.message.channel.send(
            `📊 <@${user.id}> voted that **Side ${winningSide}** won Bet #${bet.id}. Waiting for <@${otherUserId}> to confirm with ${reaction.emoji.name}`
        );
    }
}

// Handle resolution request confirmations
async function handleResolutionConfirmation(reaction, user, client) {
    const request = await db.getResolutionRequestByMessageId(reaction.message.id);
    if (!request || reaction.emoji.name !== '✅') return;
    
    const userSide = request.side_a_user_id === user.id ? 'A' : 
                    request.side_b_user_id === user.id ? 'B' : null;
    
    if (!userSide) {
        await reaction.users.remove(user.id);
        return;
    }
    
    const result = await db.confirmResolutionRequest(request.id, user.id, userSide);
    
    if (result.bothConfirmed) {
        const bet = await db.getBetById(request.bet_id);
        
        if (request.request_type === 'resolve') {
            await db.resolveBet(request.bet_id, request.proposed_winner);
            
            // Calculate PROPER payouts with different stakes
            const stakes = calculateBalancedStakes(bet.amount, bet.side_a_odds, bet.side_b_odds);
            const winnerId = request.proposed_winner === 'A' ? bet.side_a_user_id : bet.side_b_user_id;
            const loserId = request.proposed_winner === 'A' ? bet.side_b_user_id : bet.side_a_user_id;
            
            const winnerStake = request.proposed_winner === 'A' ? stakes.stakeA : stakes.stakeB;
            const winnerWinnings = request.proposed_winner === 'A' ? stakes.toWinA : stakes.toWinB;
            const loserStake = request.proposed_winner === 'A' ? stakes.stakeB : stakes.stakeA;
            
            await db.updateUserStats(winnerId, true, winnerStake, winnerWinnings);
            await db.updateUserStats(loserId, false, loserStake, -loserStake);
            
            const winnerDesc = request.proposed_winner === 'A' ? bet.side_a_description : bet.side_b_description;
            const loserDesc = request.proposed_winner === 'A' ? bet.side_b_description : bet.side_a_description;
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Bet Resolved!')
                .setDescription(`**Bet #${request.bet_id}: ${bet.description}**`)
                .addFields(
                    { 
                        name: '🏆 Winner', 
                        value: `<@${winnerId}>\n**Side ${request.proposed_winner}:** ${winnerDesc}\n**Staked:** $${winnerStake.toFixed(2)}\n**Won:** +$${winnerWinnings.toFixed(2)}\n**Total Return:** $${(winnerStake + winnerWinnings).toFixed(2)}`, 
                        inline: true 
                    },
                    { 
                        name: '❌ Loser', 
                        value: `<@${loserId}>\n**Side ${request.proposed_winner === 'A' ? 'B' : 'A'}:** ${loserDesc}\n**Lost:** -$${loserStake.toFixed(2)}`, 
                        inline: true 
                    }
                )
                .setTimestamp();
            
            await reaction.message.channel.send({ embeds: [embed] });
            
        } else if (request.request_type === 'cancel') {
            await db.cancelActiveBet(request.bet_id);
            
            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle('🚫 Bet Cancelled')
                .setDescription(`**Bet #${request.bet_id}: ${bet.description}**\n\nBoth participants agreed to cancel. No money changed hands.`)
                .setTimestamp();
            
            await reaction.message.channel.send({ embeds: [embed] });
        }
        
        await db.deleteResolutionRequest(request.id);
        
        const originalEmbed = EmbedBuilder.from(reaction.message.embeds[0]);
        originalEmbed.setColor(0x00FF00);
        originalEmbed.setTitle(originalEmbed.data.title.replace('⏳', '✅'));
        originalEmbed.setFooter({ text: 'Confirmed by both participants' });
        await reaction.message.edit({ embeds: [originalEmbed] });
    } else {
        const otherUserId = user.id === request.side_a_user_id ? request.side_b_user_id : request.side_a_user_id;
        await reaction.message.channel.send(
            `✅ <@${user.id}> has confirmed the ${request.request_type} request for Bet #${request.bet_id}. Waiting for <@${otherUserId}> to confirm...`
        );
    }
}

// View user's bet history - UPDATED to show actual stakes
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

    for (const bet of history.slice(0, 10)) {
        const userSide = bet.side_a_user_id === userId ? 'A' : 'B';
        const stakes = calculateBalancedStakes(bet.amount, bet.side_a_odds, bet.side_b_odds);
        const userStake = userSide === 'A' ? stakes.stakeA : stakes.stakeB;
        const userOdds = userSide === 'A' ? bet.side_a_odds : bet.side_b_odds;
        const won = bet.winning_side === userSide;
        const emoji = won ? '✅' : '❌';
        const profit = won ? stakes.totalPot - userStake : -userStake;
        const profitStr = profit >= 0 ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`;
        
        const opponentId = userSide === 'A' ? bet.side_b_user_id : bet.side_a_user_id;
        const userChoice = userSide === 'A' ? bet.side_a_description : bet.side_b_description;
        
        embed.addFields({
            name: `${emoji} Bet #${bet.id} - ${profitStr}`,
            value: `**${bet.description}**\n**Your pick:** ${userChoice} @ ${formatOdds(userOdds)}\n**Opponent:** <@${opponentId}>\n**Your Stake:** $${userStake.toFixed(2)}\n**Pot:** $${stakes.totalPot.toFixed(2)}`,
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

// Add resolution emojis to an active bet
async function addResolutionEmojis(message) {
    await message.react('🅰️'); // Side A wins
    await message.react('🅱️'); // Side B wins
    await message.react('❌'); // Cancel bet
}

// Handle reaction for joining a bet side or resolution/cancellation
async function handleReactionAdd(reaction, user, client) {
    const messageId = reaction.message.id;
    
    const bet = await db.getBetByMessageId(messageId);
    if (!bet) return;

    if (bet.status === 'pending') {
        if (reaction.emoji.name === bet.side_a_emoji || reaction.emoji.name === bet.side_b_emoji) {
            await handleJoinBet(reaction, user, client, bet);
        }
        
    } else if (bet.status === 'active') {
        if (reaction.emoji.name === '🅰️' || reaction.emoji.name === '🅱️' || reaction.emoji.name === '❌') {
            if (bet.side_a_user_id !== user.id && bet.side_b_user_id !== user.id) {
                await reaction.users.remove(user.id);
                return;
            }
            
            if (reaction.emoji.name === '🅰️' || reaction.emoji.name === '🅱️') {
                await handleEmojiResolution(reaction, user, client, bet);
            } else if (reaction.emoji.name === '❌') {
                await handleEmojiCancellation(reaction, user, client, bet);
            }
        } else if (reaction.emoji.name === bet.side_a_emoji || reaction.emoji.name === bet.side_b_emoji) {
            await reaction.users.remove(user.id);
        }
    }
}

// Handle emoji-based cancellation
async function handleEmojiCancellation(reaction, user, client, bet) {
    const messageId = reaction.message.id;
    
    if (!resolutionTracking.has(messageId)) {
        resolutionTracking.set(messageId, {
            sideA: new Set(),
            sideB: new Set(),
            cancel: new Set()
        });
    }
    
    const tracking = resolutionTracking.get(messageId);
    
    tracking.cancel.add(user.id);
    tracking.sideA.delete(user.id);
    tracking.sideB.delete(user.id);
    
    if (tracking.cancel.has(bet.side_a_user_id) && tracking.cancel.has(bet.side_b_user_id)) {
        await db.cancelActiveBet(bet.id);
        
        const embed = new EmbedBuilder()
            .setColor(0xFFFF00)
            .setTitle('🚫 Bet Cancelled by Mutual Agreement')
            .setDescription(`**Bet #${bet.id}: ${bet.description}**\n\nBoth participants agreed to cancel. No money changed hands.`)
            .addFields(
                { name: 'Participant 1', value: `<@${bet.side_a_user_id}>`, inline: true },
                { name: 'Participant 2', value: `<@${bet.side_b_user_id}>`, inline: true }
            )
            .setFooter({ text: 'Cancelled via emoji consensus' })
            .setTimestamp();

        await reaction.message.channel.send({ embeds: [embed] });
        
        const originalEmbed = EmbedBuilder.from(reaction.message.embeds[0]);
        originalEmbed.setColor(0xFF0000);
        originalEmbed.setTitle(originalEmbed.data.title + ' [CANCELLED]');
        const statusFieldIndex = originalEmbed.data.fields.findIndex(f => f.name === 'Status');
        originalEmbed.data.fields[statusFieldIndex].value = '🚫 Cancelled by agreement';
        await reaction.message.edit({ embeds: [originalEmbed] });
        
        resolutionTracking.delete(messageId);
    } else {
        const otherUserId = user.id === bet.side_a_user_id ? bet.side_b_user_id : bet.side_a_user_id;
        await reaction.message.channel.send(
            `🚫 <@${user.id}> wants to cancel Bet #${bet.id}. Waiting for <@${otherUserId}> to confirm with ❌`
        );
    }
}

// Resolve a bet via command
async function handleResolveBet(interaction, client) {
    const betId = interaction.options.getInteger('bet_id');
    const winningSide = interaction.options.getString('winning_side');
    const resolver = interaction.user;

    const bet = await db.getBetById(betId);
    
    if (!bet) {
        await interaction.reply({ content: '❌ Bet not found!', ephemeral: true });
        return;
    }

    if (bet.status !== 'active') {
        await interaction.reply({ content: '❌ This bet is not active!', ephemeral: true });
        return;
    }

    if (bet.side_a_user_id !== resolver.id && bet.side_b_user_id !== resolver.id) {
        await interaction.reply({ content: '❌ Only bet participants can resolve it!', ephemeral: true });
        return;
    }

    const existingRequest = await db.getActiveResolutionRequest(betId);
    if (existingRequest) {
        await interaction.reply({ 
            content: '⏳ There is already a pending resolution request for this bet. Please confirm or wait for it to expire.', 
            ephemeral: true 
        });
        return;
    }

    const winnerDesc = winningSide === 'A' ? bet.side_a_description : bet.side_b_description;
    const loserDesc = winningSide === 'A' ? bet.side_b_description : bet.side_a_description;
    
    const embed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('⏳ Resolution Request - Confirmation Required')
        .setDescription(`**Bet #${betId}: ${bet.description}**\n\n<@${resolver.id}> claims **Side ${winningSide}: ${winnerDesc}** won.`)
        .addFields(
            { 
                name: 'Proposed Winner', 
                value: `Side ${winningSide}: ${winnerDesc}`, 
                inline: true 
            },
            { 
                name: 'Proposed Loser', 
                value: `Side ${winningSide === 'A' ? 'B' : 'A'}: ${loserDesc}`, 
                inline: true 
            }
        )
        .setFooter({ text: 'Both participants must react with ✅ to confirm. Request expires in 24 hours.' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();
    await message.react('✅');
    
    await db.createResolutionRequest(betId, 'resolve', winningSide, message.id, interaction.channelId);
}

// Cancel a bet via command
async function handleCancelBet(interaction, client) {
    const betId = interaction.options.getInteger('bet_id');
    const canceller = interaction.user;

    const bet = await db.getBetById(betId);
    
    if (!bet) {
        await interaction.reply({ content: '❌ Bet not found!', ephemeral: true });
        return;
    }

    if (bet.status === 'pending') {
        if (bet.creator_id !== canceller.id && 
            bet.side_a_user_id !== canceller.id && 
            bet.side_b_user_id !== canceller.id) {
            await interaction.reply({ content: '❌ Only the bet creator or participant can cancel a pending bet!', ephemeral: true });
            return;
        }
        
        await db.cancelBet(betId);
        await interaction.reply({ content: `✅ Bet #${betId} has been cancelled.` });
        
    } else if (bet.status === 'active') {
        if (bet.side_a_user_id !== canceller.id && bet.side_b_user_id !== canceller.id) {
            await interaction.reply({ content: '❌ Only bet participants can request cancellation!', ephemeral: true });
            return;
        }

        const existingRequest = await db.getActiveResolutionRequest(betId);
        if (existingRequest) {
            await interaction.reply({ 
                content: '⏳ There is already a pending request for this bet. Please confirm or wait for it to expire.', 
                ephemeral: true 
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFFF00)
            .setTitle('🚫 Cancellation Request - Confirmation Required')
            .setDescription(`**Bet #${betId}: ${bet.description}**\n\n<@${canceller.id}> wants to cancel this bet.`)
            .addFields(
                { name: 'Side A', value: `<@${bet.side_a_user_id}>: ${bet.side_a_description}`, inline: false },
                { name: 'Side B', value: `<@${bet.side_b_user_id}>: ${bet.side_b_description}`, inline: false },
                { name: 'Stakes', value: `A: $${calculateBalancedStakes(bet.amount, bet.side_a_odds, bet.side_b_odds).stakeA.toFixed(2)} | B: $${calculateBalancedStakes(bet.amount, bet.side_a_odds, bet.side_b_odds).stakeB.toFixed(2)}`, inline: true }
            )
            .setFooter({ text: 'Both participants must react with ✅ to confirm cancellation. Request expires in 24 hours.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        const message = await interaction.fetchReply();
        await message.react('✅');
        
        await db.createResolutionRequest(betId, 'cancel', null, message.id, interaction.channelId);
        
    } else {
        await interaction.reply({ content: '❌ This bet cannot be cancelled!', ephemeral: true });
    }
}

// View active bets - UPDATED to show proper stakes
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

    for (const bet of bets.slice(0, 10)) {
        const status = bet.status === 'pending' ? '⏳ Pending' : '✅ Active';
        const stakes = calculateBalancedStakes(bet.amount, bet.side_a_odds, bet.side_b_odds);
        const sideAInfo = `${bet.side_a_description} @ ${formatOdds(bet.side_a_odds)} (Stake: $${stakes.stakeA.toFixed(2)})`;
        const sideBInfo = `${bet.side_b_description} @ ${formatOdds(bet.side_b_odds)} (Stake: $${stakes.stakeB.toFixed(2)})`;
        
        const participants = bet.status === 'active' ? 
            `**Side A:** <@${bet.side_a_user_id}>\n${sideAInfo}\n**Side B:** <@${bet.side_b_user_id}>\n${sideBInfo}` : 
            `**Side A:** ${bet.side_a_user_id ? `<@${bet.side_a_user_id}>` : 'Open'}\n${sideAInfo}\n**Side B:** ${bet.side_b_user_id ? `<@${bet.side_b_user_id}>` : 'Open'}\n${sideBInfo}`;
        
        embed.addFields({
            name: `Bet #${bet.id} - ${status} - Pot: $${stakes.totalPot.toFixed(2)}`,
            value: `**${bet.description}**\n${participants}`,
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
            { name: 'Average Stake', value: `$${avgBet}`, inline: true },
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

// Updated handleReactionAdd to handle resolution confirmations
async function handleReactionAddMain(reaction, user, client) {
    const resolutionRequest = await db.getResolutionRequestByMessageId(reaction.message.id);
    if (resolutionRequest) {
        await handleResolutionConfirmation(reaction, user, client);
        return;
    }
    
    await handleReactionAdd(reaction, user, client);
}

module.exports = {
    registerCommands,
    handleInteraction,
    handleReactionAdd: handleReactionAddMain
};