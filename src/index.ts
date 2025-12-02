#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig, updateSerialPort } from './config.js';
import { withDriver } from './driver.js';
import {
  excludeDevice,
  includeDevice,
  listNodes,
  lockDoor,
  unlockDoor,
  getStatus,
  getUserCodes,
  setUserCode,
  deleteUserCode,
  getUserCodeLength,
  setUserCodeLength,
} from './commands.js';
import { inspectNode, scanInfo } from './inspect.js';
import { removeFailedNode, replaceFailedNode } from './remove.js';
import { runDiagnostics, testLock } from './diagnostics.js';
import { pairWithS0 } from './pair-s0.js';
import { InteractiveCLI } from './interactive.js';
import { waitForInterview } from './wait-interview.js';
import { reinterviewNode } from './commands.js';
import { listenForEvents } from './listen.js';

const program = new Command();

program
  .name('zwave-lock')
  .description('CLI tool for controlling Z-Wave door locks (compatible with Schlage, Kwikset, Yale, and more)')
  .version('1.0.0')
  .option('-p, --port <port>', 'Serial port for Z-Wave dongle (e.g., /dev/cu.usbmodem14101)');

// Interactive mode (default if no command specified)
program
  .command('interactive', { isDefault: true })
  .alias('i')
  .description('Start interactive mode with persistent Z-Wave connection')
  .action(async () => {
    const cli = new InteractiveCLI();
    await cli.start();
  });

// Exclude command
program
  .command('exclude')
  .alias('reset')
  .description('Remove a device from the Z-Wave network (works for any previously paired lock)')
  .action(async () => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await excludeDevice(driver);
    });
  });

// Pair command
program
  .command('pair')
  .alias('include')
  .description('Add a device to the Z-Wave network with S2 security')
  .action(async () => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await includeDevice(driver);
    });
  });

// Pair with S0 command (for older locks)
program
  .command('pair-s0')
  .description('Add a device with S0 Legacy security (for older Schlage BE469 locks)')
  .action(async () => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await pairWithS0(driver);
    });
  });

// List command
program
  .command('list')
  .description('List all paired devices in the Z-Wave network')
  .action(async () => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await listNodes(driver);
    });
  });

// Lock command
program
  .command('lock')
  .description('Lock the door')
  .argument('<nodeId>', 'Node ID of the lock', parseInt)
  .action(async (nodeId: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await lockDoor(driver, nodeId);
    });
  });

// Unlock command
program
  .command('unlock')
  .description('Unlock the door')
  .argument('<nodeId>', 'Node ID of the lock', parseInt)
  .action(async (nodeId: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await unlockDoor(driver, nodeId);
    });
  });

// Status command
program
  .command('status')
  .description('Get status of a lock (battery, lock state, etc.)')
  .argument('<nodeId>', 'Node ID of the lock', parseInt)
  .action(async (nodeId: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await getStatus(driver, nodeId);
    });
  });

// Config command
program
  .command('config')
  .description('Configure serial port and save to config.json')
  .option('--set-port <port>', 'Set the serial port path')
  .action((options) => {
    if (options.setPort) {
      updateSerialPort(options.setPort);
    } else {
      const config = loadConfig();
      console.log('\nCurrent configuration:');
      console.log('Serial Port: ' + (config.serialPort || 'Not configured'));
      console.log('Security Keys: ' + (config.securityKeys ? 'Configured' : 'Not configured') + '\n');
    }
  });

// Inspect command
program
  .command('inspect')
  .description('Get detailed information about a specific node')
  .argument('<nodeId>', 'Node ID to inspect', parseInt)
  .action(async (nodeId: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await inspectNode(driver, nodeId);
    });
  });

// Scan command
program
  .command('scan')
  .description('Show network information and paired devices')
  .action(async () => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await scanInfo(driver);
    });
  });

// Remove failed node command
program
  .command('remove-node')
  .description('Remove a failed or ghost node from the network')
  .argument('<nodeId>', 'Node ID to remove', parseInt)
  .action(async (nodeId: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await removeFailedNode(driver, nodeId);
    });
  });

