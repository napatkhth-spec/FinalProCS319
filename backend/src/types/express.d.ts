import type { AuthenticatedAppUser } from './auth.js'

declare global {
  namespace Express {
    interface Request {
      appUser?: AuthenticatedAppUser
    }
  }
}

export {}
