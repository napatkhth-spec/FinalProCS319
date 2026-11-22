import type { RequestHandler } from 'express'
import { login, register } from '../services/auth.service.js'
import type { LoginInput, RegisterInput } from '../validators/auth.validator.js'
import { HttpError } from '../utils/http-error.js'

export const registerAccount: RequestHandler = async (request, response) => {
  await register(request.body as RegisterInput)
  response.status(202).json({
    success: true,
    message: 'ได้รับคำขอแล้ว หากเป็นบัญชีใหม่ให้ลองเข้าสู่ระบบด้วยข้อมูลที่ส่งมา หากมีบัญชีอยู่แล้วให้ใช้ข้อมูลบัญชีเดิม',
  })
}

export const loginAccount: RequestHandler = async (request, response) => {
  const result = await login(request.body as LoginInput)
  response.json({ success: true, data: result })
}

// Access tokens are stateless in the demo flow. Logout clears the client token;
// this endpoint intentionally does not revoke tokens or access auth_sessions.
export const logoutAccount: RequestHandler = (_request, response) => {
  response.json({ success: true })
}

export const getCurrentUser: RequestHandler = (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required')
  response.json({ success: true, data: request.appUser })
}

export const unsupportedLegacyAuthOperation: RequestHandler = (_request, response) => {
  response.status(410).json({ success: false, message: 'This session operation is not available in the demo authentication flow.' })
}
