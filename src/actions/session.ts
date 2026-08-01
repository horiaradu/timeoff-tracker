'use server'

import { signIn, signOut } from '@/auth'

export async function endSession(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}

/**
 * Re-asks Google for permission. Ordinary sign-in deliberately does not force the
 * consent screen, but only consent yields a fresh refresh token, so this is the way
 * back when the stored one stops working.
 */
export async function reconnectGoogle(): Promise<void> {
  await signIn('google', { redirectTo: '/settings' }, { prompt: 'consent' })
}
