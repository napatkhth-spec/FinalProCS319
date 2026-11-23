import { HttpError } from '../utils/http-error.js';

export function getAuthConfig() {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new HttpError(503, 'Authentication is not configured');
  }

  const accessTtlSeconds = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 3600);
  if (!Number.isInteger(accessTtlSeconds) || accessTtlSeconds < 60 || accessTtlSeconds > 3600) {
    throw new HttpError(503, 'Authentication is not configured');
  }

  return {
    secret,
    issuer: process.env.ACCESS_TOKEN_ISSUER ?? 'local-farmer-market-api',
    audience: process.env.ACCESS_TOKEN_AUDIENCE ?? 'local-farmer-market-web',
    accessTtlSeconds,
  };
}
