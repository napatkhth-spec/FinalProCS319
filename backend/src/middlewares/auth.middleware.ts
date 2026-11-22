import type { RequestHandler } from 'express'
import { AppRole } from '../generated/prisma/enums.js'
import { loadAuthenticatedUser } from '../services/auth.service.js'
import { verifyAccessToken } from '../utils/auth-crypto.js'
import { HttpError } from '../utils/http-error.js'

export const requireAccessToken: RequestHandler = async (request, response, next) => {
  const authorization = request.header('authorization')
  const [scheme, token, extra] = authorization?.split(' ') ?? []
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
    response.status(401).json({ success: false, message: 'Authentication is required' })
    return
  }

  let payload
  try {
    ({ payload } = await verifyAccessToken(token))
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 503) {
      response.status(503).json({ success: false, message: error.message })
      return
    }
    response.status(401).json({ success: false, message: 'Invalid or expired access token' })
    return
  }
  if (typeof payload.sub !== 'string') {
    response.status(401).json({ success: false, message: 'Invalid or expired access token' })
    return
  }

  try {
    request.appUser = await loadAuthenticatedUser(payload.sub)
    next()
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.statusCode).json({ success: false, message: error.message })
      return
    }
    next(error)
  }
}

export function requireRoles(...requiredRoles: AppRole[]): RequestHandler {
  return (request, response, next) => {
    const user = request.appUser
    if (!user) {
      response.status(401).json({ success: false, message: 'Authentication is required' })
      return
    }
    if (!requiredRoles.some((role) => user.roles.includes(role))) {
      response.status(403).json({ success: false, message: 'Insufficient role permissions' })
      return
    }
    next()
  }
}

export const requireApprovedFarmer: RequestHandler = (request, _response, next) => {
  const user = request.appUser
  if (!user) return next(new HttpError(401, 'Authentication is required'))
  if (!user.roles.includes('FARMER')) return next(new HttpError(403, 'FARMER role is required'))
  if (user.farmerProfile?.verificationStatus !== 'APPROVED') {
    return next(new HttpError(403, 'Farmer verification must be approved before listing products'))
  }
  next()
}
