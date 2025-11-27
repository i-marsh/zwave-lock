import { Driver } from 'zwave-js';

/**
 * Run diagnostic tests on the Z-Wave network and nodes
 */
export async function runDiagnostics(driver: Driver): Promise<void> {
  console.log('\n🔧 Running Z-Wave Network Diagnostics\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Controller info
  console.log('CONTROLLER STATUS:');
  console.log(`  Home ID:           0x${driver.controller.homeId?.toString(16).padStart(8, '0') || '????????'}`);
  console.log(`  Node ID:           ${driver.controller.ownNodeId}`);
  console.log(`  SDK Version:       ${driver.controller.sdkVersion || 'Unknown'}`);
  console.log(`  Is Primary:        ${driver.controller.isPrimary ? 'Yes' : 'No'}`);
  console.log(`  Is SIS:            ${driver.controller.isSIS ? 'Yes' : 'No'}`);
  console.log('');

  // Check security keys
  console.log('SECURITY CONFIGURATION:');
  const hasS2Keys = driver.options.securityKeys !== undefined;
  console.log(`  Security Keys Set: ${hasS2Keys ? 'Yes' : 'No'}`);
  
  if (hasS2Keys && driver.options.securityKeys) {
    const keys = driver.options.securityKeys;
    console.log(`  S2_AccessControl:   ${keys.S2_AccessControl ? '✓ Configured' : '✗ Missing'}`);
    console.log(`  S2_Authenticated:   ${keys.S2_Authenticated ? '✓ Configured' : '✗ Missing'}`);
    console.log(`  S2_Unauthenticated: ${keys.S2_Unauthenticated ? '✓ Configured' : '✗ Missing'}`);
    console.log(`  S0_Legacy:          ${keys.S0_Legacy ? '✓ Configured' : '✗ Missing'}`);
  }
  console.log('');

  // Check all nodes
  console.log('NODE DIAGNOSTICS:');
  for (const [nodeId, node] of driver.controller.nodes) {
    console.log(`\n  Node ${nodeId}: ${node.deviceConfig?.description || 'Unknown Device'}`);
    console.log(`    Status:           ${node.status !== 0 ? 'Alive' : 'Dead/Sleeping'}`);
    console.log(`    Ready:            ${node.ready ? 'Yes' : 'No'}`);
    console.log(`    Interview:        Stage ${node.interviewStage}`);
    console.log(`    Secure:           ${node.isSecure ? 'Yes ✓' : 'No ✗'}`);
    
    if (node.isSecure) {
      console.log(`    Highest Security: ${node.getHighestSecurityClass() || 'Unknown'}`);
    } else if (nodeId !== driver.controller.ownNodeId) {
      console.log(`    ⚠️  WARNING: Door locks MUST be paired with S2 security!`);
    }
    
    console.log(`    Listening:        ${node.isListening ? 'Yes (AC)' : 'No (Battery)'}`);
    
    // Check if node supports Door Lock CC
    const hasDoorLock = node.commandClasses['Door Lock'] !== undefined;
    if (hasDoorLock) {
      console.log(`    Door Lock CC:     ✓ Supported`);
    }
    
    // Battery info
    if (!node.isListening) {
      const batteryCC = node.commandClasses['Battery'];
      if (batteryCC) {
        console.log(`    Battery CC:       ✓ Supported`);
      }
    }
  }

  console.log('\n');
  console.log('RECOMMENDATIONS:');
  
  // Check for insecure door locks
  let hasInsecureLocks = false;
  for (const [nodeId, node] of driver.controller.nodes) {
    const hasDoorLock = node.commandClasses['Door Lock'] !== undefined;
    if (hasDoorLock && !node.isSecure && nodeId !== driver.controller.ownNodeId) {
      hasInsecureLocks = true;
      console.log(`  ⚠️  Node ${nodeId} is a door lock paired WITHOUT security!`);
      console.log(`     This is a security risk. Re-pair with S2 encryption:`);
      console.log(`     1. npm start -- exclude`);
      console.log(`     2. npm start -- pair`);
      console.log(`     3. Enter the DSK PIN when prompted\n`);
    }
  }

  // Check for incomplete interviews
  for (const [nodeId, node] of driver.controller.nodes) {
    if (!node.ready && nodeId !== driver.controller.ownNodeId) {
      console.log(`  ⏳ Node ${nodeId} interview incomplete (Stage ${node.interviewStage})`);
      console.log(`     Battery devices may take time to complete.`);
      console.log(`     Try waking the device or wait for it to wake naturally.\n`);
    }
  }

  if (!hasInsecureLocks) {
    console.log('  ✓ All door locks are properly secured!\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Test lock/unlock functionality
 */
export async function testLock(driver: Driver, nodeId: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  console.log(`\n🧪 Testing Lock Functionality: Node ${nodeId}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if ready
  console.log(`Node Ready:        ${node.ready ? '✓ Yes' : '✗ No (interview incomplete)'}`);
  console.log(`Secure:            ${node.isSecure ? '✓ Yes' : '✗ No'}`);
  console.log(`Status:            ${node.status !== 0 ? 'Alive' : 'Asleep'}`);
  console.log('');

  // Check for Door Lock CC
  const doorLockCC = node.commandClasses['Door Lock'];
  
  if (!doorLockCC) {
    console.log('✗ ERROR: Node does not support Door Lock Command Class!\n');
    console.log('This device is not a compatible door lock.\n');
    return;
  }

  console.log('✓ Door Lock Command Class: Supported\n');

  // Try to ping the node
  console.log('Testing node communication...');
  try {
    const pingResult = await node.ping();
    console.log(`✓ Ping successful! Round-trip: ${pingResult}ms\n`);
  } catch (error: any) {
    console.log(`✗ Ping failed: ${error.message}`);
    console.log('  The device may be asleep. Try pressing a button on the lock.\n');
  }

  // Try to get current lock state
  console.log('Attempting to read lock state...');
  try {
    const lockState = await doorLockCC.get();
    console.log(`✓ Current lock state: ${lockState?.currentMode || 'Unknown'}\n`);
  } catch (error: any) {
    console.log(`✗ Failed to read lock state: ${error.message}\n`);
  }

  console.log('NEXT STEPS:');
  if (!node.ready) {
    console.log('  1. Wait for node interview to complete');
    console.log('  2. Wake the lock by pressing a button');
    console.log('  3. Run diagnostics again: npm start -- diagnostics\n');
  } else if (!node.isSecure) {
    console.log('  1. Re-pair the lock with S2 security');
    console.log('  2. npm start -- exclude');
    console.log('  3. npm start -- pair (enter DSK when prompted)\n');
  } else {
    console.log('  Lock appears ready! Try:');
    console.log(`  - npm start -- lock ${nodeId}`);
    console.log(`  - npm start -- unlock ${nodeId}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
