import { Driver, ZWaveNode, Endpoint, InclusionStrategy, DoorLockMode } from 'zwave-js';
import { CommandClasses } from '@zwave-js/core';

/**
 * Start exclusion mode to remove a device from the network
 */
export async function excludeDevice(driver: Driver): Promise<void> {
  console.log('\n🔓 Starting exclusion mode...');
  console.log('Press the button on your Schlage lock to exclude it from the network.');
  console.log('(This works even if the lock was paired to a different controller)\n');

  const result = await driver.controller.beginExclusion();
  
  if (result) {
    console.log('✓ Device excluded successfully!');
    console.log('You can now pair the device to this network.\n');
  } else {
    console.log('✗ Exclusion failed or was cancelled.\n');
  }
}

/**
 * Start inclusion mode to add a device to the network
 */
export async function includeDevice(driver: Driver): Promise<void> {
  console.log('\n🔐 Starting secure inclusion mode...');
  console.log('');
  console.log('For Schlage locks with S0 security:');
  console.log('1. Press the Schlage button');
  console.log('2. Enter Programming Code (default: 0-Schlage-0)');
  console.log('3. Press 0, then the Lock icon');
  console.log('4. Enter a new 4-8 digit User Code');
  console.log('5. Press Lock icon to confirm');
  console.log('\n   NOTE: Trying S2 first, will use device-supported security.\n');

  try {
    const result = await driver.controller.beginInclusion({
      strategy: InclusionStrategy.Security_S2,
      userCallbacks: {
        grantSecurityClasses: async (requested) => {
          console.log('\n🔒 Lock requesting S2 security classes...');
          return {
            clientSideAuth: false,
            securityClasses: requested.securityClasses,
          };
        },
        validateDSKAndEnterPIN: async (dsk) => {
          console.log(`\n🔑 DSK: ${dsk}`);
          return dsk;
        },
        abort: async () => {
          console.log('\n❌ S2 pairing aborted.');
        },
      },
    });

    if (result) {
      console.log(`\n✓ Device paired successfully!\n`);
      
      // Find the newly added node
      const nodes = Array.from(driver.controller.nodes.values());
      const newNode = nodes.find(n => !n.ready && n.id !== driver.controller.ownNodeId);
      
      if (newNode) {
        console.log(`   Node ${newNode.id} detected. Attempting to keep awake for interview...\n`);
        
        try {
          newNode.keepAwake = true;
          console.log('   ⏰ Keep-awake enabled. Press lock button to keep it awake.');
          console.log('   Waiting up to 60 seconds for interview...\n');
          
          const interviewComplete = await Promise.race([
            new Promise<boolean>((resolve) => {
              if (newNode.ready) resolve(true);
              else newNode.once('ready', () => resolve(true));
            }),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 60000))
          ]);
          
          if (interviewComplete) {
            console.log('   ✓ Interview complete!');
            console.log(`   Secure: ${newNode.isSecure ? 'Yes' : 'No'}`);
            console.log(`   Command classes: ${Object.keys(newNode.commandClasses).length}\n`);
          } else {
            console.log('   ⏱️  Interview incomplete. Device may need more wake cycles.');
          }
          
          newNode.keepAwake = false;
        } catch (error: any) {
          console.log('   Note:', error.message);
        }
      }
      
      console.log('   Run diagnostics to check: npm start -- diagnostics\n');
    }
    
  } catch (error: any) {
    console.error('\n❌ Pairing error:', error.message, '\n');
  }
}

/**
 * List all nodes in the network
 */
