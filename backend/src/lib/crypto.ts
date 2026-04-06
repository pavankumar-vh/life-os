import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12  // 96-bit IV for GCM
const TAG_LENGTH = 16 // 128-bit auth tag

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY env var is not set')
  const buf = Buffer.from(raw, 'hex')
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)')
  return buf
}

export interface EncryptedField {
  iv: string
  tag: string
  data: string
}

/** Encrypt a plaintext string. Returns an object with iv, tag, data (all hex). */
export function encrypt(plaintext: string): EncryptedField {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  }
}

/** Decrypt an EncryptedField object back to plaintext. */
export function decrypt(field: EncryptedField): string {
  const key = getKey()
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(field.iv, 'hex'),
    { authTagLength: TAG_LENGTH }
  )
  decipher.setAuthTag(Buffer.from(field.tag, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(field.data, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

/** Returns true if value looks like an encrypted field object (not a raw string). */
export function isEncrypted(value: unknown): value is EncryptedField {
  return (
    typeof value === 'object' &&
    value !== null &&
    'iv' in value &&
    'tag' in value &&
    'data' in value
  )
}
