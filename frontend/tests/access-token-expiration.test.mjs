import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAccessTokenExpirationMs } from '../src/features/auth/access-token-expiration.ts';

function tokenWithPayload(payload) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
}

test('reads the JWT exp claim as milliseconds for the expiration timer', () => {
  assert.equal(getAccessTokenExpirationMs(tokenWithPayload({ exp: 1_800_000_000 })), 1_800_000_000_000);
});

test('returns null when the token has no usable expiration claim', () => {
  assert.equal(getAccessTokenExpirationMs('malformed-token'), null);
  assert.equal(getAccessTokenExpirationMs(tokenWithPayload({ sub: 'user-id' })), null);
  assert.equal(getAccessTokenExpirationMs(tokenWithPayload({ exp: '3600' })), null);
});
