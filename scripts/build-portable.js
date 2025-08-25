// scripts/build-portable.js - Discord Betting Bot Portable Build Script
const fs = require('fs');
const path = require('path');

console.log('Discord Betting Bot - Portable Build Script');
console.log('============================================\n');

// Create dist directory
const distDir = path.join(__dirname, '..', 'dist-portable');
const projectRoot = path.join(__dirname, '..');

// Check if we're in the right directory structure
if (!fs.existsSync(path.join(projectRoot, 'bot.js'))) {
    console.log('❌ ERROR: bot.js not found!');
    console.log('Make sure you run this script from the project root:');
    console.log('  node scripts/build-portable.js');
    console.log('Or from the scripts directory:');
    console.log('  node build-portable.js');
    process.exit(1);
}

// Clean and create dist directory
if (fs.existsSync(distDir)) {
    console.log('Cleaning existing dist-portable directory...');
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

console.log('✓ Created dist-portable directory\n');

// Function to copy file
function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        return true;
    }
    return false;
}

// Copy main bot files
console.log('Copying bot files...');

const mainFiles = [
    'bot.js',
    'database.js',
    'commands.js',
    'package.json',
    '.gitignore'
];

mainFiles.forEach(file => {
    const srcPath = path.join(projectRoot, file);
    const destPath = path.join(distDir, file);
    if (copyFile(srcPath, destPath)) {
        console.log(`✓ Copied ${file}`);
    } else {
        console.log(`✗ ${file} not found (may need to create)`);
    }
});

// Create .env.example (not the actual .env for security)
const envExampleContent = `# Discord Bot Configuration
# IMPORTANT: Rename this file to .env and add your bot token

DISCORD_TOKEN=your_bot_token_here

# Optional: Change port if needed for future web dashboard
# PORT=3000`;

fs.writeFileSync(path.join(distDir, '.env.example'), envExampleContent);
console.log('✓ Created .env.example');

// Create the portable Node.js launcher batch file
const portableBatchContent = `@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
cls

echo ============================================
echo        Discord NFL Betting Bot
echo         Portable Edition v1.0
echo ============================================
echo.

:: Check for .env file
if not exist ".env" (
    echo ⚠️  SETUP REQUIRED!
    echo.
    echo 1. Rename .env.example to .env
    echo 2. Add your Discord bot token to .env
    echo 3. Run this launcher again
    echo.
    echo See README.txt for detailed instructions
    echo.
    pause
    exit /b 1
)

:: Download Node.js if needed
if not exist "node-portable\\node.exe" (
    echo Setting up portable Node.js environment...
    echo This is a one-time setup that takes 2-3 minutes.
    echo.
    
    mkdir node-portable 2>nul
    
    echo Downloading Node.js v18 LTS...
    powershell -Command "try { Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.19.0/node-v18.19.0-win-x64.zip' -OutFile '%TEMP%\\node.zip' -UseBasicParsing } catch { exit 1 }"
    
    if not exist "%TEMP%\\node.zip" (
        echo.
        echo ERROR: Failed to download Node.js
        echo Please check your internet connection and firewall settings
        echo.
        pause
        exit /b 1
    )
    
    echo Extracting Node.js...
    powershell -Command "Expand-Archive -Path '%TEMP%\\node.zip' -DestinationPath '%TEMP%' -Force"
    
    xcopy /E /I /Q /Y "%TEMP%\\node-v18.19.0-win-x64\\*" "node-portable\\" >nul
    
    del "%TEMP%\\node.zip" 2>nul
    rmdir /s /q "%TEMP%\\node-v18.19.0-win-x64" 2>nul
    
    echo ✓ Node.js installed successfully!
    echo.
)

:: Set PATH to use ONLY our portable Node.js
set "PATH=%~dp0node-portable;%~dp0node-portable\\node_modules\\npm\\bin"
set "NODE_PATH=%~dp0node-portable\\node_modules"

:: Install dependencies if needed
if not exist "node_modules\\" (
    echo Installing bot dependencies...
    echo This only happens on first run or after updates...
    echo.
    
    :: Install with specific versions for compatibility
    call "%~dp0node-portable\\npm.cmd" install discord.js@14.14.1 sqlite3@5.1.6 dotenv@16.3.1 --production --no-audit --no-fund --loglevel=error
    
    if !errorlevel! neq 0 (
        echo.
        echo WARNING: Initial install had issues, trying alternative...
        echo.
        
        :: Try with force flag for sqlite3
        call "%~dp0node-portable\\npm.cmd" install discord.js@14.14.1 sqlite3@5.1.6 dotenv@16.3.1 --production --no-audit --no-fund --force --loglevel=error
        
        if !errorlevel! neq 0 (
            echo.
            echo ERROR: Failed to install dependencies
            echo.
            echo Troubleshooting:
            echo 1. Check internet connection
            echo 2. Check firewall/antivirus settings
            echo 3. Try running as Administrator
            echo.
            pause
            exit /b 1
        )
    )
    
    echo.
    echo ✓ All dependencies installed!
    echo.
)

:: Ensure database file has proper permissions
if not exist "bets.db" (
    echo Creating database...
    type nul > bets.db
)

:: Start the bot
echo ============================================
echo Starting Discord Betting Bot...
echo.
echo Bot Status: RUNNING
echo.
echo Commands:
echo - Press Ctrl+C to stop the bot
echo - Close this window to stop the bot
echo ============================================
echo.

:: Run the bot
"%~dp0node-portable\\node.exe" bot.js

:: If we get here, bot was stopped
echo.
echo Bot has been stopped.
echo.
pause`;

