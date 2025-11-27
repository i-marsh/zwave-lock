import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface UserCode {
  slot: number;
  name: string;
  pin: string; // Encrypted
}

interface CodeStorage {
  codes: UserCode[];
}

const STORAGE_FILE = path.join(process.cwd(), 'user-codes.json');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Get or create encryption key from config
let encryptionKey: Buffer;

function getEncryptionKey(): Buffer {
  if (encryptionKey) return encryptionKey;
  
  // Try to load from environment or config
  const keyHex = process.env.CODE_ENCRYPTION_KEY;
  
  if (keyHex) {
    encryptionKey = Buffer.from(keyHex, 'hex');
  } else {
    // Generate a new key and warn user to save it
    encryptionKey = crypto.randomBytes(32);
    console.warn('\n⚠️  Generated new encryption key for user codes.');
    console.warn('⚠️  Set CODE_ENCRYPTION_KEY environment variable to persist:');
    console.warn(`⚠️  export CODE_ENCRYPTION_KEY=${encryptionKey.toString('hex')}\n`);
  }
  
  return encryptionKey;
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv + authTag + encrypted (all hex)
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  
  // Parse: iv + authTag + encrypted
  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
  const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

function loadStorage(): CodeStorage {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading user codes:', error);
  }
  
  return { codes: [] };
}

function saveStorage(storage: CodeStorage): void {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving user codes:', error);
    throw error;
  }
}

export function getAllCodes(): Array<{ slot: number; name: string }> {
  const storage = loadStorage();
  return storage.codes.map(code => ({
    slot: code.slot,
    name: code.name
  }));
}

export function getCode(slot: number): { name: string; pin: string } | null {
  const storage = loadStorage();
  const code = storage.codes.find(c => c.slot === slot);
  
  if (!code) return null;
  
  return {
    name: code.name,
    pin: decrypt(code.pin)
  };
}

export function saveCode(slot: number, name: string, pin: string): void {
  const storage = loadStorage();
  
  // Validate PIN
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error('PIN must be 4-8 digits');
  }
  
  // Remove existing code at this slot
  storage.codes = storage.codes.filter(c => c.slot !== slot);
  
  // Add new code
  storage.codes.push({
    slot,
    name,
    pin: encrypt(pin)
  });
  
  // Sort by slot
  storage.codes.sort((a, b) => a.slot - b.slot);
  
  saveStorage(storage);
}

export function deleteCode(slot: number): void {
  const storage = loadStorage();
  storage.codes = storage.codes.filter(c => c.slot !== slot);
  saveStorage(storage);
}
