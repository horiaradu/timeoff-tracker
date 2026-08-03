'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { encrypt } from '@/lib/crypto'
import { allowances, profiles } from '@/db/schema'
import { requireUserId } from '@/lib/session'
import { invalid, type FormState } from './state'

/** Comfortably fits a signature drawn on the settings page, without bloating the row. */
const SIGNATURE_LIMIT = 200_000

const trimmed = (max: number) => z.string().trim().min(1, 'Required.').max(max, 'Too long.')

const profileSchema = z.object({
  fullName: trimmed(120),
  ciSeries: trimmed(10),
  ciNumber: trimmed(20),
  cnp: z
    .string()
    .trim()
    .regex(/^\d{13}$/, 'A CNP has 13 digits.'),
  city: trimmed(80),
  jobTitle: trimmed(80),
  signaturePng: z
    .string()
    .max(SIGNATURE_LIMIT, 'The signature drawing is too large.')
    .refine(
      (value) => value === '' || value.startsWith('data:image/png;base64,'),
      'The signature must be a PNG drawing.'
    )
    .optional()
    .default(''),
})

export async function saveProfile(_state: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId()

  const parsed = profileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)

  const { signaturePng, ...plain } = parsed.data
  // An empty drawing means the user did not touch the pad, so keep the stored one.
  const signature = signaturePng === '' ? undefined : encrypt(signaturePng)

  const details = {
    fullName: encrypt(plain.fullName),
    ciSeries: encrypt(plain.ciSeries),
    ciNumber: encrypt(plain.ciNumber),
    cnp: encrypt(plain.cnp),
    city: encrypt(plain.city),
    jobTitle: encrypt(plain.jobTitle),
  }

  await db()
    .insert(profiles)
    .values({ userId, ...details, signaturePng: signature ?? null })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { ...details, ...(signature ? { signaturePng: signature } : {}), updatedAt: new Date() },
    })

  revalidatePath('/settings')
  revalidatePath('/')
  return { error: undefined }
}

const allowanceSchema = z.object({
  year: z.coerce.number().int().min(2000, 'Year out of range.').max(2100, 'Year out of range.'),
  days: z.coerce.number().int().min(0, 'Cannot be negative.').max(365, 'That is too many days.'),
})

export async function saveAllowance(_state: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId()

  const parsed = allowanceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)

  const days = encrypt(String(parsed.data.days))

  await db()
    .insert(allowances)
    .values({ userId, year: parsed.data.year, days })
    .onConflictDoUpdate({
      target: [allowances.userId, allowances.year],
      set: { days },
    })

  revalidatePath('/settings')
  revalidatePath('/')
  return { error: undefined }
}
