import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// ─── TOTP Configuration ────────────────────────────────────────────────────
// RFC 6238 compliant — compatible with Google Authenticator, Aegis, 2FAS,
// Microsoft Authenticator, Authy, 1Password, and all standards-compliant TOTP apps.

const APP_NAME = 'Life OS'

// ─── Secret generation ────────────────────────────────────────────────────

/**
 * Generates a new cryptographically secure TOTP secret.
 * Returns the base32 secret, the otpauth URI, and a QR code data URI.
 * The secret is NOT persisted here — the caller stores it as mfaPendingSecret.
 */
export async function generateTotpSetup(email: string): Promise<{
  secret: string
  otpauthUri: string
  qrDataUri: string
}> {
  const secretObj = speakeasy.generateSecret({
    length: 20,      // 160-bit secret
    name: `${APP_NAME} (${email})`,
    issuer: APP_NAME,
  })

  const otpauthUri = secretObj.otpauth_url!
  const secret = secretObj.base32

  const qrDataUri = await QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 240,
  })

  return { secret, otpauthUri, qrDataUri }
}

// ─── Verification ─────────────────────────────────────────────────────────

/**
 * Verifies a 6-digit TOTP token against the stored base32 secret.
 * window=2 allows ±60 seconds clock drift (2 time steps either side).
 * Never logs the token or secret.
 */
export function verifyTotp(secret: string, token: string): boolean {
  try {
    if (!/^\d{6}$/.test(token)) return false
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // ±30 seconds (1 step each direction)
    })
  } catch {
    return false
  }
}

// ─── Recovery codes ───────────────────────────────────────────────────────

const RECOVERY_CODE_COUNT = 10
// Format: XXXX-XXXX-XXXX (12 hex chars displayed as 3 groups of 4)
const RECOVERY_CODE_BYTES = 6

/**
 * Generates cryptographically secure one-time recovery codes.
 * Returns plaintext codes (shown to user once) and their bcrypt hashes (stored in DB).
 * Never logs either.
 */
export async function generateRecoveryCodes(): Promise<{
  plaintext: string[]
  hashes: string[]
}> {
  const plaintext: string[] = []
  const hashes: string[] = []

  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const raw = crypto.randomBytes(RECOVERY_CODE_BYTES).toString('hex').toUpperCase()
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`
    plaintext.push(formatted)
    const hash = await bcrypt.hash(formatted.replace(/-/g, ''), 10)
    hashes.push(hash)
  }

  return { plaintext, hashes }
}

/**
 * Verifies a recovery code input against the stored hashes.
 * Returns the index of the matching hash (to mark it used), or -1 if no match.
 * Input is normalised (stripped of dashes, uppercased) before comparison.
 * Never logs the code.
 */
export async function verifyRecoveryCode(
  input: string,
  hashes: string[]
): Promise<number> {
  const normalised = input.replace(/[-\s]/g, '').toUpperCase()
  if (!normalised || normalised.length < 8) return -1

  for (let i = 0; i < hashes.length; i++) {
    if (!hashes[i]) continue // already used (null/empty)
    const match = await bcrypt.compare(normalised, hashes[i])
    if (match) return i
  }

  return -1
}
