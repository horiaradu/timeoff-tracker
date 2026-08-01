'use server'

import { signOut } from '@/auth'

export async function endSession(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}
