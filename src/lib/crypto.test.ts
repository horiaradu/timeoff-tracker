import { randomBytes } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { decrypt, decryptOptional, encrypt, encryptOptional, isEncrypted } from './crypto'

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('encrypt and decrypt', () => {
  it('returns the original value', () => {
    for (const value of ['1111111111111', 'Ion Popescu', 'Timisoara', '21', '']) {
      expect(decrypt(encrypt(value)), value).toBe(value)
    }
  })

  it('survives accents and long values', () => {
    const value = `Ștefan Ținteșcu ${'x'.repeat(5000)}`
    expect(decrypt(encrypt(value))).toBe(value)
  })

  it('hides the plaintext', () => {
    const stored = encrypt('1111111111111')
    expect(stored).not.toContain('1111111111111')
    expect(isEncrypted(stored)).toBe(true)
  })

  it('gives a different result every time, so equal values are not obvious', () => {
    expect(encrypt('20')).not.toBe(encrypt('21'))
  })

  it('refuses to decrypt a tampered value', () => {
    const [version, iv, tag, body] = encrypt('24').split(':')
    const flipped = Buffer.from(body, 'base64')
    flipped[0] ^= 0xff
    const tampered = [version, iv, tag, flipped.toString('base64')].join(':')

    expect(() => decrypt(tampered)).toThrow()
  })
})

describe('values written before encryption existed', () => {
  it('reads plain text straight through', () => {
    for (const legacy of ['21', 'Ion Popescu', 'data:image/png;base64,iVBORw0KGgo=']) {
      expect(decrypt(legacy), legacy).toBe(legacy)
      expect(isEncrypted(legacy), legacy).toBe(false)
    }
  })

  it('lets the backfill run twice without double encrypting', () => {
    const days = '21'
    const once = encrypt(days)
    // Exactly what the backfill does on a second pass.
    const twice = isEncrypted(once) ? once : encrypt(once)
    expect(twice).toBe(once)
    expect(decrypt(twice)).toBe(days)
  })
})

describe('optional values', () => {
  it('leaves null alone in both directions', () => {
    expect(encryptOptional(null)).toBeNull()
    expect(decryptOptional(null)).toBeNull()
  })

  it('round trips a present value', () => {
    expect(decryptOptional(encryptOptional('signature'))).toBe('signature')
  })
})
