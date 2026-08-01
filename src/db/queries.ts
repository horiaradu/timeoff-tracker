import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import {
  allowances,
  profiles,
  timeoffs,
  type Allowance,
  type Profile,
  type Timeoff,
} from './schema'

export async function findProfile(userId: string): Promise<Profile | undefined> {
  const [profile] = await db().select().from(profiles).where(eq(profiles.userId, userId))
  return profile
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
  return db()
    .select()
    .from(allowances)
    .where(eq(allowances.userId, userId))
    .orderBy(asc(allowances.year))
}

/** Granted vacation days keyed by year, the shape the balance rules expect. */
export async function allowancesByYear(userId: string): Promise<Map<number, number>> {
  const rows = await listAllowances(userId)
  return new Map(rows.map((row) => [row.year, row.days]))
}
