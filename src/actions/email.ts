'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { findGoogleRefreshToken, findProfile, findTimeoff } from '@/db/queries'
import { profiles } from '@/db/schema'
import { formatPeriod } from '@/lib/dates'
import { MailError, sendMail } from '@/lib/gmail'
import { requireUserId } from '@/lib/session'
import { renderLeaveRequest } from '@/pdf/LeaveRequest'
import { invalid, type FormState } from './state'

const schema = z.object({
  id: z.string().uuid('Unknown time off.'),
  to: z.string().trim().toLowerCase().email('Enter a valid email address.'),
})

export type SendState = FormState & { sentTo?: string }

export async function emailRequest(_state: SendState, formData: FormData): Promise<SendState> {
  const userId = await requireUserId()

  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)

  const [timeoff, profile, refreshToken] = await Promise.all([
    findTimeoff(userId, parsed.data.id),
    findProfile(userId),
    findGoogleRefreshToken(userId),
  ])

  if (!timeoff) return { error: 'That time off no longer exists.' }
  if (!profile?.signaturePng) {
    return { error: 'Add your details and signature in Settings first.' }
  }
  if (!refreshToken) {
    return { error: 'Sign out and in again to let the app send mail from your account.' }
  }

  const period = formatPeriod(timeoff.startDate, timeoff.endDate)

  const pdf = await renderLeaveRequest({
    profile: {
      fullName: profile.fullName,
      ciSeries: profile.ciSeries,
      ciNumber: profile.ciNumber,
      cnp: profile.cnp,
      city: profile.city,
      jobTitle: profile.jobTitle,
      signaturePng: profile.signaturePng,
    },
    timeoff: {
      startDate: timeoff.startDate,
      endDate: timeoff.endDate,
      requestDate: timeoff.requestDate,
    },
  })

  try {
    await sendMail(refreshToken, {
      to: parsed.data.to,
      subject: `Cerere concediu ${period}`,
      text: `Atasat, cererea de concediu de odihna pentru perioada ${period}.`,
      attachment: {
        filename: `cerere-concediu-${timeoff.startDate}.pdf`,
        content: pdf.toString('base64'),
        contentType: 'application/pdf',
      },
    })
  } catch (error) {
    if (error instanceof MailError) return { error: error.message }
    throw error
  }

  await db()
    .update(profiles)
    .set({ lastRecipient: parsed.data.to })
    .where(eq(profiles.userId, userId))

  revalidatePath('/')
  return { sentTo: parsed.data.to }
}
