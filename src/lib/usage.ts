import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { usageCounters } from '@/db/schema'

/**
 * How often one user may run each action per day (UTC). Each one renders a PDF
 * or calls Google on the user's behalf, against a quota the whole company shares.
 */
export const DAILY_LIMIT = 50

export type LimitedAction = 'email' | 'booking' | 'pdf'

export const LIMIT_REACHED = "You've reached today's limit for this. Try again tomorrow."

/**
 * Counts one use of the action today and says whether it is still within the
 * daily limit. The count goes up in a single statement, so requests sent at the
 * same moment cannot all slip under the limit.
 */
export async function allowAction(userId: string, action: LimitedAction): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10)
  const [row] = await db()
    .insert(usageCounters)
    .values({ userId, action, day, count: 1 })
    .onConflictDoUpdate({
      target: [usageCounters.userId, usageCounters.action, usageCounters.day],
      set: { count: sql`${usageCounters.count} + 1` },
    })
    .returning({ count: usageCounters.count })
  return row.count <= DAILY_LIMIT
}
