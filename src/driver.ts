import { Driver } from 'zwave-js';
import { Config, getSecurityKeysAsBuffers } from './config';

let driverInstance: Driver | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isReconnecting = false;

const DRIVER_READY_TIMEOUT = 60000; // 60 seconds
const RECONNECT_DELAY = 5000; // 5 seconds

/**
 * Initialize and start the Z-Wave driver
 */
export async function initializeDriver(config: Config, retryOnFailure = true): Promise<Driver> {
  if (!config.serialPort) {
    throw new Error(
      'Serial port not configured. Use --port flag or set it in config.json.\n' +
      'Find your dongle with: ls /dev/cu.*'
    );
  }

  console.log(`Connecting to Z-Wave controller on ${config.serialPort}...`);

  const securityKeys = getSecurityKeysAsBuffers(config);

  const driver = new Driver(config.serialPort, {
    securityKeys,
    logConfig: {
      enabled: false, // Set to true for debugging
      level: 'info',
    },
    timeouts: {
      // Increase report timeout for slow-responding locks like Schlage
      // See: https://github.com/home-assistant/core/issues/87314#issuecomment-1421730246
      report: 10000, // 10 seconds (default is 1000ms)
    },
  });

  // Error handling with reconnect
  driver.on('error', async (error) => {
    console.error('Driver error:', error);
    
    // Check if it's a fatal serial port error
    if (error.message?.includes('serial port') || error.message?.includes('ENOENT')) {
      console.warn('⚠️  Serial port error detected, will attempt reconnect...');
      if (retryOnFailure && !isReconnecting) {
        scheduleReconnect(config);
      }
    }
  });

  driver.on('driver ready', () => {
    console.log('✓ Z-Wave driver ready');
    // Clear any pending reconnect on successful ready
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    isReconnecting = false;
  });
  
  // Handle driver disconnection
  driver.on('all nodes ready', () => {
    console.log('✓ All nodes ready');
  });

  try {
    await driver.start();
    console.log('✓ Connected to Z-Wave network');
    
    // Wait for driver to be ready with timeout
    if (!driver.ready) {
      console.log('Waiting for driver to be ready...');
      await Promise.race([
        new Promise<void>((resolve) => {
          driver.once('driver ready', () => resolve());
        }),
        new Promise<void>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Driver ready timeout after ${DRIVER_READY_TIMEOUT}ms`));
          }, DRIVER_READY_TIMEOUT);
        })
      ]);
    }
    
    console.log('✓ Driver ready');
    driverInstance = driver;
    isReconnecting = false;
    return driver;
  } catch (error) {
    console.error('Failed to start Z-Wave driver:', error);
    
    // Attempt reconnect on timeout or serial errors
    if (retryOnFailure && !isReconnecting) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('timeout') || errorMsg.includes('serial port') || errorMsg.includes('ENOENT')) {
        console.warn('⚠️  Will attempt reconnect in', RECONNECT_DELAY / 1000, 'seconds...');
        scheduleReconnect(config);
      }
    }
    
    throw error;
  }
}

/**
 * Get the current driver instance
 */
export function getDriver(): Driver {
  if (!driverInstance) {
    throw new Error('Driver not initialized. Call initializeDriver() first.');
  }
  return driverInstance;
}

/**
 * Schedule a reconnect attempt
 */
function scheduleReconnect(config: Config): void {
  if (reconnectTimeout) {
    return; // Already scheduled
  }
  
  isReconnecting = true;
  reconnectTimeout = setTimeout(async () => {
    reconnectTimeout = null;
    console.log('🔄 Attempting to reconnect to Z-Wave controller...');
    
    try {
      // Clean up old driver if exists
      if (driverInstance) {
        try {
          await driverInstance.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
        driverInstance = null;
      }
      
      // Try to reinitialize
      await initializeDriver(config, true);
      console.log('✓ Reconnected successfully');
    } catch (error) {
      console.error('❌ Reconnect failed:', error instanceof Error ? error.message : error);
      // Will retry again via error handler
    }
  }, RECONNECT_DELAY);
}

/**
 * Shutdown the driver gracefully
 */
export async function shutdownDriver(): Promise<void> {
  // Cancel any pending reconnects
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  if (driverInstance) {
    console.log('Shutting down Z-Wave driver...');
    try {
      await driverInstance.destroy();
      driverInstance = null;
      console.log('✓ Driver shutdown complete');
    } catch (error) {
      console.error('Error during driver shutdown:', error);
    }
  }
  
  isReconnecting = false;
}

/**
 * Execute a function with driver lifecycle management
 */
export async function withDriver<T>(
  config: Config,
  fn: (driver: Driver) => Promise<T>
): Promise<T> {
  const driver = await initializeDriver(config);
  try {
    return await fn(driver);
  } finally {
    await shutdownDriver();
  }
}
