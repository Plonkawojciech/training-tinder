import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from '@/lib/crypto';
import { randomBytes } from 'crypto';

beforeAll(() => {
  // Set a valid 32-byte (64 hex chars) encryption key for tests
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
});

describe('crypto – encrypt/decrypt', () => {
  it('roundtrips a simple string', () => {
    const plaintext = 'hello world';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('roundtrips an empty string', () => {
    const encrypted = encrypt('');
    expect(decrypt(encrypted)).toBe('');
  });

  it('roundtrips special characters', () => {
    const special = 'ąęółżźćśń!@#$%^&*()_+{}|:"<>?~`-=[];\',./';
    expect(decrypt(encrypt(special))).toBe(special);
  });

  it('roundtrips Unicode / emoji text', () => {
    const unicode = 'Trening siłowy 💪🏋️‍♂️ VO₂max';
    expect(decrypt(encrypt(unicode))).toBe(unicode);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const plaintext = 'deterministic?';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    // Both must still decrypt correctly
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('secret');
    // Flip a byte in the middle
    const tampered =
      encrypted.slice(0, encrypted.length / 2) +
      'ff' +
      encrypted.slice(encrypted.length / 2 + 2);
    expect(() => decrypt(tampered)).toThrow();
  });

  it('roundtrips a long string', () => {
    const long = 'A'.repeat(10_000);
    expect(decrypt(encrypt(long))).toBe(long);
  });
});