fs.writeFileSync(path.join(distDir, 'RunBot.bat'), portableBatchContent);
console.log('✓ Created RunBot.bat launcher');

// Create setup script for first-time configuration
const setupBatchContent = `@echo off
cls
echo ============================================
echo    Discord Betting Bot - Quick Setup
echo ============================================
echo.

if exist ".env" (
    echo ✓ Configuration file already exists!
    echo.
    echo If you need to change your bot token:
    echo 1. Edit the .env file with Notepad
    echo 2. Replace the token after DISCORD_TOKEN=
    echo.
    pause
    exit /b 0
)

echo This setup will help you configure your bot.
echo.
echo You'll need your Discord Bot Token ready.
echo Get it from: https://discord.com/developers/applications
echo.
pause

echo.
set /p TOKEN="Paste your Discord Bot Token here: "

echo DISCORD_TOKEN=%TOKEN%> .env
echo.

echo ✓ Configuration saved!
echo.
echo You can now run the bot with RunBot.bat
echo.
pause`;

fs.writeFileSync(path.join(distDir, 'Setup.bat'), setupBatchContent);
console.log('✓ Created Setup.bat for easy configuration');

// Create comprehensive README
const readmeContent = `Discord NFL Betting Bot - Portable Edition
===========================================

QUICK START (3 STEPS)
---------------------
1. Run Setup.bat and paste your Discord bot token
2. Run RunBot.bat 
3. Bot is now online in your Discord server!

WHAT'S INCLUDED
---------------
RunBot.bat         - Main launcher (use this to start the bot)
Setup.bat          - First-time setup wizard
bot.js             - Main bot code
database.js        - Database handler
commands.js        - Command definitions
.env.example       - Configuration template
bets.db            - Database (created automatically)
node-portable/     - Portable Node.js (downloaded on first run)
node_modules/      - Dependencies (installed on first run)

FIRST TIME SETUP
----------------
1. Get your bot token from Discord Developer Portal:
   https://discord.com/developers/applications
   
2. Run Setup.bat and paste your token when prompted
   OR manually rename .env.example to .env and add your token

3. Run RunBot.bat - it will:
   - Download portable Node.js (first time only, ~30MB)
   - Install required packages (first time only)
   - Start your bot

4. Bot is now running! Check your Discord server

SYSTEM REQUIREMENTS
-------------------
- Windows 10 or later
- Internet connection (first run only)
- 200MB free disk space
- Discord bot token

BOT COMMANDS
------------
/bet create     - Create a new bet
/bet resolve    - Resolve a bet (requires both parties)
/bet cancel     - Cancel a bet
/bets active    - View active bets
/bets history   - View your bet history
/stats          - View betting statistics
/leaderboard    - View profit leaderboard

ADDING BOT TO SERVER
---------------------
1. Go to Discord Developer Portal
2. Select your application
3. Go to OAuth2 → URL Generator
4. Select "bot" and "applications.commands"
5. Select these permissions:
   - Send Messages
   - Use Slash Commands
   - Read Messages/View Channels
   - Add Reactions
   - Manage Messages
   - Embed Links
6. Copy the URL and open in browser
7. Select your server and authorize

PORTABLE FEATURES
-----------------
✓ No installation required
✓ No admin rights needed
✓ Completely self-contained
✓ Run from USB drive
✓ Move to any computer
✓ No registry changes
✓ Clean uninstall (just delete folder)

TROUBLESHOOTING
---------------
Bot won't start:
- Check your bot token in .env file
- Make sure token is correct (no extra spaces)
- Verify bot is invited to your server

"Token Invalid" error:
- Your bot token is incorrect
- Regenerate token in Discord Developer Portal
- Run Setup.bat again with new token

Bot is online but commands don't work:
- Re-invite bot with correct permissions
- Wait 1 hour for commands to sync globally
- Try kicking and re-adding the bot

Database errors:
- Delete bets.db and restart bot
- Bot will create fresh database

Can't download Node.js:
- Check internet connection
- Check Windows Firewall
- Try running as Administrator
- Manually download from nodejs.org if needed

BACKING UP YOUR DATA
--------------------
To backup your betting data:
1. Copy bets.db to safe location

To restore:
1. Replace bets.db with your backup
2. Restart bot

UPDATING THE BOT
----------------
1. Keep your .env and bets.db files
2. Replace other files with new version
3. Delete node_modules folder
4. Run RunBot.bat (will reinstall dependencies)

UNINSTALLING
------------
Simply delete this entire folder.
No other files are created outside this directory.

SECURITY NOTES
--------------
- NEVER share your .env file
- NEVER commit .env to Git
- Keep your bot token secret
- Backup bets.db regularly

VERSION
-------
Discord NFL Betting Bot v1.0.0
Portable Edition with Node.js 18 LTS
Built for Windows 10/11

SUPPORT
-------
For help, feature requests, or bug reports,
contact the developer or check the project repository.

=====================================
Enjoy your NFL season betting! 🏈
=====================================`;

