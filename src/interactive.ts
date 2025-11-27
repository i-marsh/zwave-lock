import * as readline from 'readline/promises';
import { Driver } from 'zwave-js';
import { loadConfig } from './config.js';
import { initializeDriver, shutdownDriver } from './driver.js';
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
import { waitForInterview } from './wait-interview.js';
import { listenForEvents } from './listen.js';

/**
 * Interactive CLI session with persistent Z-Wave connection
 */
export class InteractiveCLI {
  private driver: Driver | null = null;
  private rl: readline.Interface;
  private running = false;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'zwave> ',
    });
  }

  async start(): Promise<void> {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║       Z-Wave Lock Controller - Interactive CLI        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Load config and connect
    const config = loadConfig();
    
    if (!config.serialPort) {
      console.log('⚠️  Serial port not configured.');
      const port = await this.rl.question('Enter Z-Wave dongle port (e.g., /dev/cu.usbmodem21101): ');
      config.serialPort = port.trim();
    }

    try {
      this.driver = await initializeDriver(config);
      console.log('\n✓ Connected! Type "help" for available commands.\n');
      
      this.running = true;
      await this.commandLoop();
      
    } catch (error: any) {
      console.error('\n❌ Failed to connect:', error.message);
      console.log('Make sure your Z-Wave dongle is connected.\n');
      process.exit(1);
    }
  }

  private async commandLoop(): Promise<void> {
    this.rl.prompt();

    this.rl.on('line', async (line) => {
      const input = line.trim();
      
      if (!input) {
        this.rl.prompt();
        return;
      }

      const [cmd, ...args] = input.split(/\s+/);

      try {
        await this.handleCommand(cmd.toLowerCase(), args);
      } catch (error: any) {
        console.error('❌ Error:', error.message);
      }

      if (this.running) {
        this.rl.prompt();
      }
    });

    this.rl.on('close', async () => {
      await this.cleanup();
    });
  }

  private async handleCommand(cmd: string, args: string[]): Promise<void> {
    if (!this.driver) {
      console.log('❌ Not connected to Z-Wave network.');
      return;
    }

    switch (cmd) {
      case 'help':
      case '?':
        this.showHelp();
        break;

      case 'list':
      case 'ls':
        await listNodes(this.driver);
        break;

      case 'scan':
        await scanInfo(this.driver);
        break;

      case 'diagnostics':
      case 'diag':
        await runDiagnostics(this.driver);
        break;

      case 'listen':
        if (args.length > 0) {
          listenForEvents(this.driver, parseInt(args[0]));
        } else {
          listenForEvents(this.driver);
        }
        console.log('Listening... (commands disabled while listening)');
        break;

      case 'inspect':
        if (args.length < 1) {
          console.log('Usage: inspect <nodeId>');
          break;
        }
        await inspectNode(this.driver, parseInt(args[0]));
        break;

      case 'test':
        if (args.length < 1) {
          console.log('Usage: test <nodeId>');
          break;
        }
        await testLock(this.driver, parseInt(args[0]));
        break;

      case 'lock':
        if (args.length < 1) {
          console.log('Usage: lock <nodeId>');
          break;
        }
        await lockDoor(this.driver, parseInt(args[0]));
        break;

      case 'unlock':
        if (args.length < 1) {
          console.log('Usage: unlock <nodeId>');
          break;
        }
        await unlockDoor(this.driver, parseInt(args[0]));
        break;

      case 'status':
        if (args.length < 1) {
          console.log('Usage: status <nodeId>');
          break;
        }
        await getStatus(this.driver, parseInt(args[0]));
        break;

      case 'exclude':
      case 'unpair':
        await excludeDevice(this.driver);
        break;

      case 'pair':
      case 'include':
        await includeDevice(this.driver);
        break;

      case 'pair-s0':
        await pairWithS0(this.driver);
        break;

      case 'remove':
        if (args.length < 1) {
          console.log('Usage: remove <nodeId>');
          break;
        }
        await removeFailedNode(this.driver, parseInt(args[0]));
        break;

      case 'replace':
        if (args.length < 1) {
          console.log('Usage: replace <nodeId>');
          break;
        }
        await replaceFailedNode(this.driver, parseInt(args[0]));
        break;

      case 'wait':
      case 'wait-interview':
        if (args.length < 1) {
          console.log('Usage: wait <nodeId> [timeout-seconds]');
          break;
        }
        const timeout = args[1] ? parseInt(args[1]) : 300;
        await waitForInterview(this.driver, parseInt(args[0]), timeout);
        break;

      case 'list-codes':
      case 'codes':
        if (args.length < 1) {
          console.log('Usage: list-codes <nodeId>');
          break;
        }
        const codes = await getUserCodes(this.driver, parseInt(args[0]));
        console.log(`\nUser codes (${codes.length} occupied slots):`);
        codes.forEach(code => {
          console.log(`  Slot ${code.slot}: ${code.status === 1 ? 'Occupied' : 'Reserved'}`);
        });
        console.log('');
        break;

      case 'set-code':
        if (args.length < 3) {
          console.log('Usage: set-code <nodeId> <slot> <code>');
          console.log('Example: set-code 8 1 1234');
          break;
        }
        await setUserCode(this.driver, parseInt(args[0]), parseInt(args[1]), args[2]);
        break;

      case 'delete-code':
        if (args.length < 2) {
          console.log('Usage: delete-code <nodeId> <slot>');
          break;
        }
        await deleteUserCode(this.driver, parseInt(args[0]), parseInt(args[1]));
        break;

      case 'get-code-length':
        if (args.length < 1) {
          console.log('Usage: get-code-length <nodeId>');
          break;
        }
        await getUserCodeLength(this.driver, parseInt(args[0]));
        break;

      case 'set-code-length':
        if (args.length < 2) {
          console.log('Usage: set-code-length <nodeId> <length>');
          console.log('WARNING: This will delete all existing user codes!');
          break;
        }
        await setUserCodeLength(this.driver, parseInt(args[0]), parseInt(args[1]));
        break;

      case 'exit':
      case 'quit':
      case 'q':
        console.log('\nShutting down...');
        this.running = false;
        this.rl.close();
        break;

      case 'clear':
        console.clear();
        break;

      default:
        console.log(`Unknown command: ${cmd}`);
        console.log('Type "help" for available commands.');
        break;
    }
  }

  private showHelp(): void {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                Available Commands                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('DEVICE MANAGEMENT:');
    console.log('  list, ls              List all paired devices');
    console.log('  scan                  Show network info and devices');
    console.log('  inspect <nodeId>      Detailed info about a node');
    console.log('  diagnostics, diag     Run full network diagnostics');
    console.log('  test <nodeId>         Test lock communication');
    console.log('  listen [nodeId]       Listen for events (all nodes or specific node)\n');

    console.log('PAIRING:');
    console.log('  pair, include         Pair device with S2 security');
    console.log('  pair-s0               Pair with S0 (for older locks)');
    console.log('  exclude, unpair       Remove device from network\n');

    console.log('LOCK CONTROL:');
    console.log('  lock <nodeId>         Lock the door');
    console.log('  unlock <nodeId>       Unlock the door');
    console.log('  status <nodeId>       Check lock status & battery\n');

    console.log('NODE MANAGEMENT:');
    console.log('  remove <nodeId>       Remove failed/ghost node');
    console.log('  replace <nodeId>      Force-replace a node');
    console.log('  wait <nodeId> [secs]  Wait for interview to complete\n');

    console.log('USER CODE MANAGEMENT:');
    console.log('  list-codes <nodeId>         List all user codes');
    console.log('  set-code <nodeId> <slot> <code>  Set a user code');
    console.log('  delete-code <nodeId> <slot>      Delete a user code');
    console.log('  get-code-length <nodeId>         Get code length setting');
    console.log('  set-code-length <nodeId> <len>   Set code length (DELETES ALL!)\n');

    console.log('GENERAL:');
    console.log('  help, ?               Show this help');
    console.log('  clear                 Clear screen');
    console.log('  exit, quit, q         Exit interactive mode\n');
  }

  private async cleanup(): Promise<void> {
    if (this.driver) {
      await shutdownDriver();
    }
    console.log('\nGoodbye!\n');
    process.exit(0);
  }
}
