const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export class GoogleError extends Error {}

/** Long enough for any single Google call, short enough not to hold a function open. */
const GOOGLE_TIMEOUT_MS = 10_000

/** `fetch` with a timeout, reported as a GoogleError so callers show it like any other. */
async function fetchGoogle(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new GoogleError('Google did not answer in time. Try again.')
    }
    throw error
  }
}

/** Google access tokens last an hour, so one is fetched per operation. */
export async function accessTokenFrom(refreshToken: string): Promise<string> {
  const response = await fetchGoogle(TOKEN_URL, {
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
    throw new GoogleError('Google access has lapsed. Grant it again in Settings.')
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
  const response = await fetchGoogle(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  return { ok: response.ok, status: response.status, body: await response.text() }
}