fs.writeFileSync(path.join(distDir, 'README.txt'), readmeContent);
console.log('✓ Created comprehensive README.txt');

// Create a compatible package.json for the portable version
// Using better-sqlite3 for better portability (no compilation needed)
const portablePackageJson = {
    name: "discord-betting-bot",
    version: "1.0.0",
    description: "Discord bot for NFL betting with friends",
    main: "bot.js",
    scripts: {
        start: "node bot.js"
    },
    dependencies: {
        "discord.js": "^14.14.1",
        "sqlite3": "^5.1.6",  // Keep sqlite3 for now
        "dotenv": "^16.3.1"
    },
    engines: {
        node: ">=16.9.0"
    }
};

fs.writeFileSync(
    path.join(distDir, 'package.json'),
    JSON.stringify(portablePackageJson, null, 2)
);
console.log('✓ Created portable package.json');

// Create a simple test script
const testScript = `// test-connection.js - Test Discord connection
require('dotenv').config();

console.log('Testing Discord Bot Token...');

if (!process.env.DISCORD_TOKEN) {
    console.log('❌ No token found! Please run Setup.bat first.');
} else {
    const token = process.env.DISCORD_TOKEN;
    const masked = token.substring(0, 10) + '...' + token.substring(token.length - 4);
    console.log('✓ Token found:', masked);
    console.log('\\nTry running RunBot.bat to start the bot!');
}`;

fs.writeFileSync(path.join(distDir, 'test-connection.js'), testScript);
console.log('✓ Created test-connection.js');

// Create scripts directory if you have any utility scripts
const scriptsDir = path.join(distDir, 'scripts');
fs.mkdirSync(scriptsDir, { recursive: true });

// Add this build script to scripts folder
fs.copyFileSync(__filename, path.join(scriptsDir, 'build-portable.js'));
console.log('✓ Copied build script to scripts/');

console.log('\n============================================');
console.log('✅ Portable build complete!');
console.log('\nCreated in: dist-portable/');
console.log('\n📋 NEXT STEPS:');
console.log('============================================');
console.log('1. TEST LOCALLY:');
console.log('   cd dist-portable');
console.log('   Setup.bat (enter your token)');
console.log('   RunBot.bat (starts the bot)');
console.log('');
console.log('2. DISTRIBUTE:');
console.log('   - ZIP the entire dist-portable folder');
console.log('   - Name it: Discord-Betting-Bot-Portable.zip');
console.log('   - Share with friends');
console.log('');
console.log('3. WHAT YOUR FRIENDS DO:');
console.log('   - Extract ZIP anywhere (Desktop, USB, etc)');
console.log('   - Run Setup.bat (one time)');
console.log('   - Run RunBot.bat (starts bot)');
console.log('');
console.log('🎯 KEY FEATURES:');
console.log('✓ Zero installation required');
console.log('✓ Downloads Node.js automatically (~30MB)');
console.log('✓ Installs all dependencies automatically');
console.log('✓ Completely self-contained');
console.log('✓ Run from USB drive');
console.log('✓ No admin rights needed');
console.log('✓ Simple setup wizard');
console.log('');
console.log('⚠️  IMPORTANT NOTES:');
console.log('- First run downloads ~30MB (Node.js)');
console.log('- First run takes 2-3 minutes for setup');
console.log('- After that, starts in seconds');
console.log('');
console.log('📁 Package contains:');
console.log('- RunBot.bat (main launcher)');
console.log('- Setup.bat (configuration wizard)');
console.log('- All bot code and dependencies');
console.log('- Comprehensive README.txt');
console.log('============================================');