import { randomBytes } from 'node:crypto'
import argon2, { type HashOptions } from 'argon2'
import { SignJWT, jwtVerify } from 'jose'
import { getAuthConfig } from '../config/auth.js'

const argonOptions: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
}

const dummyHash = argon2.hash(randomBytes(32), argonOptions)

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argonOptions)
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    await argon2.verify(await dummyHash, password).catch(() => false)
    return false
  }
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

export async function signAccessToken(userId: string): Promise<string> {
  const config = getAuthConfig()
  const key = new TextEncoder().encode(config.secret)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${config.accessTtlSeconds}s`)
    .sign(key)
}

export async function verifyAccessToken(token: string) {
  const config = getAuthConfig()
  const key = new TextEncoder().encode(config.secret)
  return jwtVerify(token, key, {
    issuer: config.issuer,
    audience: config.audience,
    algorithms: ['HS256'],
  })
}
