const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export class GoogleError extends Error {}

/** Google access tokens last an hour, so one is fetched per operation. */
export async function accessTokenFrom(refreshToken: string): Promise<string> {
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
    throw new GoogleError('Google would not renew the permission. Sign out and in again.')
  }

  const { access_token: accessToken } = (await response.json()) as { access_token?: string }
  if (!accessToken) throw new GoogleError('Google returned no access token.')
  return accessToken
}

export type Sent = {
  ok: boolean
  status: number
  body: string
}

/** A thin wrapper so callers can tell a missing event from a real failure. */
export async function callGoogle(
  accessToken: string,
  method: string,
  url: string,
  body?: unknown
): Promise<Sent> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  return { ok: response.ok, status: response.status, body: await response.text() }
}
