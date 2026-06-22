import { describe, expect, it } from 'vitest';

import { createOpaqueToken, hashToken, tokenHashMatches } from './auth-crypto.js';

describe('auth crypto', () => {
  it('creates opaque tokens and compares only their hashes', () => {
    const token = createOpaqueToken();
    const hash = hashToken(token);
    expect(token).not.toBe(hash);
    expect(hash).toHaveLength(64);
    expect(tokenHashMatches(token, hash)).toBe(true);
    expect(tokenHashMatches(`${token}x`, hash)).toBe(false);
  });
});
