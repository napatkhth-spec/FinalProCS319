import { createCipheriv, createHmac, randomBytes } from 'node:crypto';
import { HttpError } from './http-error.js';

function getEncryptionKey() {
  const value = process.env.NATIONAL_ID_ENCRYPTION_KEY;
  if (!value || !/^[\da-f]{64}$/i.test(value)) {
    throw new HttpError(503, 'Secure identity storage is not configured');
  }
  return Buffer.from(value, 'hex');
}

function getHashSecret() {
  const value = process.env.NATIONAL_ID_HASH_SECRET;
  if (!value || value.length < 32) {
    throw new HttpError(503, 'Secure identity storage is not configured');
  }
  return value;
}

export function hashNationalId(nationalId: string) {
  return createHmac('sha256', getHashSecret()).update(nationalId).digest('hex');
}

export function encryptNationalId(nationalId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(nationalId, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}
