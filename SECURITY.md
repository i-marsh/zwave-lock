# Security Policy

## Critical Security Information

### Z-Wave Network Security Keys

This project uses Z-Wave network security keys to encrypt communication with your smart locks. **These keys are equivalent to physical keys to your home.**

### 🔒 What You Must Protect

1. **`config.json`** - Contains your Z-Wave security keys
2. **Screenshots/logs** - May contain security keys or network topology
3. **Backup files** - `*.json.backup`, `config.json.old`, etc.

### ✅ Security Checklist

- [ ] `config.json` is in `.gitignore` (already done)
- [ ] Security keys backed up in password manager
- [ ] No commits contain `config.json`
- [ ] No screenshots shared that show security keys
- [ ] API only accessible on trusted network

## What Happens If Keys Are Compromised?

If someone gains access to your `config.json`:
- They can control any device on your Z-Wave network
- They can unlock your doors remotely (if on your network)
- They can intercept and decrypt Z-Wave traffic

## Recovery from Compromise

If you believe your security keys have been compromised:

1. **Immediately** factory reset all Z-Wave devices
2. Delete `config.json` 
3. Restart the pairing process (new keys will be generated)
4. Change your WiFi password if network access was compromised
5. Review your network access logs

## REST API Security

### Current State (v1.0)

⚠️ **The REST API has NO authentication.** It's designed for use on a trusted home network.

### Recommendations

For production use, you should:

1. **Add authentication middleware** (JWT, API keys, etc.)
2. **Use HTTPS** with valid certificates
3. **Implement rate limiting** to prevent abuse
4. **Use firewall rules** to restrict access by IP
5. **Run behind a reverse proxy** (nginx, Caddy) with auth

Example firewall rule (macOS):
```bash
# Only allow from local network
sudo pfctl -e
echo "block in proto tcp from any to any port 3000" | sudo pfctl -f -
echo "pass in proto tcp from 10.0.0.0/24 to any port 3000" | sudo pfctl -f -
```

### Attack Vectors

- **Network sniffing**: Anyone on your network can see API traffic (use HTTPS)
- **Unauthorized access**: Anyone who can reach the API can control locks (add auth)
- **Man-in-the-middle**: HTTP traffic can be intercepted (use HTTPS)

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** open a public GitHub issue
2. Email the maintainer privately (if open sourced, add contact)
3. Include detailed reproduction steps
4. Allow time for a fix before public disclosure

## Best Practices

### For Users

- Run API server only when needed
- Use a dedicated VLAN for IoT devices
- Keep Node.js and dependencies updated
- Monitor API access logs
- Use strong WiFi encryption (WPA3)

### For Contributors

- Never commit `config.json` or security keys
- Sanitize all code examples and screenshots
- Use `config.example.json` for documentation
- Redact network IDs and device identifiers from logs
- Review pull requests for accidental credential exposure

## Security Updates

This project uses:
- `zwave-js` - Actively maintained Z-Wave library
- `express` - Widely used web framework

Run `npm audit` regularly to check for vulnerabilities:
```bash
npm audit
npm audit fix
```

## Legal Disclaimer

This software is provided "as is" without warranty. Users are responsible for:
- Securing their own Z-Wave networks
- Implementing additional authentication if needed
- Compliance with local laws regarding smart locks
- Physical security as a backup to electronic systems

**Remember: Smart locks are a convenience, not a replacement for physical security. Always have a physical key backup.**
