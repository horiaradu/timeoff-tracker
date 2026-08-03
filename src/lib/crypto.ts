import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const VERSION = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32

function key(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('FIELD_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32')
  }

  const bytes = Buffer.from(raw, 'base64')
  if (bytes.length !== KEY_BYTES) {
    throw new Error(`FIELD_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${bytes.length}.`)
  }
  return bytes
}

/**
 * Stored as `v1:iv:tag:ciphertext`, all base64. The version prefix leaves room to
 * rotate the key later, and none of the four parts can contain a colon.
 */
export function encrypt(value: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key(), iv)
  const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])

  return [
    VERSION,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    body.toString('base64'),
  ].join(':')
}

/**
 * Anything not in our format is handed back untouched, so rows written before
 * encryption existed still read correctly and the backfill can be re-run safely.
 */
export function decrypt(stored: string): string {
  const parts = stored.split(':')
  if (parts.length !== 4 || parts[0] !== VERSION) return stored

  const [, iv, tag, body] = parts
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))

  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString(
    'utf8'
  )
}

export function isEncrypted(stored: string): boolean {
  const parts = stored.split(':')
  return parts.length === 4 && parts[0] === VERSION
}

export function encryptOptional(value: string | null): string | null {
  return value === null ? null : encrypt(value)
}

export function decryptOptional(stored: string | null): string | null {
  return stored === null ? null : decrypt(stored)
}
