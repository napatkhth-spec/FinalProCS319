import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useAuthStore } from '../src/stores/auth.store.ts';

const storedValues = new Map();
globalThis.localStorage = {
  getItem: (key) => storedValues.get(key) ?? null,
  setItem: (key, value) => storedValues.set(key, value),
  removeItem: (key) => storedValues.delete(key),
};

const testUser = {
  id: 'test-user-uuid',
  name: 'Test Buyer',
  email: 'buyer@marketplace.invalid',
  roles: ['BUYER'],
  farmerProfile: null,
};

test('Auth Store keeps access token in memory and clears it on logout', () => {
  const initialVersion = useAuthStore.getState().authVersion;
  useAuthStore.getState().setSession(testUser, 'memory-only-test-token');
  assert.equal(useAuthStore.getState().user?.id, testUser.id);
  assert.equal(useAuthStore.getState().user?.name, testUser.name);
  assert.equal(useAuthStore.getState().accessToken, 'memory-only-test-token');
  assert.equal(useAuthStore.getState().isInitialized, true);
  assert.equal(useAuthStore.getState().authVersion, initialVersion + 1);
  assert.equal(localStorage.getItem('local-farmer-market.access-token'), 'memory-only-test-token');

  useAuthStore.getState().clearSession();
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().accessToken, null);
  assert.equal(useAuthStore.getState().authVersion, initialVersion + 2);
  assert.equal(localStorage.getItem('local-farmer-market.access-token'), null);
});

test('page reload can restore the stored token while current user is being loaded', () => {
  useAuthStore.getState().setSession(testUser, 'memory-only-test-token');
  useAuthStore
    .getState()
    .beginSessionInitialization(localStorage.getItem('local-farmer-market.access-token'));
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().accessToken, 'memory-only-test-token');
  assert.equal(useAuthStore.getState().isInitialized, false);
  useAuthStore.getState().setSession(testUser, 'memory-only-test-token');
  assert.equal(useAuthStore.getState().user?.id, testUser.id);
  assert.equal(useAuthStore.getState().isInitialized, true);
});

test('invalid session clears the stored token', () => {
  useAuthStore.getState().setSession(testUser, 'invalid-token');
  useAuthStore.getState().clearSession();
  assert.equal(localStorage.getItem('local-farmer-market.access-token'), null);
});