// Replace failed node command
program
  .command('replace-node')
  .description('Force-replace a failed node (even if responding)')
  .argument('<nodeId>', 'Node ID to replace', parseInt)
  .action(async (nodeId: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await replaceFailedNode(driver, nodeId);
    });
  });

// Diagnostics command
program
  .command('diagnostics')
  .description('Run comprehensive network and security diagnostics')
  .action(async () => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await runDiagnostics(driver);
    });
  });

// Test lock command
program
  .command('test')
  .description('Test lock functionality and communication')
  .argument('<nodeId>', 'Node ID of the lock to test', parseInt)
  .action(async (nodeId: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await testLock(driver, nodeId);
    });
  });

// Listen for events command
program
  .command('listen')
  .description('Listen for real-time events from Z-Wave devices')
  .argument('[nodeId]', 'Optional: Node ID to listen to (omit for all nodes)', parseInt)
  .action(async (nodeId?: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      listenForEvents(driver, nodeId);
      
      // Keep the process running
      await new Promise(() => {});
    });
  });

// Wait for interview command
program
  .command('wait-interview')
  .description('Wait for a node to complete its interview (battery devices)')
  .argument('<nodeId>', 'Node ID to wait for', parseInt)
  .option('-t, --timeout <seconds>', 'Timeout in seconds', '300')
  .action(async (nodeId: number, options) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await waitForInterview(driver, nodeId, parseInt(options.timeout));
    });
  });

// Re-interview node command
program
  .command('reinterview')
  .description('Re-interview a node to refresh its capabilities (fixes timeout issues)')
  .argument('<nodeId>', 'Node ID to re-interview', parseInt)
  .action(async (nodeId: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await reinterviewNode(driver, nodeId);
    });
  });

// List user codes command
program
  .command('list-codes')
  .description('List all user codes on a lock')
  .argument('<nodeId>', 'Node ID of the lock', parseInt)
  .action(async (nodeId: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      const codes = await getUserCodes(driver, nodeId);
      console.log(`\nUser codes (${codes.length} occupied slots):`);
      codes.forEach(code => {
        console.log(`  Slot ${code.slot}: ${code.status === 1 ? 'Occupied' : 'Reserved'}`);
      });
      console.log('');
    });
  });

// Set user code command
program
  .command('set-code')
  .description('Set a user code on a lock')
  .argument('<nodeId>', 'Node ID of the lock', parseInt)
  .argument('<slot>', 'User code slot (1-30)', parseInt)
  .argument('<code>', 'PIN code (4-8 digits)')
  .action(async (nodeId: number, slot: number, code: string) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await setUserCode(driver, nodeId, slot, code);
    });
  });

// Delete user code command
program
  .command('delete-code')
  .description('Delete a user code from a lock')
  .argument('<nodeId>', 'Node ID of the lock', parseInt)
  .argument('<slot>', 'User code slot to delete', parseInt)
  .action(async (nodeId: number, slot: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await deleteUserCode(driver, nodeId, slot);
    });
  });

// Get user code length command
program
  .command('get-code-length')
  .description('Get the configured user code length')
  .argument('<nodeId>', 'Node ID of the lock', parseInt)
  .action(async (nodeId: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await getUserCodeLength(driver, nodeId);
    });
  });

// Set user code length command
program
  .command('set-code-length')
  .description('Set user code length (WARNING: Deletes all codes!)')
  .argument('<nodeId>', 'Node ID of the lock', parseInt)
  .argument('<length>', 'Code length in digits (4-8)', parseInt)
  .action(async (nodeId: number, length: number) => {
    const config = loadConfig();
    if (program.opts().port) {
      config.serialPort = program.opts().port;
    }
    await withDriver(config, async (driver) => {
      await setUserCodeLength(driver, nodeId, length);
    });
  });

// Error handling
program.configureOutput({
  writeErr: (str) => process.stderr.write(str),
});

program.exitOverride();

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error: any) {
    if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
      // Help/version is normal, exit cleanly
      process.exit(0);
    }
    console.error('\n❌ Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

main();
