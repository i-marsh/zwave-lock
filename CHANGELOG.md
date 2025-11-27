# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release

## [1.0.0] - 2025-11-26

### Added
- Command-line interface for Z-Wave lock control
- Interactive mode with persistent driver connection
- REST API server with full lock control
- Web-based UI for lock control
- Real-time event listening via SSE (Server-Sent Events)
- User code management (add/delete lock codes)
- S2 security support for newer locks
- S0 Legacy security support for older Schlage BE469 locks
- Auto-generated security keys with backup warnings
- Device exclusion/inclusion commands
- Lock/unlock commands via CLI and API
- Battery level monitoring
- Lock status reporting
- Network diagnostics tools
- Support for macOS, Linux
- Comprehensive documentation

### Security
- Security keys stored in gitignored `config.json`
- Warning system for key backup
- Security policy documentation
- API runs on trusted networks only (no auth yet)

### Dependencies
- zwave-js ^13.0.0 - Z-Wave protocol implementation
- express ^5.1.0 - Web server
- commander ^12.0.0 - CLI framework
- cors ^2.8.5 - CORS middleware
- TypeScript ^5.3.0 - Type safety

### Known Issues
- REST API has no authentication (intended for local network use only)
- No automated tests yet
- Battery device interview may take multiple wake cycles
- Requires user code programming during S0 pairing for security

---

## Versioning Guidelines

### Major version (x.0.0)
- Breaking API changes
- Removal of features
- Major architectural changes

### Minor version (0.x.0)
- New features
- New endpoints
- Non-breaking enhancements

### Patch version (0.0.x)
- Bug fixes
- Documentation updates
- Security patches
- Performance improvements

---

[Unreleased]: https://github.com/YOUR-USERNAME/zwave-lock-controller/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/YOUR-USERNAME/zwave-lock-controller/releases/tag/v1.0.0