export async function listNodes(driver: Driver): Promise<void> {
  const nodes = driver.controller.nodes;
  
  console.log('\n📋 Z-Wave Network Nodes:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (nodes.size === 0) {
    console.log('No nodes found. Pair your lock with: zwave-lock pair\n');
    return;
  }

  for (const [nodeId, node] of nodes) {
    const name = node.name || 'Unknown Device';
    const manufacturer = node.deviceConfig?.manufacturer || 'Unknown';
    const description = node.deviceConfig?.description || 'Unknown';
    const isListening = node.isListening ? 'Always On' : 'Battery';
    const status = node.status !== 0 ? '✓ Alive' : '✗ Dead';

    console.log(`Node ${nodeId}: ${name}`);
    console.log(`  Manufacturer: ${manufacturer}`);
    console.log(`  Description:  ${description}`);
    console.log(`  Power:        ${isListening}`);
    console.log(`  Status:       ${status}`);
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Lock the door
 */
export async function lockDoor(driver: Driver, nodeId: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  console.log(`🔒 Locking door (Node ${nodeId})...`);

  const doorLockCC = node.commandClasses['Door Lock'];
  
  if (!doorLockCC) {
    throw new Error(`Node ${nodeId} does not support Door Lock command class`);
  }

  await doorLockCC.set(DoorLockMode.Secured);
  
  console.log('✓ Lock command sent successfully\n');
}

/**
 * Unlock the door
 */
export async function unlockDoor(driver: Driver, nodeId: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  console.log(`🔓 Unlocking door (Node ${nodeId})...`);

  const doorLockCC = node.commandClasses['Door Lock'];
  
  if (!doorLockCC) {
    throw new Error(`Node ${nodeId} does not support Door Lock command class`);
  }

  await doorLockCC.set(DoorLockMode.Unsecured);
  
  console.log('✓ Unlock command sent successfully\n');
}

/**
 * Get status of a lock
 */
export async function getStatus(driver: Driver, nodeId: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  console.log(`\n📊 Status for Node ${nodeId}:\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Lock status
  const doorLockCC = node.commandClasses['Door Lock'];
  if (doorLockCC) {
    const lockState = await doorLockCC.get();
    console.log(`Lock State:    ${lockState?.currentMode || 'Unknown'}`);
  }

  // Battery level
  const batteryCC = node.commandClasses['Battery'];
  if (batteryCC) {
    const battery = await batteryCC.get();
    console.log(`Battery:       ${battery?.level}%`);
  }

  // Device info
  console.log(`Device:        ${node.deviceConfig?.description || 'Unknown'}`);
  console.log(`Manufacturer:  ${node.deviceConfig?.manufacturer || 'Unknown'}`);
  console.log(`Status:        ${node.status !== 0 ? 'Online' : 'Offline'}`);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Get all user codes from a lock
 */
export async function getUserCodes(driver: Driver, nodeId: number): Promise<any[]> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const userCodeCC = node.commandClasses['User Code'];
  
  if (!userCodeCC) {
    throw new Error(`Node ${nodeId} does not support User Code command class`);
  }

  console.log(`\n🔑 Retrieving user codes for Node ${nodeId}...`);
  
  const codes: any[] = [];
  
  // Get number of supported user codes
  const usersCount = await userCodeCC.getUsersCount();
  
  if (!usersCount) {
    console.log(`   Using default slot count: 30`);
  } else {
    console.log(`   Lock supports ${usersCount} user codes`);
  }
  
  const maxSlots = usersCount || 30;
  
  console.log(`   Querying ${maxSlots} slots...`);
  
  // Query each slot from the lock for real-time status
  for (let slot = 1; slot <= maxSlots; slot++) {
    try {
      console.log(`   Querying slot ${slot}...`);
      const codeData = await userCodeCC.get(slot);
      console.log(`   Slot ${slot} response:`, JSON.stringify(codeData));
      
      if (codeData && codeData.userIdStatus !== 0) { // 0 = Available/Empty
        console.log(`   Slot ${slot}: Occupied (status ${codeData.userIdStatus})`);
        codes.push({
          slot: slot,
          status: codeData.userIdStatus, // 1 = Occupied, 2 = Reserved
        });
      } else {
        console.log(`   Slot ${slot}: Available`);
      }
    } catch (error: any) {
      console.log(`   Slot ${slot}: Error - ${error.message || error}`);
    }
  }

  console.log(`   Found ${codes.length} occupied slots\n`);
  return codes;
}

/**
 * Set a user code
 */
export async function setUserCode(driver: Driver, nodeId: number, slot: number, code: string): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const userCodeCC = node.commandClasses['User Code'];
  
  if (!userCodeCC) {
    throw new Error(`Node ${nodeId} does not support User Code command class`);
  }

  console.log(`🔑 Setting user code for slot ${slot}...`);
  console.log(`   Node ID: ${nodeId}`);
  console.log(`   Code length: ${code.length} digits`);
  console.log(`   Code value: ${code}`);
  
  // Check node security
  console.log(`\n   Security Information:`);
  console.log(`   - Node security classes:`, node.getHighestSecurityClass());
  console.log(`   - Is secure:`, node.isSecure);
  console.log(`   - Command classes (User Code):`, node.commandClasses['User Code'].constructor.name);
  
  // Check lock capabilities first
  console.log(`\n   Step 1: Checking lock capabilities...`);
  try {
    const capabilities = await userCodeCC.getCapabilities();
    console.log(`   Lock capabilities:`, JSON.stringify(capabilities, null, 2));
    
    if (capabilities) {
      console.log(`   - Supports admin code: ${capabilities.supportsAdminCode}`);
      console.log(`   - Supports checksum: ${capabilities.supportsUserCodeChecksum}`);
      console.log(`   - Supported statuses: ${capabilities.supportedUserIDStatuses}`);
      console.log(`   - Supports multiple set: ${capabilities.supportsMultipleUserCodeSet}`);
    }
  } catch (error: any) {
    console.warn(`   ⚠️  Could not get capabilities (lock uses User Code CC v1):`, error.message);
  }
  
  // Check current state of the slot before modifying
  console.log(`\n   Step 2: Checking current state of slot ${slot}...`);
  try {
    const currentState = await userCodeCC.get(slot);
    console.log(`   Current slot state:`, JSON.stringify(currentState));
    console.log(`   - Current status: ${currentState?.userIdStatus} (${currentState?.userIdStatus === 0 ? 'Available' : currentState?.userIdStatus === 1 ? 'Occupied' : 'Other'})`);
    console.log(`   - Has code: ${currentState?.userCode ? 'Yes' : 'No'}`);
  } catch (error: any) {
    console.warn(`   ⚠️  Could not read current state:`, error.message);
  }
  
  // Some locks (like Schlage) require clearing the slot before setting a new code
  // UPDATE: Trying WITHOUT clear - some locks reject clear+set workflow
  console.log(`\n   Step 3: SKIPPING clear (will set directly)...`);
  console.log(`   Reason: Some Schlage locks reject the clear+set workflow`);
  /*
  try {
    const clearResult = await userCodeCC.clear(slot);
    console.log(`   ✓ Clear command sent`);
    console.log(`   📊 Clear supervision result:`, JSON.stringify(clearResult));
    
    if (clearResult && typeof clearResult === 'object') {
      console.log(`   - Status: ${(clearResult as any).status}`);
      console.log(`   - Duration: ${(clearResult as any).duration}`);
    }
  } catch (error: any) {
    console.warn(`   ⚠️  Clear failed:`, error.message);
    console.warn(`   Stack:`, error.stack);
  }
  
  // Wait for the clear to complete
  console.log(`\n   Step 4: Waiting 1.5 seconds for clear to complete...`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Verify the slot was cleared
  console.log(`\n   Step 5: Verifying slot was cleared...`);
  try {
    const afterClear = await userCodeCC.get(slot);
    console.log(`   After clear state:`, JSON.stringify(afterClear));
    console.log(`   - Status: ${afterClear?.userIdStatus} (should be 0 for Available)`);
  } catch (error: any) {
    console.warn(`   ⚠️  Could not verify clear:`, error.message);
  }
  */
  
  console.log(`\n   Step 4: Setting code in slot ${slot} DIRECTLY...`);
  console.log(`   Command parameters:`);
  console.log(`     - userId (slot): ${slot}`);
  console.log(`     - userIdStatus: 1 (Occupied)`);
  console.log(`     - userCode: "${code}" (${code.length} digits)`);
  console.log(`     - userCode type: ${typeof code}`);
  console.log(`     - Security: S0 Legacy (class ${node.getHighestSecurityClass()})`);
  
  console.log(`\n   Sending plain string code...`);
  console.log(`     - Code: "${code}"`);
  console.log(`     - Length: ${code.length} chars`);
  console.log(`     - As hex: ${Buffer.from(code).toString('hex')}`);
  
  let supervisionResult;
  try {
    const startTime = Date.now();
    supervisionResult = await userCodeCC.set(slot, 1, code);
    const elapsed = Date.now() - startTime;
    
    console.log(`   ✓ Set command completed in ${elapsed}ms`);
    console.log(`   📊 Supervision result (full):`, JSON.stringify(supervisionResult, null, 2));
    console.log(`   📊 Supervision result type:`, typeof supervisionResult);
    
    if (supervisionResult === undefined) {
      console.log(`   ⚠️  Supervision result is undefined - lock may not support supervision`);
    } else if (supervisionResult && typeof supervisionResult === 'object') {
      const result = supervisionResult as any;
      console.log(`   📊 Supervision details:`);
      console.log(`     - status: ${result.status} (0x${result.status?.toString(16)})`);
      console.log(`     - duration: ${result.duration}`);
      console.log(`     - message: ${result.message || 'none'}`);
      
      // Supervision status codes:
      // 0x00 = No Support
      // 0x01 = Working
      // 0x02 = Fail
      // 0xFF = Success
      if (result.status === 0x02) {
        console.error(`   ❌ Lock explicitly FAILED the set command!`);
      } else if (result.status === 0xFF) {
        console.log(`   ✓ Lock reports SUCCESS`);
      } else if (result.status === 0x00) {
        console.warn(`   ⚠️  Lock does not support supervision`);
      } else if (result.status === 0x01) {
        console.log(`   ⏳ Lock is still working on the command`);
      } else {
        console.warn(`   ⚠️  Unknown supervision status: ${result.status}`);
      }
    }
  } catch (error: any) {
    console.error(`   ❌ Set command threw error:`, error.message);
    console.error(`   Error type:`, error.constructor.name);
    console.error(`   Error code:`, error.code);
    console.error(`   Stack:`, error.stack);
    throw error;
  }
  
  // Wait for the lock to process the new code
  console.log(`\n   Step 5: Waiting 5 seconds for lock to process and write to EEPROM...`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Query the slot to verify
  console.log(`\n   Step 6: Verifying slot ${slot} was programmed...`);
  let verification;
  try {
    verification = await userCodeCC.get(slot);
    console.log(`   📊 Verification result (full):`, JSON.stringify(verification, null, 2));
    console.log(`   📊 Final status: ${verification?.userIdStatus}`);
    console.log(`   📊 Has code: ${verification?.userCode ? 'Yes (length: ' + verification.userCode.length + ')' : 'No'}`);
  } catch (error: any) {
    console.error(`   ❌ Verification query failed:`, error.message);
    throw error;
  }
  
  if (verification?.userIdStatus !== 1) {
    console.error(`\n   ❌ VERIFICATION FAILED`);
    console.error(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.error(`   Expected status: 1 (Occupied)`);
    console.error(`   Actual status:   ${verification?.userIdStatus} (${verification?.userIdStatus === 0 ? 'Available' : verification?.userIdStatus === 254 ? 'Not Available' : 'Unknown'})`);
    console.error(`   `);
    console.error(`   Status codes:`);
    console.error(`     0   = Available (empty slot)`);
    console.error(`     1   = Occupied (code is set)`);
    console.error(`     2   = Reserved by administrator`);
    console.error(`     254 = Status not available (error)`);
    console.error(`   `);
    console.error(`   Possible reasons for rejection:`);
    console.error(`     • Code already exists in another slot (duplicate)`);
    console.error(`     • Code is too simple (e.g., 1111, 1234)`);
    console.error(`     • Code violates lock's internal rules`);
    console.error(`     • EEPROM full or corrupted`);
    console.error(`   `);
    console.error(`   Note: User codes are write-only for security.`);
    console.error(`   Cannot scan other slots to check for duplicates.`);
    console.error(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    throw new Error(`Failed to set user code in slot ${slot} - lock rejected the code (status remains ${verification?.userIdStatus}). Code may be duplicate or invalid.`);
  }
  
  console.log(`\n✓ SUCCESS! User code set and verified for slot ${slot}`);
  console.log(`  Final state: Status ${verification?.userIdStatus} (Occupied)\n`);
}

/**
 * Delete a user code
 */
export async function deleteUserCode(driver: Driver, nodeId: number, slot: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const userCodeCC = node.commandClasses['User Code'];
  
  if (!userCodeCC) {
    throw new Error(`Node ${nodeId} does not support User Code command class`);
  }

  console.log(`🗑️  Deleting user code from slot ${slot}...`);
  
  // Clear the user code by setting it to available (0x00)
  await userCodeCC.clear(slot);
  
  console.log(`✓ User code deleted from slot ${slot}\n`);
}

/**
 * Get the configured user code length
 */
export async function getUserCodeLength(driver: Driver, nodeId: number): Promise<number | undefined> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  console.log(`\n🔍 Reading user code length configuration...`);

  try {
    const configCC = node.commandClasses['Configuration'];
    
    if (!configCC) {
      console.log(`⚠️  Node ${nodeId} does not support Configuration CC, cannot read code length\n`);
      return undefined;
    }
    
    // Parameter 16 = User Code Length
    const value = await configCC.get(16);
    
    if (value !== undefined) {
      console.log(`✓ User code length is set to: ${value} digits\n`);
      return value as number;
    } else {
      console.log(`⚠️  Unable to read user code length\n`);
      return undefined;
    }
  } catch (error: any) {
    console.log(`⚠️  Unable to read user code length: ${error.message}\n`);
    return undefined;
  }
}

/**
 * Set the user code length (WARNING: This deletes all existing codes!)
 */
export async function setUserCodeLength(driver: Driver, nodeId: number, length: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const configCC = node.commandClasses['Configuration'];
  
  if (!configCC) {
    throw new Error(`Node ${nodeId} does not support Configuration command class`);
  }

  // Validate length (4-8 digits for BE469)
  if (length < 4 || length > 8) {
    throw new Error('Code length must be between 4 and 8 digits');
  }

  console.log(`\n⚠️  WARNING: Setting user code length to ${length} digits`);
  console.log(`⚠️  THIS WILL DELETE ALL EXISTING USER CODES!\n`);
  
  // Parameter 16 = User Code Length
  await configCC.set({ parameter: 16, value: length });
  
  console.log(`✓ User code length set to ${length} digits`);
  console.log(`  All user codes have been deleted.\n`);
}

/**
 * Re-interview a node to refresh its capabilities and values
 * This can fix issues with locks that need increased timeouts
 */
export async function reinterviewNode(driver: Driver, nodeId: number): Promise<void> {
  const node = driver.controller.nodes.get(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  console.log(`\n🔄 Re-interviewing node ${nodeId}...`);
  console.log(`   Current status: ${node.status}`);
  console.log(`   Ready: ${node.ready}`);
  
  if (node.canSleep) {
    console.log(`\n⚠️  This is a battery-powered device!`);
    console.log(`   Press the Schlage button NOW to wake it up...`);
    console.log(`   Waiting 10 seconds for device to wake...\n`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  try {
    console.log(`   Starting refreshInfo()...`);
    await node.refreshInfo();
    console.log(`✓ Node ${nodeId} re-interview complete`);
    console.log(`   New status: ${node.status}`);
    console.log(`   Ready: ${node.ready}`);
  } catch (error: any) {
    console.error(`❌ Re-interview failed:`, error.message);
    throw error;
  }
}
