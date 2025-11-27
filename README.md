# Z-Wave Lock Controller

[![CI](https://github.com/i-marsh/zwave-lock/actions/workflows/ci.yml/badge.svg)](https://github.com/i-marsh/zwave-lock/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Command-line interface and REST API for controlling Z-Wave door locks via USB dongle.

**Compatible with:** Schlage, Kwikset, Yale, and other Z-Wave certified locks supporting Door Lock and User Code command classes.

> ⚠️ **DISCLAIMER**: THIS SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. The authors and contributors accept NO LIABILITY for any damages, security breaches, or unauthorized access resulting from the use of this software. This project controls physical door locks - use at your own risk. Review [SECURITY.md](SECURITY.md) before deploying.

> **Trademark Notice**: Schlage®, Kwikset®, Yale®, and Z-Wave® are registered trademarks of their respective owners. This project is not affiliated with, endorsed by, or sponsored by any lock manufacturer, Z-Wave Alliance, or other vendors. Use of these names is for compatibility identification only.

## 🎯 Project Overview

This project provides multiple interfaces for controlling Z-Wave door locks:
- **CLI** - Single commands and interactive mode
- **REST API** - HTTP endpoints for integration
- **Web UI** - Real-time, touch-friendly interface with Server-Sent Events (SSE)

**Tested with:** Schlage BE469, BE479, and other Z-Wave locks supporting the Door Lock and User Code command classes.

**Should work with:** Any Z-Wave certified lock implementing standard Door Lock Command Class (0x62) and User Code Command Class (0x63).

## 🔧 Hardware Requirements

### Z-Wave Controller (USB Dongle)
- **Tested:** Aeotec Z-Stick 7 (500 series chip)
- **Compatible:** Any 500/700/800 series Z-Wave USB dongle
- **Interface:** USB-to-serial (typically shows as `/dev/cu.usbmodem*` or `/dev/cu.SLAB_USBtoUART` on macOS)

### Door Lock
- **Tested Models:**
  - Schlage BE469 (S0 Legacy security, 30 user codes)
  - Schlage BE479 (S0 Legacy security)
- **Should work with:**
  - Kwikset SmartCode series
  - Yale Assure Lock series  
  - Any Z-Wave certified lock with Door Lock Command Class
- **Requirements:**
  - Z-Wave 500/700/800 series
  - Door Lock Command Class (0x62)
  - Optional: User Code Command Class (0x63) for code management
  
### Computer/Server
- **OS:** macOS, Linux, or Windows
- **Node.js:** 18+
- **RAM:** Minimal (~50MB for driver + API)
- **Always-on:** Required for persistent Z-Wave network coordination

### Optional: Samsung Refrigerator Touchscreen
- Any browser-enabled Samsung fridge (tested on Family Hub models)
- WiFi connectivity on same network as server
- Browser supports EventSource API (for SSE)

## 🏗️ Architecture & Design

### System Diagram
```
┌─────────────────┐         ┌──────────────────┐
│  Samsung Fridge │◄────────┤   Web Browser    │
│   Touchscreen   │  WiFi   │  (EventSource)   │
└─────────────────┘         └────────┬─────────┘
                                     │ SSE + REST
                            ┌────────▼─────────┐
                            │   Express API    │
                            │  (Node.js/TS)    │
                            └────────┬─────────┘
                                     │
                            ┌────────▼─────────┐
                            │   zwave-js       │
                            │    Driver        │
                            └────────┬─────────┘
                                     │ USB Serial
                            ┌────────▼─────────┐
                            │  Z-Wave Dongle   │
                            │  (Aeotec Stick)  │
                            └────────┬─────────┘
                                     │ Z-Wave RF
                            ┌────────▼─────────┐
                            │  Schlage BE469   │
                            │   Door Lock      │
                            └──────────────────┘
```

### Design Decisions

**Why Server-Sent Events (SSE)?**
- One-way server→client communication (perfect for lock status updates)
- Simpler than WebSockets (no bidirectional needed)
- Built-in auto-reconnect
- Works through most firewalls/proxies
- Native browser API, no external libraries
- **Event-driven, not polling** - Zero Z-Wave traffic, zero battery impact

**Why Separate Commands vs API?**
- Commands send lock/unlock, then driver closes connection
- API keeps persistent Z-Wave connection (required for SSE)
- Persistent connection enables instant event notifications

**Why Not Polling?**
- Z-Wave battery devices sleep between operations
- Polling would drain battery or fail when lock is asleep
- Event-driven: Lock wakes, broadcasts changes, goes back to sleep
- SSE connection is browser↔server only (zero Z-Wave traffic)

### Limitations

**Security Class: S0 Only**
- Schlage BE469 uses 500-series Z-Wave chip
- Does NOT support S2 security (newer protocol)
- S0 uses 128-bit AES encryption (sufficient for residential use)
- **Commands will FAIL if lock not paired securely** - must include with S0

**Battery-Powered Lock Behavior**
- Lock sleeps between operations to conserve battery
- Wake lock by pressing any button before sending commands
- Interview can take 5-10 minutes for battery devices
- Some commands (like reading all user codes) may timeout if lock sleeps mid-operation

**User Code Limitations**
- Actual PIN codes cannot be read via Z-Wave (security feature)
- Can only see which slots are occupied (status)
- Changing code length (param 16) **DELETES ALL USER CODES**
- Name-to-code mapping requires external database (not yet implemented)

**Network Range**
- Z-Wave range: ~30-100 feet through walls
- Metal doors/appliances can interfere
- Lock must be within range during pairing and operation

## 📦 Installation

### Prerequisites
```bash
# macOS
brew install node

# Verify Node.js 18+
node --version
```

### Setup
```bash
# Clone repository
git clone <repository-url>
cd schlage

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### First-Time Configuration

**1. Find Your Z-Wave Dongle**
```bash
ls /dev/cu.*
# Look for: /dev/cu.usbmodem* or /dev/cu.SLAB_USBtoUART
```

**2. Generate Security Keys**
```bash
npm start -- list --port /dev/cu.usbmodem21101
```
This auto-generates S0/S2 security keys in `config.json`

**⚠️ CRITICAL: Back up these keys immediately!**
- Store in password manager
- Without keys, you must factory reset ALL devices if keys are lost
- `config.json` is git-ignored to prevent accidental commits

**3. Save Port Configuration**
```bash
npm start -- config --set-port /dev/cu.usbmodem21101
```

## 🔐 Pairing Your Lock (CRITICAL STEPS)

### Why Secure Pairing is Required
**Commands will NOT work if the lock is paired insecurely.** The lock must be included with S0 security to accept lock/unlock commands over Z-Wave.

### Pairing Process for Schlage BE469

**IMPORTANT: Manual Keypad Entry is Required**

The lock MUST be put into inclusion mode using the keypad. Simply pressing buttons will NOT trigger secure pairing.

**Step 1: Exclude (if previously paired)**
```bash
npm start -- exclude
```
Then on the lock keypad:
1. Press **Schlage button**
2. Enter **Programming Code** (6 digits, from installation card)
3. Press **Schlage button** again
4. Press **0**

**Step 2: Pair with S0 Security**
```bash
npm start -- pair-s0
```

Then on the lock keypad (**critical sequence**):
1. Press **Schlage button**
2. Enter **Programming Code** (6 digits)
3. Press **0**
4. Press **Lock icon** 🔒

**Optional** (may not be required on all models):
5. Enter a **new 4-8 digit User Code** (this becomes User Code #1)
6. Press **Lock icon** 🔒 to confirm

**Visual Feedback:**
- 🟢 **Green checkmark flashing** = Success (pairing complete)
- 🔴 **Red X flashing** = Failure (retry the sequence)
- No response = Lock not in programming mode (re-enter programming code)

**Note:** Steps 5-6 may not be required on all lock models or firmware versions. If the lock shows a green checkmark after step 4, pairing is complete.

**Why this sequence matters:**
- S0 security pairing may require programming a user code
- If commands fail with "operation not supported," try excluding and re-pairing with a user code
- Some firmware versions pair successfully without the user code step

**Step 3: Wait for Interview**
```bash
npm start -- wait-interview 8 300
```
Battery devices can take 5-10 minutes to complete interview. Press lock button periodically to keep it awake.

**Step 4: Verify Security**
```bash
npm start -- diagnostics
```
Look for:
```
Node 8: Schlage BE469
  Secure: Yes ✓
  Highest Security: S0_Legacy
```

If `Secure: No`, the lock was paired incorrectly. Exclude and re-pair following the keypad sequence exactly

## 🚀 Usage

### CLI - Single Commands

```bash
# List all devices
npm start -- list

# Lock the door (node 8)
npm start -- lock 8

# Unlock the door
npm start -- unlock 8

# Get status (battery, lock state)
npm start -- status 8

# List user codes
npm start -- list-codes 8

# Set user code (slot 1, code 1234)
npm start -- set-code 8 1 1234

# Delete user code
npm start -- delete-code 8 1

# Get current code length setting
npm start -- get-code-length 8

# Set code length (WARNING: Deletes all codes!)
npm start -- set-code-length 8 6
```

### CLI - Interactive Mode

```bash
npm start

zwave> list
zwave> lock 8
zwave> unlock 8
zwave> status 8
zwave> list-codes 8
zwave> set-code 8 1 1234
zwave> help
zwave> exit
```

### REST API

**Start Server:**
```bash
npm run start:api
# Server runs on http://localhost:3000
```

**Endpoints:**

```bash
# Health check
GET /health

# List all nodes
GET /nodes

# Get node details
GET /nodes/8

# Get lock status
GET /nodes/8/status

# Lock door
POST /nodes/8/lock

# Unlock door
POST /nodes/8/unlock

# Real-time events (SSE)
GET /nodes/8/events

# List user codes
GET /nodes/8/user-codes

# Set user code
POST /nodes/8/user-codes/1
Body: { "code": "1234", "name": "Front Door" }

# Delete user code
DELETE /nodes/8/user-codes/1
```

**Example:**
```bash
# Lock the door
curl -X POST http://localhost:3000/nodes/8/lock

# Get status
curl http://localhost:3000/nodes/8/status

# Stream events
curl -N http://localhost:3000/nodes/8/events
```

### Web UI

**1. Start API Server:**
```bash
npm run start:api
```

**2. Access from Device:**

From your computer:
```
http://localhost:3000
```

From Samsung fridge (or other device on same network):
```bash
# Find your computer's IP
ipconfig getifaddr en0

# Then on fridge browser:
http://YOUR_IP:3000
# Example: http://192.168.1.100:3000
```

**3. Select Lock:**
- Choose your lock from dropdown (e.g., "Node 8: Schlage BE469")
- Selection is saved to localStorage

**4. Features:**
- Lock/unlock buttons (large, touch-friendly)
- Real-time status updates (no refresh needed)
- Battery level indicator
- Live event log
- Auto-reconnects if connection drops

## 🔧 Troubleshooting

### Lock Commands Don't Work

**Symptom:** "Operation not supported" or commands timeout

**Causes:**
1. Lock not paired with S0 security
2. Lock is asleep (battery-powered)

**Solutions:**
```bash
# Check security
npm start -- diagnostics

# Look for:
# Secure: Yes ✓

# If Secure: No, re-pair:
npm start -- exclude
npm start -- pair-s0
# Follow keypad sequence EXACTLY (include user code programming)
```

### Node Not Found (Wrong Node ID)

**Symptom:** `Node 2 not found` in web UI

**Solution:**
```bash
# Find correct node ID
npm start -- list

# Update web app if needed, or select from dropdown
```

### Lock Not Responding

**Symptom:** Commands timeout

**Cause:** Lock is asleep (battery device)

**Solution:**
1. Press any button on lock keypad to wake it
2. Send command within 3-5 seconds
3. For reading many user codes, keep pressing buttons to keep awake

### Interview Not Completing

**Symptom:** Lock stuck in interview stage

**Solution:**
```bash
# Wait with periodic wake-ups
npm start -- wait-interview 8 600

# Press lock button every 30 seconds to keep awake
```

### USB Dongle Not Detected

**Symptom:** "Serial port not found"

**Solutions:**
```bash
# List USB devices
ls /dev/cu.*

# Install driver (Silicon Labs)
# Download from: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

# Verify driver
kextstat | grep -i silabs

# Try different USB port (avoid hubs)
```

### Code Length Changed, All Codes Gone

**This is expected behavior.** Changing Parameter 16 (user code length) resets all user code slots.

**Solution:**
1. Check current length: `npm start -- get-code-length 8`
2. Only change if necessary
3. After changing, reprogram all user codes

## 📁 Project Structure

```
schlage/
├── src/
│   ├── api.ts              # REST API + SSE server
│   ├── commands.ts         # Lock control functions
│   ├── config.ts           # Security keys + port management
│   ├── driver.ts           # Z-Wave driver lifecycle
│   ├── index.ts            # CLI entry point
│   ├── interactive.ts      # Interactive shell
│   ├── inspect.ts          # Node inspection tools
│   ├── diagnostics.ts      # Network diagnostics
│   └── listen.ts           # Event listener utilities
├── public/
│   ├── index.html          # Web UI
│   ├── styles.css          # Touch-optimized CSS
│   └── app.js              # Frontend logic + SSE
├── config.json             # Security keys (git-ignored)
├── package.json
└── tsconfig.json
```

## 🔒 Security Considerations

**Do NOT commit `config.json`**
- Contains S0/S2 security keys
- Anyone with these keys can control your lock
- `.gitignore` already excludes this file

**Network Security**
- API has NO authentication (home network only)
- Do NOT expose to internet without:
  - HTTPS/TLS
  - Authentication (JWT, API keys)
  - Rate limiting
  - Firewall rules

**Physical Security**
- Always keep a physical key backup
- Master code programmed via keypad only (not Z-Wave accessible)

## 🎯 Future Enhancements

- [ ] Database for user code names
- [ ] Event logging with timestamps and user tracking
- [ ] Authentication for API
- [ ] User code usage history ("Ian unlocked door - Nov 26, 2025 3:45 PM")
- [ ] Mobile app (React Native)
- [ ] Multi-lock support
- [ ] Automated backup/restore of configuration

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Make your changes
5. Test thoroughly (especially with real hardware if modifying Z-Wave logic)
6. Submit a pull request

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community guidelines.

## 📋 Roadmap

See [CHANGELOG.md](CHANGELOG.md) for version history.

**Potential future features:**
- [ ] Authentication for REST API
- [ ] HTTPS support
- [ ] Automated tests
- [ ] Docker container
- [ ] Home Assistant integration
- [ ] Multi-lock support
- [ ] Scheduled lock/unlock
- [ ] Webhook notifications
- [ ] MQTT support

## 📚 Resources

- [Z-Wave JS Documentation](https://zwave-js.github.io/node-zwave-js/)
- [Schlage BE469 Manual](https://www.schlage.com/en/home/support/manuals.html)
- [Z-Wave Command Classes](https://www.silabs.com/documents/public/user-guides/INS13954-Instruction-Z-Wave-500-Series-Appl-Programmers-Guide-v6_8x_0x.pdf)
- [Server-Sent Events Spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

### Third-Party Licenses

This project uses several open-source dependencies. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for complete license information and attributions.

**Summary of dependency licenses:**
- 218 packages under MIT License
- 13 packages under ISC License  
- 3 packages under Apache-2.0 License
- All licenses are permissive and allow commercial use

Run `npx license-checker --summary` to see current license distribution.

## 🙏 Acknowledgments

- [zwave-js](https://github.com/zwave-js/node-zwave-js) - Excellent pure JavaScript Z-Wave library
- [Express](https://expressjs.com/) - Fast, minimalist web framework
- [Commander.js](https://github.com/tj/commander.js) - Complete CLI solution
- The Node.js and TypeScript communities
- All open-source contributors who made this project possible

## 💬 Support

- **Documentation**: Check the README and related docs first
- **Issues**: [Open an issue](https://github.com/YOUR-USERNAME/zwave-lock-controller/issues) for bugs or feature requests
- **Discussions**: [GitHub Discussions](https://github.com/YOUR-USERNAME/zwave-lock-controller/discussions) for questions
- **Security**: See [SECURITY.md](SECURITY.md) for reporting vulnerabilities

## ⚠️ Disclaimer

This software is provided "as is" without warranty of any kind. Smart locks should supplement, not replace, physical security measures. Always maintain a physical key backup.
- All open-source contributors who made this project possible

---

**Questions?** Open an issue or consult the troubleshooting section above.

GET /health