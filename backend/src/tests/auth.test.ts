import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { SignJWT } from 'jose';
import { getAuthConfig } from '../config/auth.js';
import {
  hashPassword,
  normalizeEmail,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from '../utils/auth-crypto.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';

process.env.ACCESS_TOKEN_SECRET = randomBytes(32).toString('base64url');
process.env.ACCESS_TOKEN_ISSUER = 'local-farmer-market-api-test';
process.env.ACCESS_TOKEN_AUDIENCE = 'local-farmer-market-web-test';
process.env.ACCESS_TOKEN_TTL_SECONDS = '3600';
process.env.NATIONAL_ID_ENCRYPTION_KEY = randomBytes(32).toString('hex');
process.env.NATIONAL_ID_HASH_SECRET = randomBytes(48).toString('base64url');

const { createFarmerProfileSchema } = await import('../validators/farmer.validator.js');
const { encryptNationalId, hashNationalId } = await import('../utils/farmer-identity.js');

function validThaiNationalId() {
  const firstTwelve = '110170020345';
  const sum = [...firstTwelve].reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  return `${firstTwelve}${(11 - (sum % 11)) % 10}`;
}

test('shop opening validates Thai phone and national ID checksum', () => {
  const validId = validThaiNationalId();
  const validInput = {
    shopName: 'สวนทดสอบ',
    contactPhone: '0812345678',
    nationalId: validId,
    province: 'เชียงใหม่',
  };
  assert.equal(createFarmerProfileSchema.safeParse(validInput).success, true);
  assert.equal(createFarmerProfileSchema.safeParse({ ...validInput, contactPhone: '12345' }).success, false);
  assert.equal(
    createFarmerProfileSchema.safeParse({
      ...validInput,
      nationalId: `${validId.slice(0, 12)}${(Number(validId[12]) + 1) % 10}`,
    }).success,
    false,
  );
});

test('national ID uses authenticated encryption and keyed hashing without storing plaintext', () => {
  const nationalId = validThaiNationalId();
  const ciphertext = encryptNationalId(nationalId);
  assert.match(ciphertext, /^v1:/);
  assert.equal(ciphertext.includes(nationalId), false);
  assert.equal(hashNationalId(nationalId).length, 64);
  assert.notEqual(hashNationalId(nationalId), nationalId);
});

test('email normalization and registration validation remain stable', () => {
  assert.equal(normalizeEmail('  Farmer@Test.Invalid  '), 'farmer@test.invalid');
  assert.equal(
    registerSchema.safeParse({
      email: ' Farmer@MarketPlace.org ',
      password: 'safe-test-password-123',
      fullName: 'Test Farmer',
    }).data?.email,
    'farmer@marketplace.org',
  );
  assert.equal(
    registerSchema.safeParse({
      email: 'farmer@marketplace.org',
      password: 'safe-test-password-123',
      fullName: 'Test Farmer',
      role: 'ADMIN',
    }).success,
    false,
  );
  assert.equal(
    registerSchema.safeParse({ email: 'farmer@marketplace.org', password: 'short', fullName: 'Test Farmer' })
      .success,
    false,
  );
  assert.equal(
    loginSchema.safeParse({ email: 'farmer@marketplace.org', password: 'safe-test-password-123' }).success,
    true,
  );
});

test('passwords are hashed with Argon2id and legacy users without hashes cannot log in', async () => {
  const password = 'unit-test-only-password-42';
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.match(hash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('wrong-unit-test-password', hash), false);
  assert.equal(await verifyPassword(password, null), false);
});

test('access JWT expires after exactly one hour and validates issuer/audience/subject/expiry', async () => {
  const config = getAuthConfig();
  const token = await signAccessToken('user-id');
  const { payload } = await verifyAccessToken(token);
  assert.equal(config.accessTtlSeconds, 3600);
  assert.equal(payload.sub, 'user-id');
  assert.equal(payload.sid, undefined);
  assert.equal(payload.iss, config.issuer);
  assert.equal(payload.aud, config.audience);
  assert.ok(typeof payload.iat === 'number');
  assert.equal(payload.exp, payload.iat + 3600);

  const key = new TextEncoder().encode(config.secret);
  const wrongAudience = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(config.issuer)
    .setAudience('wrong-audience')
    .setSubject('user-id')
    .setExpirationTime('5m')
    .sign(key);
  await assert.rejects(verifyAccessToken(wrongAudience));

  const expired = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setSubject('user-id')
    .setExpirationTime('0s')
    .sign(key);
  await assert.rejects(verifyAccessToken(expired));
});

test('authentication configuration fails closed when signing secret is missing', () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  delete process.env.ACCESS_TOKEN_SECRET;
  try {
    assert.throws(() => getAuthConfig(), /Authentication is not configured/);
  } finally {
    if (secret === undefined) delete process.env.ACCESS_TOKEN_SECRET;
    else process.env.ACCESS_TOKEN_SECRET = secret;
  }
});
