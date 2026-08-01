const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

export type Attachment = {
  filename: string
  /** Base64 of the file contents. */
  content: string
  contentType: string
}

export type Mail = {
  to: string
  subject: string
  text: string
  attachment: Attachment
}

export class MailError extends Error {}

/** Google access tokens last an hour, so one is fetched per send. */
async function accessTokenFrom(refreshToken: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? '',
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new MailError('Google would not renew the mail permission. Sign out and in again.')
  }

  const { access_token: accessToken } = (await response.json()) as { access_token?: string }
  if (!accessToken) throw new MailError('Google returned no access token.')
  return accessToken
}

/** Subjects can carry accents, which only survive the header when encoded. */
function encodeHeader(value: string): string {
  return /^[\x20-\x7E]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

export function mimeMessage(mail: Mail): string {
  const boundary = `boundary_${Math.random().toString(36).slice(2)}`
  const wrapped = mail.attachment.content.replace(/(.{76})/g, '$1\r\n')

  return [
    `To: ${mail.to}`,
    `Subject: ${encodeHeader(mail.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(mail.text, 'utf8').toString('base64'),
    '',
    `--${boundary}`,
    `Content-Type: ${mail.attachment.contentType}; name="${mail.attachment.filename}"`,
    `Content-Disposition: attachment; filename="${mail.attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    '',
    wrapped,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

/** Sends from the signed-in user's own Gmail account. */
export async function sendMail(refreshToken: string, mail: Mail): Promise<void> {
  const accessToken = await accessTokenFrom(refreshToken)

  const raw = Buffer.from(mimeMessage(mail), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const response = await fetch(SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new MailError(`Gmail refused the message (${response.status}). ${detail.slice(0, 200)}`)
  }
}
