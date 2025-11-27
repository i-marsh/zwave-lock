# Contributing to Z-Wave Lock Controller

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

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

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/my-feature`
3. **Make your changes:**
   - Follow existing code style
   - Add tests if applicable
   - Update documentation
   - Run `npm run build` to verify TypeScript compiles
4. **Commit with clear messages:**
   ```
   Add user code name support
   
   - Add name field to user code management
   - Update API endpoints to accept/return names
   - Add validation for code names
   ```
5. **Push and create PR:** Include description, testing done, and any breaking changes

## Development Setup

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

## Coding Standards

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

## Testing Checklist

Before submitting a PR, verify:

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Code follows project style
- [ ] No sensitive data in commits (config.json, keys, etc.)
- [ ] Documentation updated (README, API docs, etc.)
- [ ] No `console.log` debug statements left in code
- [ ] Error handling is appropriate
- [ ] Breaking changes are documented

## Documentation

Update relevant documentation:
- `README.md` - User-facing features, setup, usage
- `ATTRIBUTIONS.md` - New dependencies
- JSDoc comments - Internal functions
- API endpoint examples - New/changed endpoints

## Git Workflow

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

## Adding Dependencies

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

## Code Review Process

Maintainers will review PRs for:
- Code quality and style
- Security implications
- Performance impact
- Breaking changes
- Documentation completeness
- Test coverage

Reviews may request changes. Please:
- Address feedback constructively
- Ask questions if unclear
- Update your PR based on feedback
- Keep discussions focused on code

## Release Process

(For maintainers)

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.1.0`
4. Push tag: `git push origin v1.1.0`
5. Create GitHub release with notes
6. (Optional) Publish to npm

## Questions?

- Open a discussion for general questions
- Check existing issues and documentation first
- Be specific and provide context
- Be patient - this is volunteer-maintained

## Recognition

Contributors will be:
- Listed in release notes
- Acknowledged in the README (for significant contributions)
- Appreciated! 🙏

Thank you for helping improve this project!
