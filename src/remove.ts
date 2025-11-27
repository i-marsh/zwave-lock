import { Driver } from 'zwave-js';

/**
 * Remove a failed/ghost node from the network
 */
export async function removeFailedNode(driver: Driver, nodeId: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found in the network`);
  }

  console.log(`\n🗑️  Attempting to remove Node ${nodeId}...\n`);

  try {
    // Try to remove as a failed node
    await driver.controller.removeFailedNode(nodeId);
    console.log(`✓ Node ${nodeId} successfully removed from the network!\n`);
  } catch (error: any) {
    console.error(`✗ Error removing node: ${error.message}\n`);
    console.log('Alternative options:');
    console.log('  1. Use exclude mode: npm start -- exclude');
    console.log('  2. If the device is nearby, put it in exclusion mode');
    console.log('  3. The node may clear automatically during network operations\n');
  }
}

/**
 * Replace a failed node (forces removal even if responding)
 */
export async function replaceFailedNode(driver: Driver, nodeId: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found in the network`);
  }

  console.log(`\n🔄 Replacing failed Node ${nodeId}...\n`);
  console.log('This will force-remove the node and prepare the slot for a new device.\n');

  try {
    const result = await driver.controller.replaceFailedNode(nodeId);
    console.log(`✓ Node ${nodeId} replacement started!`);
    console.log('The node slot is now available for a new device.\n');
    console.log('You can now pair a new device with: npm start -- pair\n');
  } catch (error: any) {
    console.error(`✗ Error replacing node: ${error.message}\n`);
  }
}
