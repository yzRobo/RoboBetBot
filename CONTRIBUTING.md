# Contributing to RoboBetBot

Thank you for your interest in contributing to RoboBetBot! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully
- Prioritize the community's best interests

### Unacceptable Behavior

- Harassment, discrimination, or offensive language
- Personal attacks or trolling
- Publishing others' private information
- Any conduct that would be inappropriate in a professional setting

## How to Contribute

### Reporting Issues

Before creating an issue, please check existing issues to avoid duplicates.

#### Bug Reports

When reporting bugs, include:
- Clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Bot version and Node.js version
- Any relevant error messages or logs
- Screenshots if applicable

Use this template:
```markdown
**Describe the bug**
A clear description of the bug.

**To Reproduce**
1. Run command '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen.

**Screenshots**
If applicable.

**Environment:**
- Node.js version: [e.g. 18.19.0]
- Bot version: [e.g. 1.0.0]
- OS: [e.g. Windows 10]
```

#### Feature Requests

For feature requests, include:
- Clear description of the feature
- Use case and benefits
- Possible implementation approach (optional)
- Examples from other bots (if applicable)

### Pull Requests

We welcome pull requests! Here's how to contribute code:

#### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/RoboBetBot.git
   cd RoboBetBot
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/yzRobo/RoboBetBot.git
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file with your test bot token:
   ```bash
   cp .env.example .env
   # Edit .env with your token
   ```

3. Run the bot in development:
   ```bash
   npm run dev
   ```

#### Making Changes

1. **Write clean code:**
   - Follow existing code style
   - Use meaningful variable names
   - Add comments for complex logic
   - Keep functions focused and small

2. **Test your changes:**
   - Test all affected commands
   - Verify database operations work correctly
   - Check for edge cases
   - Ensure no existing functionality breaks

3. **Update documentation:**
   - Update README.md if needed
   - Add JSDoc comments for new functions
   - Update command descriptions

#### Code Style

- Use 4 spaces for indentation (not tabs)
- Use semicolons at statement ends
- Use single quotes for strings (except template literals)
- Use async/await over callbacks where possible
- Handle errors appropriately

Example:
```javascript
// Good
async function createBet(userId, amount, description) {
    try {
        // Validate input
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }
        
        // Create bet
        const betId = await db.createBet(userId, amount, description);
        return betId;
    } catch (error) {
        console.error('Error creating bet:', error);
        throw error;
    }
}
```

#### Commit Guidelines

- Use clear, descriptive commit messages
- Start with a verb in present tense
- Keep first line under 50 characters
- Add detailed description if needed

Examples:
```
Add parlay betting support

Implement multi-bet parlay system with:
- New /bet parlay command
- Automatic odds calculation
- Database schema updates
```

```
Fix resolution confirmation bug

Users were able to confirm twice, causing
duplicate stat updates. Added check for
existing confirmation.
```

#### Submitting Pull Request

1. Update your branch with latest upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

3. Create pull request on GitHub:
   - Clear title describing the change
   - Link related issues with "Fixes #123"
   - Describe what changes were made and why
   - Include screenshots for UI changes
   - Note any breaking changes

4. Wait for review:
   - Address feedback promptly
   - Make requested changes
   - Keep discussion focused and professional

### Areas for Contribution

#### Good First Issues

Look for issues labeled `good first issue`:
- Documentation improvements
- Simple bug fixes
- Command validation
- Error message improvements

#### Feature Ideas

- Additional bet types (parlays, teasers)
- Web dashboard
- Sports API integration for auto-resolution
- Season-long competitions
- Custom emoji support
- Bet limits and restrictions
- Statistics visualizations
- Discord embed improvements

#### Code Improvements

- Performance optimizations
- Database query optimization
- Error handling improvements
- Code refactoring for clarity
- Test coverage
- TypeScript migration

## Development Guidelines

### Database Changes

When modifying the database schema:
1. Create migration script in `scripts/migrations/`
2. Update `database.js` initialization
3. Document changes in pull request
4. Consider backward compatibility

### New Commands

When adding commands:
1. Follow existing command structure
2. Add to command registration in `commands.js`
3. Include parameter validation
4. Add error handling
5. Update README with command documentation

### Testing Checklist

Before submitting PR, test:
- [ ] All existing commands work
- [ ] New features work as expected
- [ ] Database operations complete successfully
- [ ] Bot starts without errors
- [ ] No console errors during normal use
- [ ] Commands show proper error messages
- [ ] Portable build still works

## Project Structure

```
RoboBetBot/
├── bot.js              # Main bot file - Discord client
├── database.js         # Database operations and queries
├── commands.js         # Command handlers and registration
├── scripts/
│   ├── build-portable.js   # Portable build script
│   └── migrations/         # Database migrations
├── .env.example        # Environment template
└── package.json        # Dependencies and scripts
```

## Questions?

Feel free to:
- Open an issue for questions
- Join discussions in existing issues
- Reach out to maintainers

## Recognition

Contributors will be:
- Listed in release notes
- Added to contributors section in README
- Thanked in commit messages

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

---

Thank you for contributing to RoboBetBot! Your efforts help make the bot better for everyone.