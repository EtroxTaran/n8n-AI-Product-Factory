import crypto from "crypto";
import logger from "@/lib/logger";

/**
 * Encryption utilities for sensitive data storage.
 *
 * Uses AES-256-GCM for authenticated encryption.
 * Encryption key is derived from AUTH_SECRET environment variable.
 *
 * Ciphertext format: base64(IV + authTag + ciphertext)
 * - IV: 12 bytes (96 bits) - recommended for GCM
 * - Auth Tag: 16 bytes (128 bits)
 * - Ciphertext: variable length
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits - recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Cached encryption key
let encryptionKey: Buffer | null = null;

/**
 * Get or derive the encryption key from AUTH_SECRET.
 * Uses PBKDF2 to derive a proper 256-bit key from the secret.
 */
function getEncryptionKey(): Buffer {
  if (encryptionKey) {
    return encryptionKey;
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET must be set and at least 16 characters for encryption. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  // Use PBKDF2 to derive a proper 256-bit key
  // Salt is static per application (could be made configurable)
  const salt = "ai-product-factory-encryption-salt";
  encryptionKey = crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, "sha256");

  return encryptionKey;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded ciphertext (IV + authTag + encrypted data)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty string");
  }

  const key = getEncryptionKey();

  // Generate a random IV for each encryption
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher with key and IV
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Encrypt the plaintext
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  // Get the authentication tag
  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);

  // Return as base64
  return combined.toString("base64");
}

/**
 * Decrypt a ciphertext string encrypted with encrypt().
 *
 * @param ciphertext - Base64-encoded ciphertext from encrypt()
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    throw new Error("Cannot decrypt empty string");
  }

  const key = getEncryptionKey();

  // Decode from base64
  const combined = Buffer.from(ciphertext, "base64");

  // Minimum length check: IV + authTag + at least 1 byte of data
  const minLength = IV_LENGTH + AUTH_TAG_LENGTH + 1;
  if (combined.length < minLength) {
    throw new Error("Invalid ciphertext: too short");
  }

  // Extract IV, authTag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  // Decrypt
  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (error) {
    // Don't expose cryptographic details in error messages
    logger.error("Decryption failed", { error });
    throw new Error("Decryption failed: invalid ciphertext or wrong key");
  }
}

/**
 * Hash a value for comparison without exposing the original.
 * Uses SHA-256 with a pepper for additional security.
 *
 * @param value - The string to hash
 * @returns Hex-encoded hash
 */
export function hash(value: string): string {
  if (!value) {
    throw new Error("Cannot hash empty string");
  }

  const pepper = process.env.AUTH_SECRET || "default-pepper";
  return crypto
    .createHmac("sha256", pepper)
    .update(value)
    .digest("hex");
}

/**
 * Mask a sensitive string for display purposes.
 * Shows first 3 and last 4 characters, masks the rest.
 *
 * @param value - The string to mask
 * @param options - Masking options
 * @returns Masked string (e.g., "sk-****1234")
 */
export function mask(
  value: string,
  options: { showFirst?: number; showLast?: number; maskChar?: string } = {}
): string {
  const { showFirst = 3, showLast = 4, maskChar = "*" } = options;

  if (!value) {
    return "";
  }

  if (value.length <= showFirst + showLast) {
    // If string is too short, mask everything
    return maskChar.repeat(value.length);
  }

  const first = value.slice(0, showFirst);
  const last = value.slice(-showLast);
  const middleLength = value.length - showFirst - showLast;
  const middle = maskChar.repeat(Math.min(middleLength, 4)); // Cap at 4 asterisks

  return `${first}${middle}${last}`;
}

/**
 * Generate a secure random string suitable for API keys or secrets.
 *
 * @param length - Length of the random string in bytes (default: 32)
 * @returns Base64-encoded random string
 */
export function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString("base64");
}

/**
 * Test if encryption is properly configured.
 * Useful for health checks and initialization.
 *
 * @returns true if encryption is working, false otherwise
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    // Test round-trip
    const testValue = "encryption-test";
    const encrypted = encrypt(testValue);
    const decrypted = decrypt(encrypted);
    return decrypted === testValue;
  } catch {
    return false;
  }
}
