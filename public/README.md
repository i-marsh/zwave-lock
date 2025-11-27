# Lock Control Web App

Touch-friendly web interface for controlling your Schlage Z-Wave lock, optimized for Samsung refrigerator touchscreens.

## Features

✅ **Real-time updates** via Server-Sent Events (SSE)
- Lock/unlock status updates instantly
- Battery level monitoring
- Event notifications

✅ **Touch-optimized UI**
- Large, easy-to-tap buttons
- Clear visual feedback
- Responsive design

✅ **Live Event Log**
- See when door was locked/unlocked
- Battery alerts
- System notifications

## Quick Start

### 1. Start the API Server

```bash
npm run start:api
```

The server will start on http://localhost:3000

### 2. Configure Node ID

Edit `public/app.js` and set your lock's node ID:

```javascript
const NODE_ID = 2; // Change to your lock's node ID
```

To find your node ID:
```bash
npm start -- list
```

### 3. Open in Browser

On your Samsung refrigerator browser, navigate to:

```
http://YOUR_COMPUTER_IP:3000
```

To find your computer's IP:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Or
ipconfig getifaddr en0
```

Example: `http://192.168.1.100:3000`

## API Endpoints

### Lock Control
- `POST /nodes/:nodeId/lock` - Lock the door
- `POST /nodes/:nodeId/unlock` - Unlock the door
- `GET /nodes/:nodeId/status` - Get current status

### Real-time Events (SSE)
- `GET /nodes/:nodeId/events` - Stream real-time events

### Device Management
- `GET /nodes` - List all nodes
- `GET /nodes/:nodeId` - Get node details

## Event Types

The SSE endpoint broadcasts:

**Value Updates:**
- Lock state changes (locked/unlocked)
- Battery level changes
- Any property updates

**Notifications:**
- User code usage (coming soon)
- Tamper alerts
- Invalid code attempts
- Auto-lock events

## Customization

### Change Colors/Theme

Edit `public/styles.css` to customize:
- Background gradient
- Button colors
- Lock status colors
- Font sizes

### Add Features

The frontend (`public/app.js`) can be extended to:
- Display which user code was used
- Show unlock history
- Manage user codes (requires backend implementation)

## Troubleshooting

### Can't connect from refrigerator
1. Make sure computer and fridge are on same WiFi
2. Check firewall allows port 3000
3. Use IP address, not `localhost`

### Events not updating
1. Check browser console for errors
2. Verify SSE connection in Network tab
3. Restart the API server

### Lock commands not working
1. Verify node ID is correct
2. Check lock is awake (battery devices sleep)
3. Check API server logs for errors

## Development

### Run in development mode
```bash
npm run dev
```

### Test SSE connection
```bash
curl -N http://localhost:3000/nodes/2/events
```

You should see events streaming in real-time.

## Network Security

**Important:** This API has no authentication. For home use only.

For production:
- Add authentication (JWT, API keys)
- Use HTTPS
- Restrict CORS origins
- Add rate limiting

## Next Steps

See main README.md for:
- User code management API
- Event logging to database
- WebSocket implementation (alternative to SSE)
