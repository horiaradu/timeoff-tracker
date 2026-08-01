import { redirect } from 'next/navigation'
import { currentUserId } from '@/auth'

/**
 * The signed-in user's id. Every page, action and route handler calls this on
 * its own, because the proxy redirect alone is not an authorization check.
 */
export async function requireUserId(): Promise<string> {
  const userId = await currentUserId()
  if (!userId) redirect('/login')
  return userId
}
