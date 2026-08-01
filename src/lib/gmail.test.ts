import { describe, expect, it } from 'vitest'
import { mimeMessage, type Mail } from './gmail'

const mail = (overrides: Partial<Mail> = {}): Mail => ({
  to: 'cineva@smilecloud.com',
  subject: 'Cerere concediu 17.04.2026 - 20.04.2026',
  text: 'Atasat, cererea de concediu de odihna pentru perioada 17.04.2026 - 20.04.2026.',
  attachment: {
    filename: 'cerere-concediu-2026-04-17.pdf',
    content: Buffer.from('a fake pdf').toString('base64'),
    contentType: 'application/pdf',
  },
  ...overrides,
})

describe('mimeMessage', () => {
  it('addresses the message and keeps a plain subject readable', () => {
    const message = mimeMessage(mail())
    expect(message).toContain('To: cineva@smilecloud.com')
    expect(message).toContain('Subject: Cerere concediu 17.04.2026 - 20.04.2026')
  })

  it('encodes a subject carrying diacritics', () => {
    const message = mimeMessage(mail({ subject: 'Cerere concediu în mai' }))
    expect(message).not.toContain('Cerere concediu în mai')
    expect(message).toMatch(/Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=/)
  })

  it('attaches the document with its filename', () => {
    const message = mimeMessage(mail())
    expect(message).toContain(
      'Content-Type: application/pdf; name="cerere-concediu-2026-04-17.pdf"'
    )
    expect(message).toContain(
      'Content-Disposition: attachment; filename="cerere-concediu-2026-04-17.pdf"'
    )
  })

  it('separates the body and the attachment with the declared boundary', () => {
    const message = mimeMessage(mail())
    const declared = message.match(/boundary="([^"]+)"/)?.[1]
    expect(declared).toBeDefined()
    expect(message.split(`--${declared}`).length - 1).toBe(3) // two parts plus the closing marker
    expect(message.trimEnd().endsWith(`--${declared}--`)).toBe(true)
  })

  it('uses CRLF line endings, as the mail format requires', () => {
    const message = mimeMessage(mail())
    expect(message).toContain('\r\n')
    expect(message.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('wraps long attachment payloads into short lines', () => {
    const long = Buffer.alloc(400, 7).toString('base64')
    const message = mimeMessage(mail({ attachment: { ...mail().attachment, content: long } }))
    const payload = message.slice(message.lastIndexOf('base64\r\n\r\n') + 10)
    for (const line of payload.split('\r\n').filter(Boolean)) {
      if (line.startsWith('--')) continue
      expect(line.length).toBeLessThanOrEqual(76)
    }
  })
})
