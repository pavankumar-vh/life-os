import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET as string
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required')
  process.exit(1)
}

export interface JWTPayload {
  userId: string
  email: string
}

// Short-lived token issued after password verification when MFA is required.
// The client holds this token and sends it with the OTP/recovery-code to complete login.
export interface MfaChallengePayload {
  mfaChallenge: true
  userId: string
  email: string
}

export interface AuthRequest extends Request {
  user?: JWTPayload
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

/** Issues a 5-minute MFA challenge token. Not a session — cannot access protected routes. */
export function signMfaToken(payload: Omit<MfaChallengePayload, 'mfaChallenge'>): string {
  return jwt.sign({ ...payload, mfaChallenge: true }, JWT_SECRET, { expiresIn: '5m' })
}

export function verifyMfaToken(token: string): MfaChallengePayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as MfaChallengePayload
    if (!decoded.mfaChallenge) return null
    return decoded
  } catch {
    return null
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  let token: string | undefined

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  // Reject MFA challenge tokens — they cannot be used to access protected routes
  if ((payload as any).mfaChallenge) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  req.user = payload
  next()
}

export function isDemoUser(userId: string): boolean {
  return userId === 'demo-user-001'
}

