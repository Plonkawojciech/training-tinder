import { describe, it, expect, beforeAll } from 'vitest';
import { signToken, verifyToken } from '@/lib/jwt';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-vitest-only';
});

describe('jwt – signToken / verifyToken', () => {
  it('signs and verifies a valid token', async () => {
    const token = await signToken('user-123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);

    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe('user-123');
  });

  it('returns null for a garbage token', async () => {
    const result = await verifyToken('not.a.valid.jwt');
    expect(result).toBeNull();
  });

  it('returns null for an empty string', async () => {
    const result = await verifyToken('');
    expect(result).toBeNull();
  });

  it('returns null for a tampered token', async () => {
    const token = await signToken('user-456');
    // Corrupt the signature section (after the last dot)
    const parts = token.split('.');
    // Reverse the signature to guarantee corruption
    parts[2] = parts[2].split('').reverse().join('');
    const tampered = parts.join('.');
    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });

  it('preserves the userId through the roundtrip', async () => {
    const ids = ['abc', 'a1b2c3d4', 'usr_00000000-0000-0000-0000-000000000000'];
    for (const id of ids) {
      const token = await signToken(id);
      const payload = await verifyToken(token);
      expect(payload?.userId).toBe(id);
    }
  });
});
