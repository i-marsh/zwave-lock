import { Driver } from 'zwave-js';

/**
 * Get detailed information about a specific node
 */
export async function inspectNode(driver: Driver, nodeId: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  console.log(`\n🔍 Detailed Node Information: Node ${nodeId}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Basic info
  console.log('BASIC INFORMATION:');
  console.log(`  Node ID:           ${node.id}`);
  console.log(`  Name:              ${node.name || '(not set)'}`);
  console.log(`  Location:          ${node.location || '(not set)'}`);
  console.log(`  Status:            ${node.status !== 0 ? 'Alive' : 'Dead/Sleeping'}`);
  console.log(`  Ready:             ${node.ready ? 'Yes' : 'No'}`);
  console.log(`  Interview Stage:   ${node.interviewStage}`);
  console.log('');

  // Device info
  console.log('DEVICE INFORMATION:');
  console.log(`  Manufacturer:      ${node.deviceConfig?.manufacturer || 'Unknown'}`);
  console.log(`  Description:       ${node.deviceConfig?.description || 'Unknown'}`);
  console.log(`  Label:             ${node.deviceConfig?.label || 'Unknown'}`);
  console.log(`  Manufacturer ID:   0x${node.manufacturerId?.toString(16).padStart(4, '0') || '????'}`);
  console.log(`  Product Type:      0x${node.productType?.toString(16).padStart(4, '0') || '????'}`);
  console.log(`  Product ID:        0x${node.productId?.toString(16).padStart(4, '0') || '????'}`);
  console.log('');

  // Power and capabilities
  console.log('CAPABILITIES:');
  console.log(`  Listening:         ${node.isListening ? 'Yes (AC powered)' : 'No (Battery)'}`);
  console.log(`  Frequent Listen:   ${node.isFrequentListening ? 'Yes' : 'No'}`);
  console.log(`  Routing:           ${node.isRouting ? 'Yes' : 'No'}`);
  console.log(`  Secure:            ${node.isSecure ? 'Yes' : 'No'}`);
  console.log(`  Beaming:           ${node.supportsBeaming ? 'Yes' : 'No'}`);
  console.log('');

  // Firmware
  if (node.firmwareVersion) {
    console.log('FIRMWARE:');
    console.log(`  Version:           ${node.firmwareVersion}`);
    console.log('');
  }

  // Command classes
  const supportedCCs = Object.keys(node.commandClasses);
  if (supportedCCs.length > 0) {
    console.log('SUPPORTED COMMAND CLASSES:');
    supportedCCs.forEach((cc) => {
      console.log(`  - ${cc}`);
    });
    console.log('');
  }

  // Special info for controller (Node 1)
  if (node.id === driver.controller.ownNodeId) {
    console.log('CONTROLLER INFO:');
    console.log(`  Home ID:           0x${driver.controller.homeId?.toString(16).padStart(8, '0') || '????????'}`);
    console.log(`  Type:              ${driver.controller.type || 'Unknown'}`);
    console.log(`  SDK Version:       ${driver.controller.sdkVersion || 'Unknown'}`);
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Discover nearby Z-Wave devices (not yet paired)
 * Note: Z-Wave doesn't support "scanning" for unpaired devices.
 * Devices must be manually put in pairing mode and included.
 */
export async function scanInfo(driver: Driver): Promise<void> {
  console.log('\n📡 Z-Wave Network Scan Information\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('IMPORTANT: Z-Wave does NOT support scanning for unpaired devices.');
  console.log('To add new devices, you must:');
  console.log('  1. Run: npm start -- pair');
  console.log('  2. Press the inclusion button on your device\n');

  console.log('CURRENT NETWORK STATUS:');
  console.log(`  Home ID:           0x${driver.controller.homeId?.toString(16).padStart(8, '0') || '????????'}`);
  console.log(`  Own Node ID:       ${driver.controller.ownNodeId}`);
  console.log(`  Total Nodes:       ${driver.controller.nodes.size}`);
  console.log(`  Controller Type:   ${driver.controller.type || 'Unknown'}`);
  console.log('');

  // List all paired nodes
  console.log('PAIRED NODES:');
  for (const [nodeId, node] of driver.controller.nodes) {
    const type = nodeId === driver.controller.ownNodeId ? '(Controller)' : 
                 node.isListening ? '(AC Powered)' : '(Battery)';
    const status = node.status !== 0 ? '✓' : '✗';
    const name = node.deviceConfig?.description || node.name || 'Unknown Device';
    console.log(`  ${status} Node ${nodeId}: ${name} ${type}`);
  }
  console.log('');

  console.log('TO ADD DEVICES:');
  console.log('  - Exclude first:  npm start -- exclude');
  console.log('  - Then pair:      npm start -- pair');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
