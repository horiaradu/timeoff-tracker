'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import {
  allowancesByYear,
  findGoogleRefreshToken,
  findProfile,
  findTimeoff,
  listTimeoffs,
} from '@/db/queries'
import { timeoffs } from '@/db/schema'
import { removePeriod, syncPeriod, type EventIds, type Period } from '@/lib/calendar'
import { GoogleError } from '@/lib/google'
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

/**
 * Mirrors the period onto Google Calendar. The booking is already saved by this
 * point, so a calendar failure is reported rather than allowed to undo it.
 */
async function mirrorToCalendar(
  userId: string,
  timeoffId: string,
  period: Period,
  existing: EventIds
): Promise<string | null> {
  const [refreshToken, profile] = await Promise.all([
    findGoogleRefreshToken(userId),
    findProfile(userId),
  ])

  if (!refreshToken) {
    return 'Saved, but Google access is needed in Settings before the calendar can be updated.'
  }
  if (!profile) {
    return 'Saved, but your name is needed in Settings before it can go on the team calendar.'
  }

  try {
    const ids = await syncPeriod(refreshToken, period, profile.fullName, existing)
    await db().update(timeoffs).set(ids).where(eq(timeoffs.id, timeoffId))
    return null
  } catch (error) {
    if (error instanceof GoogleError)
      return `Saved, but the calendar was not updated. ${error.message}`
    throw error
  }
}

export async function createTimeoff(_state: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId()

  const parsed = periodSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)

  const check = await reviewPeriod(userId, parsed.data)
  if (!check.ok) return { error: check.message }

  const [created] = await db()
    .insert(timeoffs)
    .values({ userId, ...parsed.data, workingDays: check.workingDays })
    .returning({ id: timeoffs.id })

  const failure = await mirrorToCalendar(userId, created.id, parsed.data, {
    personalEventId: null,
    sharedEventId: null,
  })

  refreshViews()
  if (failure) return { error: failure }
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

  const [updated] = await db()
    .update(timeoffs)
    .set({ ...parsed.data, workingDays: check.workingDays })
    .where(and(eq(timeoffs.id, id), eq(timeoffs.userId, userId)))
    .returning({
      id: timeoffs.id,
      personalEventId: timeoffs.personalEventId,
      sharedEventId: timeoffs.sharedEventId,
    })

  if (!updated) return { error: 'That time off no longer exists.' }

  const failure = await mirrorToCalendar(userId, updated.id, parsed.data, updated)

  refreshViews()
  if (failure) return { error: failure }
  redirect('/')
}

export async function deleteTimeoff(formData: FormData): Promise<void> {
  const userId = await requireUserId()

  const id = formData.get('id')
  if (typeof id !== 'string') return

  const timeoff = await findTimeoff(userId, id)
  if (!timeoff) return

  // Clear the calendar first, while the event ids are still on record.
  const refreshToken = await findGoogleRefreshToken(userId)
  if (refreshToken) {
    try {
      await removePeriod(refreshToken, timeoff)
    } catch (error) {
      // A stranded calendar entry must not stop the booking being removed.
      if (!(error instanceof GoogleError)) throw error
    }
  }

  await db()
    .delete(timeoffs)
    .where(and(eq(timeoffs.id, id), eq(timeoffs.userId, userId)))

  refreshViews()
}
