#!/usr/bin/env node

/**
 * Demo script showing event listening capabilities
 * 
 * Usage:
 *   npm run build && node dist/demo-listen.js
 * 
 * This will:
 * 1. Start listening for events from your lock
 * 2. Lock the door
 * 3. Wait to see the event
 * 4. Unlock the door
 * 5. Wait to see the event
 */

import { loadConfig } from './config.js';
import { initializeDriver, shutdownDriver } from './driver.js';
import { listenForEvents } from './listen.js';
import { lockDoor, unlockDoor } from './commands.js';

async function demo() {
  const config = loadConfig();
  const driver = await initializeDriver(config);
  
  // Start listening
  console.log('Starting event listener...\n');
  listenForEvents(driver, 8);
  
  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Lock the door
  console.log('\n>>> Locking door...\n');
  await lockDoor(driver, 8);
  
  // Wait 5 seconds to see the event
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Unlock the door
  console.log('\n>>> Unlocking door...\n');
  await unlockDoor(driver, 8);
  
  // Wait 5 seconds to see the event
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n>>> Demo complete!\n');
  await shutdownDriver();
  process.exit(0);
}

demo().catch(console.error);
