/**
 * Encryption utilities for secure API key storage
 *
 * Uses AES-256-GCM for encryption with a master key from environment.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get the encryption key from environment or generate a derived key
 */
function getEncryptionKey(): Buffer {
  const masterKey = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || '';

  if (!masterKey) {
    console.warn('No ENCRYPTION_KEY set, using default (not secure for production)');
    return crypto.scryptSync('default-key-not-secure', 'salt', 32);
  }

  // Derive a 32-byte key from the master key
  return crypto.scryptSync(masterKey, 'arabaldives-salt', 32);
}

/**
 * Encrypt a string value
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, new Uint8Array(key), new Uint8Array(iv));

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + Auth Tag + Encrypted data
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt a string value
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  // Extract IV, Auth Tag, and encrypted data
  const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(
    encryptedText.slice(IV_LENGTH * 2, IV_LENGTH * 2 + TAG_LENGTH * 2),
    'hex'
  );
  const encrypted = encryptedText.slice(IV_LENGTH * 2 + TAG_LENGTH * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, new Uint8Array(key), new Uint8Array(iv));
  decipher.setAuthTag(new Uint8Array(authTag));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash a value (one-way)
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Mask an API key for display (show first 8 and last 4 characters)
 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return '••••••••••••';
  }
  return key.slice(0, 8) + '••••••••' + key.slice(-4);
}

/**
 * Verify if a string looks like a valid API key for a provider
 */
export function validateApiKeyFormat(provider: string, key: string): boolean {
  const patterns: Record<string, RegExp> = {
    claude: /^sk-ant-api\d{2}-[A-Za-z0-9_-]+$/,
    openai: /^sk-[A-Za-z0-9]{48,}$/,
    gemini: /^[A-Za-z0-9_-]{39}$/,
  };

  const pattern = patterns[provider];
  if (!pattern) {
    // Unknown provider, just check it's not empty
    return key.length > 10;
  }

  return pattern.test(key);
}
