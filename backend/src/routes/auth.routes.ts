import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import {
  getCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  unsupportedLegacyAuthOperation,
} from '../controllers/auth.controller.js'
import { requireAccessToken } from '../middlewares/auth.middleware.js'
import { requireTrustedOrigin } from '../middlewares/trusted-origin.middleware.js'
import { validateBody } from '../middlewares/validate.middleware.js'
import { loginSchema, registerSchema } from '../validators/auth.validator.js'

export function getLoginRateLimitConfig(environment = process.env.NODE_ENV) {
  return {
    windowMs: 15 * 60 * 1000,
    limit: environment === 'development' ? 100 : 8,
  }
}

export function shouldSkipLoginRateLimit(environment = process.env.NODE_ENV): boolean {
  return environment === 'development'
}

const loginLimiter = rateLimit({
  ...getLoginRateLimitConfig(),
  skip: () => shouldSkipLoginRateLimit(),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่ภายหลัง' },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่ภายหลัง' },
})

export const authRouter = Router()

authRouter.post('/register', registerLimiter, validateBody(registerSchema), registerAccount)
authRouter.post('/login', loginLimiter, validateBody(loginSchema), loginAccount)
authRouter.post('/logout', requireTrustedOrigin, logoutAccount)
authRouter.post('/refresh', unsupportedLegacyAuthOperation)
authRouter.post('/logout-all', unsupportedLegacyAuthOperation)
authRouter.get('/me', requireAccessToken, getCurrentUser)
