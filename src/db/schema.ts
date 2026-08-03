import { relations, sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  /** Lets the app send the request from the user's own mailbox. */
  googleRefreshToken: text('google_refresh_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** The personal details printed on the leave request. */
export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  ciSeries: text('ci_series').notNull(),
  ciNumber: text('ci_number').notNull(),
  cnp: text('cnp').notNull(),
  city: text('city').notNull(),
  jobTitle: text('job_title').notNull(),
  /** PNG data URL drawn on the settings page; absent until the user signs once. */
  signaturePng: text('signature_png'),
  /** Whoever the request was last emailed to, offered again next time. */
  lastRecipient: text('last_recipient'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Vacation days granted for one calendar year. */
export const allowances = pgTable(
  'allowances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    /** Encrypted, so the range is enforced in the app rather than by the database. */
    days: text('days').notNull(),
  },
  (table) => [
    unique('allowances_user_year').on(table.userId, table.year),
    check('allowances_year_range', sql`${table.year} between 2000 and 2100`),
  ]
)

export const timeoffs = pgTable(
  'timeoffs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    /** Days charged to the allowance, excluding weekends and legal holidays. */
    workingDays: integer('working_days').notNull(),
    /** Printed as "Data:" on the request. */
    requestDate: date('request_date').notNull(),
    /** Out-of-office event on the user's own calendar; absent when never synced. */
    personalEventId: text('personal_event_id'),
    /** The matching entry on the team calendar. */
    sharedEventId: text('shared_event_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('timeoffs_user_start').on(table.userId, table.startDate),
    check('timeoffs_period_order', sql`${table.startDate} <= ${table.endDate}`),
  ]
)

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  allowances: many(allowances),
  timeoffs: many(timeoffs),
}))

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}))

export const allowancesRelations = relations(allowances, ({ one }) => ({
  user: one(users, { fields: [allowances.userId], references: [users.id] }),
}))

export const timeoffsRelations = relations(timeoffs, ({ one }) => ({
  user: one(users, { fields: [timeoffs.userId], references: [users.id] }),
}))

export type User = typeof users.$inferSelect
export type Profile = typeof profiles.$inferSelect
export type Allowance = typeof allowances.$inferSelect
export type Timeoff = typeof timeoffs.$inferSelect
