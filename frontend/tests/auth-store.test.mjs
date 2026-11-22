import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useAuthStore } from '../src/stores/auth.store.ts';

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

  useAuthStore.getState().clearSession();
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().accessToken, null);
  assert.equal(useAuthStore.getState().authVersion, initialVersion + 2);
});

test('page reload initializes as anonymous without restoring any token', () => {
  useAuthStore.getState().setSession(testUser, 'memory-only-test-token');
  useAuthStore.getState().initializeAnonymous();
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().accessToken, null);
  assert.equal(useAuthStore.getState().isInitialized, true);
});
