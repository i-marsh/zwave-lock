import { Driver, InclusionStrategy } from 'zwave-js';

/**
 * Pair device with S0 legacy security (for older locks like BE469)
 */
export async function pairWithS0(driver: Driver): Promise<void> {
  console.log('🔐 Starting S0 Legacy secure pairing...');
  console.log('This is for older Schlage locks (BE469 firmware < 3.0)');
  console.log('');
  console.log('IMPORTANT: To complete secure S0 pairing:');
  console.log('1. Press the Schlage button');
  console.log('2. Enter Programming Code (default: 0-Schlage-0)');
  console.log('3. Press 0, then the Lock icon');
  console.log('4. Enter a new 4-8 digit User Code');
  console.log('5. Press Lock icon to confirm');
  console.log('\nWithout programming a user code, the lock will not pair securely.\n');

  try {
    const result = await driver.controller.beginInclusion({
      strategy: InclusionStrategy.Security_S0,
    });

    if (result) {
      console.log('\n✓ Device paired with S0 Legacy security!');
      console.log('   This provides encrypted communication for your lock.\n');
      
      // Find the newly added node
      const nodes = Array.from(driver.controller.nodes.values());
      const newNode = nodes.find(n => !n.ready && n.id !== driver.controller.ownNodeId);
      
      if (newNode) {
        console.log(`   Node ${newNode.id} detected. Keeping device awake for interview...\n`);
        
        // Keep the device awake to complete interview
        try {
          newNode.keepAwake = true;
          console.log('   ⏰ Keep-awake mode enabled.');
          console.log('   Press the lock button periodically to keep it awake.');
          console.log('   The interview will complete automatically.\n');
          
          console.log('   Waiting for interview to complete (up to 60 seconds)...\n');
          
          // Wait for interview with timeout
          const interviewComplete = await Promise.race([
            new Promise<boolean>((resolve) => {
              if (newNode.ready) {
                resolve(true);
              } else {
                newNode.once('ready', () => resolve(true));
              }
            }),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 60000))
          ]);
          
          if (interviewComplete) {
            console.log('   ✓ Interview complete!');
            console.log(`   Secure: ${newNode.isSecure ? 'Yes' : 'No'}`);
            console.log(`   Command classes: ${Object.keys(newNode.commandClasses).length}\n`);
          } else {
            console.log('   ⏱️  Interview not complete yet (device may be sleeping).');
            console.log('   Run: npm start -- wait-interview ' + newNode.id + '\n');
          }
          
          // Disable keep awake
          newNode.keepAwake = false;
          console.log('   Keep-awake mode disabled.\n');
          
        } catch (error: any) {
          console.log('   Note: Could not enable keep-awake:', error.message);
          console.log('   The device will complete interview when it wakes naturally.\n');
        }
      }
      
      console.log('   Run diagnostics to verify: npm start -- diagnostics\n');
    } else {
      console.log('\n✗ S0 pairing failed.\n');
    }
  } catch (error: any) {
    console.error('\n❌ Pairing error:', error.message, '\n');
  }
}
