import { Driver, ZWaveNode } from 'zwave-js';

/**
 * Listen for events from a specific node or all nodes
 */
export function listenForEvents(driver: Driver, nodeId?: number): void {
  if (nodeId) {
    const node = driver.controller.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    console.log(`\n👂 Listening for events from Node ${nodeId} (${node.deviceConfig?.description || 'Unknown Device'})...\n`);
    attachNodeListeners(node);
  } else {
    console.log('\n👂 Listening for events from all nodes...\n');
    driver.controller.nodes.forEach((node) => {
      attachNodeListeners(node);
    });
  }

  // Also listen for controller events
  driver.controller.on('inclusion started', (secure) => {
    console.log(`\n🔗 Inclusion started (secure: ${secure})`);
  });

  driver.controller.on('exclusion started', () => {
    console.log('\n🔓 Exclusion started');
  });

  driver.controller.on('inclusion stopped', () => {
    console.log('✓ Inclusion stopped\n');
  });

  driver.controller.on('exclusion stopped', () => {
    console.log('✓ Exclusion stopped\n');
  });

  driver.controller.on('inclusion failed', () => {
    console.log('❌ Inclusion failed\n');
  });

  driver.controller.on('exclusion failed', () => {
    console.log('❌ Exclusion failed\n');
  });

  driver.controller.on('node added', (node) => {
    console.log(`\n✓ Node ${node.id} added to network`);
    attachNodeListeners(node);
  });

  driver.controller.on('node removed', (node) => {
    console.log(`\n✓ Node ${node.id} removed from network`);
  });

  console.log('Press Ctrl+C to stop listening\n');
}

/**
 * Attach event listeners to a node
 */
function attachNodeListeners(node: ZWaveNode): void {
  const nodePrefix = `[Node ${node.id}]`;

  // Value changes (lock state, battery, etc.)
  node.on('value added', (node, args) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} Value Added:`);
    console.log(`  Property: ${args.propertyName || args.property}`);
    console.log(`  Value: ${formatValue(args.newValue)}`);
    if (args.commandClassName) {
      console.log(`  Command Class: ${args.commandClassName}`);
    }
    console.log('');
  });

  node.on('value updated', (node, args) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} Value Updated:`);
    console.log(`  Property: ${args.propertyName || args.property}`);
    console.log(`  Old Value: ${formatValue(args.prevValue)}`);
    console.log(`  New Value: ${formatValue(args.newValue)}`);
    if (args.commandClassName) {
      console.log(`  Command Class: ${args.commandClassName}`);
    }
    
    // Special handling for lock events
    if (args.commandClassName === 'Door Lock') {
      if (args.property === 'currentMode') {
        const state = args.newValue === 255 ? 'LOCKED' : args.newValue === 0 ? 'UNLOCKED' : `State ${args.newValue}`;
        console.log(`  🚪 Door is now: ${state}`);
      }
    }
    
    // Special handling for battery
    if (args.commandClassName === 'Battery' && args.property === 'level') {
      console.log(`  🔋 Battery level: ${args.newValue}%`);
    }
    
    console.log('');
  });

  node.on('value removed', (node, args) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} Value Removed:`);
    console.log(`  Property: ${args.propertyName || args.property}`);
    console.log('');
  });

  // Notification events (alarms, tampering, etc.)
  node.on('notification', (node, ccId, args) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} 🔔 Notification:`);
    console.log(`  Command Class: ${ccId}`);
    console.log(`  Parameters:`, args);
    console.log('');
  });

  // Wake up events (battery devices)
  node.on('wake up', () => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} ⏰ Device woke up`);
  });

  node.on('sleep', () => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} 😴 Device went to sleep`);
  });

  // Dead/alive status
  node.on('dead', () => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} ☠️  Device is dead (no response)`);
  });

  node.on('alive', () => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} ✅ Device is alive`);
  });

  // Interview progress
  node.on('interview started', () => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} 🔍 Interview started`);
  });

  node.on('interview completed', () => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} ✓ Interview completed`);
  });

  node.on('interview failed', () => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} ❌ Interview failed`);
  });

  node.on('ready', () => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${nodePrefix} ✓ Node is ready`);
  });
}

/**
 * Format a value for display
 */
function formatValue(value: any): string {
  if (value === undefined || value === null) {
    return 'null';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
