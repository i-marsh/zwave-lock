import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface SecurityKeys {
  S2_AccessControl: string;
  S2_Authenticated: string;
  S2_Unauthenticated: string;
  S0_Legacy: string;
}

export interface Config {
  serialPort?: string;
  securityKeys?: SecurityKeys;
}

const CONFIG_PATH = path.join(process.cwd(), 'config.json');

/**
 * Generate a cryptographically secure random 16-byte key
 */
function generateSecureKey(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate all required Z-Wave security keys
 */
function generateSecurityKeys(): SecurityKeys {
  return {
    S2_AccessControl: generateSecureKey(),
    S2_Authenticated: generateSecureKey(),
    S2_Unauthenticated: generateSecureKey(),
    S0_Legacy: generateSecureKey(),
  };
}

/**
 * Load configuration from config.json, create with defaults if missing
 */
export function loadConfig(): Config {
  let config: Config = {};
  let isNewConfig = false;

  // Try to load existing config
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      config = JSON.parse(data);
    } catch (error) {
      console.error('Error reading config.json, creating new configuration...');
      isNewConfig = true;
    }
  } else {
    isNewConfig = true;
  }

  // Generate security keys if missing
  if (!config.securityKeys) {
    console.log('\n⚠️  GENERATING NEW SECURITY KEYS ⚠️\n');
    config.securityKeys = generateSecurityKeys();
    saveConfig(config);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 Security keys have been generated and saved to config.json');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('CRITICAL: Back up these keys NOW to a password manager!\n');
    console.log('S2_AccessControl:   ' + config.securityKeys.S2_AccessControl);
    console.log('S2_Authenticated:   ' + config.securityKeys.S2_Authenticated);
    console.log('S2_Unauthenticated: ' + config.securityKeys.S2_Unauthenticated);
    console.log('S0_Legacy:          ' + config.securityKeys.S0_Legacy);
    console.log('\n⚠️  If you lose these keys after pairing devices, you will need');
    console.log('   to factory reset and re-pair all secure devices!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  // Auto-detect serial port if not configured
  if (!config.serialPort && isNewConfig) {
    console.log('Serial port not configured. Use --port flag to specify.\n');
    console.log('Find your Z-Wave dongle with: ls /dev/cu.*');
    console.log('Example: zwave-lock list --port /dev/cu.usbmodem14101\n');
  }

  return config;
}

/**
 * Save configuration to config.json
 */
export function saveConfig(config: Config): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving config.json:', error);
    throw error;
  }
}

/**
 * Update serial port in configuration
 */
export function updateSerialPort(port: string): void {
  const config = loadConfig();
  config.serialPort = port;
  saveConfig(config);
  console.log(`Serial port updated to: ${port}`);
}

/**
 * Get security keys as Buffer objects for zwave-js
 */
export function getSecurityKeysAsBuffers(config: Config): Record<string, Buffer> | undefined {
  if (!config.securityKeys) {
    return undefined;
  }

  return {
    S2_AccessControl: Buffer.from(config.securityKeys.S2_AccessControl, 'hex'),
    S2_Authenticated: Buffer.from(config.securityKeys.S2_Authenticated, 'hex'),
    S2_Unauthenticated: Buffer.from(config.securityKeys.S2_Unauthenticated, 'hex'),
    S0_Legacy: Buffer.from(config.securityKeys.S0_Legacy, 'hex'),
  };
}
