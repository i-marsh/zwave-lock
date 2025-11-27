import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { Driver, ZWaveNode } from 'zwave-js';
import { initializeDriver, shutdownDriver } from './driver.js';
import { listNodes, lockDoor, unlockDoor, getStatus, reinterviewNode } from './commands.js';
import { inspectNode } from './inspect.js';
import { loadConfig } from './config.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

// Global driver instance (persistent connection)
let driver: Driver | null = null;

// No caching - always query lock for real-time status

// Initialize driver on startup with retry
async function startDriver() {
  if (!driver) {
    console.log('🔌 Initializing Z-Wave driver...');
    const config = loadConfig();
    try {
      driver = await initializeDriver(config, true); // Enable auto-reconnect
      console.log('✓ Z-Wave driver ready\n');
    } catch (error) {
      console.error('⚠️  Initial driver connection failed, will keep trying in background');
      // Don't throw - let reconnect logic handle it
    }
  }
  return driver;
}

// Cleanup on shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');
  if (driver) {
    await shutdownDriver();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (driver) {
    await shutdownDriver();
  }
  process.exit(0);
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  const driverStatus = driver ? {
    connected: true,
    ready: driver.ready,
    networkId: driver.controller.homeId?.toString(16),
    nodeCount: driver.controller.nodes.size
  } : {
    connected: false,
    ready: false
  };
  
  res.json({ 
    status: 'ok',
    server: 'running',
    driver: driverStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// List all nodes
app.get('/nodes', async (req: Request, res: Response) => {
  try {
    const d = await startDriver();
    if (!d) {
      return res.status(503).json({ error: 'Z-Wave driver not ready, reconnecting...' });
    }
    const nodes = d.controller.nodes;
    
    const nodeList = Array.from(nodes.values()).map(node => ({
      id: node.id,
      status: node.status,
      ready: node.ready,
      manufacturer: node.deviceConfig?.manufacturer,
      description: node.deviceConfig?.description,
      label: node.deviceConfig?.label,
      isListening: node.isListening,
      isFrequentListening: node.isFrequentListening,
      canSleep: node.canSleep,
    }));
    
    res.json({ nodes: nodeList });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get node details
app.get('/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const nodeId = parseInt(req.params.nodeId);
    const d = await startDriver();
    if (!d) {
      return res.status(503).json({ error: 'Z-Wave driver not ready, reconnecting...' });
    }
    const node = d.controller.nodes.get(nodeId);
    
    if (!node) {
      return res.status(404).json({ error: `Node ${nodeId} not found` });
    }
    
    res.json({
      id: node.id,
      status: node.status,
      ready: node.ready,
      interviewStage: node.interviewStage,
      manufacturer: node.deviceConfig?.manufacturer,
      description: node.deviceConfig?.description,
      label: node.deviceConfig?.label,
      manufacturerId: node.manufacturerId,
      productType: node.productType,
      productId: node.productId,
      firmwareVersion: node.firmwareVersion,
      isListening: node.isListening,
      isFrequentListening: node.isFrequentListening,
      isRouting: node.isRouting,
      isSecure: node.isSecure,
      canSleep: node.canSleep,
      supportsBeaming: node.supportsBeaming,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Lock door
app.post('/nodes/:nodeId/lock', async (req: Request, res: Response) => {
  try {
    const nodeId = parseInt(req.params.nodeId);
    const d = await startDriver();
    if (!d) {
      return res.status(503).json({ error: 'Z-Wave driver not ready, reconnecting...' });
    }
    await lockDoor(d, nodeId);
    
    // Get updated lock state
    const node = d.controller.nodes.get(nodeId);
    const state = node?.getValue({
      commandClass: 0x62, // Door Lock CC
      property: 'currentMode',
    });
    const lockState = state === 255 ? 'locked' : state === 0 ? 'unlocked' : 'unknown';
    
    res.json({ success: true, message: `Node ${nodeId} locked`, state: lockState });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unlock door
app.post('/nodes/:nodeId/unlock', async (req: Request, res: Response) => {
  try {
    const nodeId = parseInt(req.params.nodeId);
    console.log(`🔓 Unlock command received for Node ${nodeId}`);
    const d = await startDriver();
    if (!d) {
      return res.status(503).json({ error: 'Z-Wave driver not ready, reconnecting...' });
    }
    
    await unlockDoor(d, nodeId);
    
    // Get updated lock state
    const node = d.controller.nodes.get(nodeId);
    const state = node?.getValue({
      commandClass: 0x62, // Door Lock CC
      property: 'currentMode',
    });
    const lockState = state === 255 ? 'locked' : state === 0 ? 'unlocked' : 'unknown';
    
    res.json({ 
      success: true, 
      message: `Node ${nodeId} unlocked`,
      state: lockState
    });
  } catch (error: any) {
    const nodeId = parseInt(req.params.nodeId);
    console.error(`❌ Unlock command failed for Node ${nodeId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get lock status
app.get('/nodes/:nodeId/status', async (req: Request, res: Response) => {
  try {
    const nodeId = parseInt(req.params.nodeId);
    const d = await startDriver();
    if (!d) {
      return res.status(503).json({ error: 'Z-Wave driver not ready, reconnecting...' });
    }
    const node = d.controller.nodes.get(nodeId);
    
    if (!node) {
      return res.status(404).json({ error: `Node ${nodeId} not found` });
    }
    
    // Get lock state (Door Lock CC)
    let lockState = 'unknown';
    try {
      const state = node.getValue({
        commandClass: 0x62, // Door Lock CC
        property: 'currentMode',
      });
      lockState = state === 255 ? 'locked' : state === 0 ? 'unlocked' : `state ${state}`;
    } catch (e) {
      // Lock state not available
    }
    
    // Get battery level
    let batteryLevel = null;
    try {
      batteryLevel = node.getValue({
        commandClass: 0x80, // Battery CC
        property: 'level',
      });
    } catch (e) {
      // Battery not available
    }
    
    res.json({
      nodeId,
      lockState,
      battery: batteryLevel,
      manufacturer: node.deviceConfig?.manufacturer,
      description: node.deviceConfig?.description,
      status: node.status,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Lock the door
app.post('/nodes/:nodeId/lock', async (req: Request, res: Response) => {
  try {
    const nodeId = parseInt(req.params.nodeId);
    const d = await startDriver();
    if (!d) {
      return res.status(503).json({ error: 'Z-Wave driver not ready, reconnecting...' });
    }

    console.log(`🔄 Re-interviewing node ${nodeId}...`);
    await reinterviewNode(d, nodeId);
    
    res.json({ 
      success: true,
      message: `Node ${nodeId} re-interview complete`,
      nodeId 
    });
  } catch (error: any) {
    console.error(`❌ Failed to re-interview node:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Server-Sent Events endpoint for real-time lock events
app.get('/nodes/:nodeId/events', async (req: Request, res: Response) => {
  try {
    const nodeId = parseInt(req.params.nodeId);
    const d = await startDriver();
    if (!d) {
      return res.status(503).json({ error: 'Z-Wave driver not ready, reconnecting...' });
    }
    const node = d.controller.nodes.get(nodeId);
    
    if (!node) {
      return res.status(404).json({ error: `Node ${nodeId} not found` });
    }
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();
    
    console.log(`📡 SSE connection opened for Node ${nodeId}`);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      nodeId: nodeId,
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    // Listen for value updates (lock state, battery, etc.)
    const onValueUpdated = (node: ZWaveNode, args: any) => {
      const event = {
        type: 'value-updated',
        nodeId: nodeId,
        property: args.propertyName,
        propertyKey: args.propertyKey,
        value: args.newValue,
        prevValue: args.prevValue,
        commandClass: args.commandClassName,
        timestamp: new Date().toISOString()
      };
      
      console.log(`📊 Value updated on Node ${nodeId}:`, args.propertyName, '=', args.newValue);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    
    // Listen for notifications (alarms, user codes, tamper, etc.)
    const onNotification = (...args: any[]) => {
      const [endpoint, ccId, notificationArgs] = args;
      const event = {
        type: 'notification',
        nodeId: nodeId,
        commandClass: ccId,
        parameters: notificationArgs,
        timestamp: new Date().toISOString()
      };
      
      console.log(`🔔 Notification on Node ${nodeId}:`, ccId, notificationArgs);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    
    // Attach event listeners
    node.on('value updated', onValueUpdated);
    node.on('notification', onNotification);
    
    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 30000);
    
    // Cleanup on client disconnect
    req.on('close', () => {
      console.log(`📡 SSE connection closed for Node ${nodeId}`);
      clearInterval(heartbeat);
      node.off('value updated', onValueUpdated);
      node.off('notification', onNotification);
      res.end();
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  try {
    // Initialize driver first
    await startDriver();
    
    app.listen(PORT, '0.0.0.0', () => {
      // Get local network IP
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      let localIP = '0.0.0.0';
      
      // Find the first non-internal IPv4 address
      for (const name of Object.keys(networkInterfaces)) {
        for (const iface of networkInterfaces[name]!) {
          if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
            break;
          }
        }
        if (localIP !== '0.0.0.0') break;
      }
      
      console.log(`
╔════════════════════════════════════════════════════════╗
║       Z-Wave Lock Controller - REST API Server        ║
╚════════════════════════════════════════════════════════╝

🌐 Server running on:
   - Local:   http://localhost:${PORT}
   - Network: http://${localIP}:${PORT}

📋 Available endpoints:
   GET  /health              - Health check
   GET  /nodes               - List all nodes
   GET  /nodes/:id           - Get node details
   GET  /nodes/:id/status    - Get lock status
   POST /nodes/:id/lock      - Lock door
   POST /nodes/:id/unlock    - Unlock door
   GET  /nodes/:id/events    - Real-time events (SSE)

🔌 Z-Wave driver: Connected
✓ Ready to accept requests
`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
