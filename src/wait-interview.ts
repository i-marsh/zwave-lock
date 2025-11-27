import { Driver } from 'zwave-js';

/**
 * Wait for a node to complete its interview
 */
export async function waitForInterview(driver: Driver, nodeId: number, timeoutSeconds: number = 300): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  console.log(`\n⏳ Waiting for Node ${nodeId} to complete interview...`);
  console.log(`   Current stage: ${node.interviewStage}`);
  console.log(`   Ready: ${node.ready ? 'Yes' : 'No'}`);
  console.log(`\n   This may take several minutes for battery devices.`);
  console.log(`   The device must wake up periodically to complete the interview.`);
  console.log(`   You can speed this up by pressing a button on the device.\n`);

  const startTime = Date.now();
  const timeoutMs = timeoutSeconds * 1000;

  return new Promise((resolve, reject) => {
    // Check if already ready
    if (node.ready) {
      console.log('✓ Node is already ready!\n');
      resolve();
      return;
    }

    // Set up timeout
    const timeout = setTimeout(() => {
      console.log(`\n⏱️  Timeout reached after ${timeoutSeconds} seconds.`);
      console.log(`   Interview stage: ${node.interviewStage}`);
      console.log(`   Ready: ${node.ready ? 'Yes' : 'No'}`);
      console.log(`\n   The node may still complete later. Try again or wake the device.\n`);
      resolve(); // Don't reject, just resolve
    }, timeoutMs);

    // Listen for interview completion
    const onReady = () => {
      clearTimeout(timeout);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✓ Node ${nodeId} interview complete! (took ${elapsed}s)`);
      console.log(`   Stage: ${node.interviewStage}`);
      console.log(`   Secure: ${node.isSecure ? 'Yes' : 'No'}`);
      console.log(`   Command classes discovered: ${Object.keys(node.commandClasses).length}\n`);
      resolve();
    };

    // Listen for interview stage changes
    const onInterview = () => {
      console.log(`   Progress: Stage ${node.interviewStage}...`);
    };

    node.once('ready', onReady);
    node.on('interview stage completed', onInterview);

    // Cleanup on timeout
    setTimeout(() => {
      node.off('ready', onReady);
      node.off('interview stage completed', onInterview);
    }, timeoutMs);
  });
}
