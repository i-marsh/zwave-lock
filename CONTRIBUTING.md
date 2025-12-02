# Contributing to Z-Wave Lock Controller

Thank you for your interest in this project!

## Contribution Policy

**This project is currently not accepting external code contributions.** This is a personal project maintained solely by the repository owner.

### What You Can Do:

✅ **Report Bugs** - Issues are welcome and appreciated  
✅ **Request Features** - Suggestions via issues are encouraged  
✅ **Fork the Repository** - Feel free to fork and modify for your own use  

❌ **Pull Requests** - External PRs will not be reviewed or merged  

This policy helps maintain security and code quality for a home security application while keeping maintenance sustainable.

## Repository Protection Setup

For reference, this repository uses the following protection settings:

**Branch Protection (main branch only):**
- Restrict deletions - Prevents accidental branch deletion
- Block force pushes - Maintains commit history integrity  
- Require pull request before merging - Enforces code review workflow
- Require linear history - Keeps clean git history

**Why not protect all branches?**
- Feature branches need flexibility for development
- Protection on `main` prevents accidental direct commits
- Repository owner has bypass permissions for emergency fixes

## Code of Conduct

Be respectful, inclusive, and professional. This is a home security project - take security seriously.

## How Can I Contribute?

### Reporting Bugs

**Before submitting a bug report:**
- Check existing issues to avoid duplicates
- Test with the latest version
- Verify your Z-Wave dongle is working with other software

**Bug reports should include:**
- Your OS and version (macOS 14.1, Ubuntu 22.04, etc.)
- Node.js version (`node --version`)
- Z-Wave dongle model (Zooz ZST10, Aeotec Z-Stick, etc.)
- Lock model and firmware version
- Complete error messages and stack traces
- Steps to reproduce
- Expected vs actual behavior

**Security vulnerabilities:** See [SECURITY.md](SECURITY.md) - do NOT open public issues for security bugs.

### Suggesting Features

Open an issue with:
- Clear use case description
- Expected behavior
- Why this would be useful
- Mockups or examples if applicable

---

## For Repository Owner Reference

The sections below document development practices and standards for this project.

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/zwave-lock-controller.git
cd zwave-lock-controller

# Install dependencies
npm install

# Build
npm run build

# Set up your config (DO NOT commit config.json!)
npm start -- list --port /dev/cu.usbmodem21101
```

### Coding Standards

### TypeScript
- Use strict TypeScript settings
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Add JSDoc comments for public functions
- Handle errors explicitly

### Code Style
```typescript
// Good
async function lockDoor(driver: Driver, nodeId: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }
  // ... implementation
}

// Avoid
async function lockDoor(driver,nodeId) {
  var node=driver.controller.nodes.get(nodeId)
  // ... implementation
}
```

### API Design
- REST endpoints should be RESTful
- Use proper HTTP status codes
- Return consistent JSON structures
- Include error messages in responses

### Security
- Never log security keys
- Sanitize user inputs
- Validate node IDs before operations
- Don't expose internal errors to API clients

### Git Workflow

### Branch Naming
- `feature/add-user-code-names` - New features
- `fix/battery-level-parsing` - Bug fixes
- `docs/api-examples` - Documentation
- `refactor/driver-initialization` - Code improvements

### Commit Messages
```
Short summary (50 chars or less)

More detailed explanation if needed. Wrap at 72 characters.
Explain what changed and why, not how (code shows how).

- Bullet points for multiple changes
- Reference issues: Fixes #123

Breaking changes: Detail any backwards-incompatible changes
```

### Commits to Avoid
- Large commits mixing multiple unrelated changes
- Commits with "WIP", "temp", "test" - squash these before PR
- Commits including `config.json` or security keys
- Binary files without good reason

### Adding Dependencies

Before adding a new dependency:
1. Check if it's actively maintained
2. Review its license (must be compatible with MIT)
3. Check security vulnerabilities: `npm audit`
4. Consider bundle size impact
5. Update `ATTRIBUTIONS.md` with license info

Prefer dependencies that are:
- Widely used and trusted
- Actively maintained (commits in last 6 months)
- Well documented
- MIT/ISC/Apache-2.0 licensed

### Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.1.0`
4. Push tag: `git push origin v1.1.0`
5. Create GitHub release with notes
6. (Optional) Publish to npm

---

## Questions?

- Open an issue for bug reports or feature requests
- Check existing issues and documentation first
- Be specific and provide context

Thank you for your interest in this project!
