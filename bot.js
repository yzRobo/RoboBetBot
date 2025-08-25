// bot.js
// Discord Betting Bot with consensus-based resolution
// Features:
// - Two-sided betting with custom odds
// - Consensus resolution (both parties must agree)
// - Automatic stat tracking and leaderboards
// - Fair cancellation system

require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { initDatabase } = require('./database');
const { registerCommands, handleInteraction, handleReactionAdd } = require('./commands');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]
});

// Store active bet messages for reaction handling
client.activeBets = new Map();

// When the bot is ready
client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Logged in as ${c.user.tag}!`);
    
    // Initialize database
    await initDatabase();
    console.log('✅ Database initialized');
    
    // Register slash commands for all guilds
    for (const guild of c.guilds.cache.values()) {
        await registerCommands(guild);
        console.log(`✅ Commands registered for ${guild.name}`);
    }
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    try {
        await handleInteraction(interaction, client);
    } catch (error) {
        console.error('Error handling interaction:', error);
        const errorMsg = { content: 'There was an error executing this command!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMsg);
        } else {
            await interaction.reply(errorMsg);
        }
    }
});

// Handle reactions for accepting bets
client.on(Events.MessageReactionAdd, async (reaction, user) => {
    // Ignore bot reactions
    if (user.bot) return;
    
    try {
        // Handle all reaction-based interactions (bet joining and resolution confirmations)
        await handleReactionAdd(reaction, user, client);
    } catch (error) {
        console.error('Error handling reaction:', error);
    }
});

// Handle new guild joins
client.on(Events.GuildCreate, async (guild) => {
    console.log(`Joined new guild: ${guild.name}`);
    await registerCommands(guild);
    console.log(`✅ Commands registered for ${guild.name}`);
});

// Error handling
client.on('error', console.error);
client.on('warn', console.warn);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});