'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import { listTimeoffs, allowancesByYear } from '@/db/queries'
import { timeoffs } from '@/db/schema'
import { requireUserId } from '@/lib/session'
import { checkRequest } from '@/lib/validation'
import { calendarDate, invalid, type FormState } from './state'

const periodSchema = z.object({
  startDate: calendarDate,
  endDate: calendarDate,
  requestDate: calendarDate,
})

function refreshViews() {
  revalidatePath('/')
  revalidatePath('/calendar')
}

/** Runs the balance and overlap rules against everything the user has booked. */
async function reviewPeriod(
  userId: string,
  period: z.infer<typeof periodSchema>,
  excludeId?: string
) {
  const [existing, allowances] = await Promise.all([listTimeoffs(userId), allowancesByYear(userId)])

  return checkRequest({
    start: period.startDate,
    end: period.endDate,
    existing,
    allowances,
    excludeId,
  })
}

export async function createTimeoff(_state: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId()

  const parsed = periodSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)

  const check = await reviewPeriod(userId, parsed.data)
  if (!check.ok) return { error: check.message }

  await db()
    .insert(timeoffs)
    .values({ userId, ...parsed.data, workingDays: check.workingDays })

  refreshViews()
  redirect('/')
}

export async function updateTimeoff(_state: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId()

  const id = formData.get('id')
  if (typeof id !== 'string') return { error: 'Unknown time off.' }

  const parsed = periodSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)

  const check = await reviewPeriod(userId, parsed.data, id)
  if (!check.ok) return { error: check.message }

  const updated = await db()
    .update(timeoffs)
    .set({ ...parsed.data, workingDays: check.workingDays })
    .where(and(eq(timeoffs.id, id), eq(timeoffs.userId, userId)))
    .returning({ id: timeoffs.id })

  if (updated.length === 0) return { error: 'That time off no longer exists.' }

  refreshViews()
  redirect('/')
}

export async function deleteTimeoff(formData: FormData): Promise<void> {
  const userId = await requireUserId()

  const id = formData.get('id')
  if (typeof id !== 'string') return

  await db()
    .delete(timeoffs)
    .where(and(eq(timeoffs.id, id), eq(timeoffs.userId, userId)))

  refreshViews()
}
