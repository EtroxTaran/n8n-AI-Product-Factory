import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Set environment variable BEFORE importing encryption module
const mockAuthSecret = 'test-auth-secret-32-characters!!';
const originalEnv = process.env.AUTH_SECRET;

beforeAll(() => {
  process.env.AUTH_SECRET = mockAuthSecret;
});

afterAll(() => {
  if (originalEnv !== undefined) {
    process.env.AUTH_SECRET = originalEnv;
  } else {
    delete process.env.AUTH_SECRET;
  }
});

// Import after setting environment
import { encrypt, decrypt, mask, hash, generateSecret, isEncryptionConfigured } from '../lib/encryption';

describe('Encryption Library', () => {
  describe('encrypt', () => {
    it('should encrypt a plaintext string', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Due to random IV, same plaintext produces different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw error for empty strings', () => {
      // The encryption module explicitly throws for empty strings
      expect(() => encrypt('')).toThrow('Cannot encrypt empty string');
    });

    it('should handle unicode characters', () => {
      const plaintext = 'api-key-with-émojis-🔐🔑';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'api-key-with-émojis-🔐🔑';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for empty strings', () => {
      // The decryption module explicitly throws for empty strings
      expect(() => decrypt('')).toThrow('Cannot decrypt empty string');
    });

    it('should handle long strings', () => {
      const plaintext = 'b'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid ciphertext format', () => {
      expect(() => decrypt('invalid-ciphertext')).toThrow();
    });

    it('should throw error for tampered ciphertext', () => {
      const plaintext = 'my-secret';
      const encrypted = encrypt(plaintext);
      // Tamper with the ciphertext
      const tampered = encrypted.slice(0, -10) + 'xxxxxxxxxx';

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('round-trip encryption', () => {
    it('should preserve data through multiple encrypt/decrypt cycles', () => {
      const plaintext = 'test-data-12345';

      let current = plaintext;
      for (let i = 0; i < 5; i++) {
        const encrypted = encrypt(current);
        current = decrypt(encrypted);
      }

      expect(current).toBe(plaintext);
    });
  });

  describe('mask', () => {
    it('should mask middle characters of a string', () => {
      const result = mask('sk-abc123456789xyz');
      // First 3 + 4 asterisks + last 4
      expect(result).toBe('sk-****9xyz');
    });

    it('should return empty string for empty input', () => {
      expect(mask('')).toBe('');
    });

    it('should mask entire short strings', () => {
      expect(mask('abc')).toBe('***');
    });

    it('should use custom mask options', () => {
      const result = mask('mysecretkey', { showFirst: 2, showLast: 2, maskChar: '#' });
      expect(result).toBe('my####ey');
    });
  });

  describe('hash', () => {
    it('should produce consistent hash for same input', () => {
      const hash1 = hash('test-value');
      const hash2 = hash('test-value');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = hash('test-value-1');
      const hash2 = hash('test-value-2');
      expect(hash1).not.toBe(hash2);
    });

    it('should throw for empty string', () => {
      expect(() => hash('')).toThrow('Cannot hash empty string');
    });
  });

  describe('generateSecret', () => {
    it('should generate a base64 string', () => {
      const secret = generateSecret();
      expect(typeof secret).toBe('string');
      // Base64 pattern check
      expect(secret).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should generate different secrets each time', () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      expect(secret1).not.toBe(secret2);
    });

    it('should respect custom length', () => {
      const secret = generateSecret(16);
      // 16 bytes = 24 base64 characters (with padding)
      expect(secret.length).toBeLessThanOrEqual(24);
    });
  });

  describe('isEncryptionConfigured', () => {
    it('should return true when encryption is working', () => {
      expect(isEncryptionConfigured()).toBe(true);
    });
  });
});
