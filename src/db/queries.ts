import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { decrypt, decryptOptional } from '@/lib/crypto'
import { allowances, profiles, timeoffs, users, type Profile, type Timeoff } from './schema'

/**
 * Sensitive columns are encrypted in the database, so plaintext exists only above
 * this layer. Everything here returns values the rest of the app can use directly.
 */

/** Vacation days come back as a number even though they are stored encrypted. */
export type Allowance = {
  id: string
  userId: string
  year: number
  days: number
}

function readProfile(row: Profile): Profile {
  return {
    ...row,
    fullName: decrypt(row.fullName),
    ciSeries: decrypt(row.ciSeries),
    ciNumber: decrypt(row.ciNumber),
    cnp: decrypt(row.cnp),
    city: decrypt(row.city),
    jobTitle: decrypt(row.jobTitle),
    signaturePng: decryptOptional(row.signaturePng),
    lastRecipient: decryptOptional(row.lastRecipient),
  }
}

export async function findProfile(userId: string): Promise<Profile | undefined> {
  const [profile] = await db().select().from(profiles).where(eq(profiles.userId, userId))
  return profile && readProfile(profile)
}

/** Absent when the user signed in before the app asked to send mail on their behalf. */
export async function findGoogleRefreshToken(userId: string): Promise<string | null> {
  const [row] = await db()
    .select({ token: users.googleRefreshToken })
    .from(users)
    .where(eq(users.id, userId))
  return decryptOptional(row?.token ?? null)
}

export async function findUserEmail(userId: string): Promise<string | null> {
  const [row] = await db().select({ email: users.email }).from(users).where(eq(users.id, userId))
  return row?.email ?? null
}

export async function listTimeoffs(userId: string): Promise<Timeoff[]> {
  return db()
    .select()
    .from(timeoffs)
    .where(eq(timeoffs.userId, userId))
    .orderBy(desc(timeoffs.startDate))
}

export async function findTimeoff(userId: string, id: string): Promise<Timeoff | undefined> {
  const [timeoff] = await db()
    .select()
    .from(timeoffs)
    .where(and(eq(timeoffs.userId, userId), eq(timeoffs.id, id)))
  return timeoff
}

export async function listAllowances(userId: string): Promise<Allowance[]> {
  const rows = await db()
    .select()
    .from(allowances)
    .where(eq(allowances.userId, userId))
    .orderBy(asc(allowances.year))

  return rows.map((row) => ({ ...row, days: Number(decrypt(row.days)) }))
}

/** Granted vacation days keyed by year, the shape the balance rules expect. */
export async function allowancesByYear(userId: string): Promise<Map<number, number>> {
  const rows = await listAllowances(userId)
  return new Map(rows.map((row) => [row.year, row.days]))
}
