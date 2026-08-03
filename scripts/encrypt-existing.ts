/**
 * One-off: encrypts rows written before the sensitive columns were encrypted.
 *
 * Safe to run more than once — a value already encrypted is left alone. Run with
 * `npx tsx scripts/encrypt-existing.ts`, adding `--apply` to actually write.
 */
import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { encrypt, isEncrypted } from '../src/lib/crypto'

config({ path: '.env.local', quiet: true })

const APPLY = process.argv.includes('--apply')
const sql = neon(process.env.DATABASE_URL!)

const PROFILE_COLUMNS = [
  'full_name',
  'ci_series',
  'ci_number',
  'cnp',
  'city',
  'job_title',
  'signature_png',
  'last_recipient',
] as const

type Row = Record<string, string | null>

/** Returns the columns of a row that still hold plain text. */
function pending(row: Row, columns: readonly string[]): string[] {
  return columns.filter((column) => {
    const value = row[column]
    return typeof value === 'string' && !isEncrypted(value)
  })
}

/** Encrypts a value only if it is still plain, so a rerun changes nothing. */
function once(value: string | null): string | null {
  if (value === null || isEncrypted(value)) return value
  return encrypt(value)
}

async function encryptProfiles() {
  const rows = (await sql`select * from profiles`) as Row[]
  let touched = 0

  for (const row of rows) {
    const columns = pending(row, PROFILE_COLUMNS)
    if (columns.length === 0) continue

    touched++
    console.log(`profile ${row.user_id}: ${columns.join(', ')}`)
    if (!APPLY) continue

    // One statement with fixed column names; already-encrypted values pass through.
    await sql`
      update profiles set
        full_name = ${once(row.full_name)},
        ci_series = ${once(row.ci_series)},
        ci_number = ${once(row.ci_number)},
        cnp = ${once(row.cnp)},
        city = ${once(row.city)},
        job_title = ${once(row.job_title)},
        signature_png = ${once(row.signature_png)},
        last_recipient = ${once(row.last_recipient)}
      where user_id = ${row.user_id}`
  }

  console.log(`profiles: ${touched} of ${rows.length} needed encrypting`)
}

async function encryptAllowances() {
  // Still an integer column until migration 0003 runs, so the value arrives as a number.
  const rows = (await sql`select id, days from allowances`) as Record<string, unknown>[]

  const stale = rows
    .filter((row) => row.days !== null)
    .map((row) => ({ id: row.id as string, days: String(row.days) }))
    .filter((row) => !isEncrypted(row.days))

  for (const row of stale) {
    console.log(`allowance ${row.id}: days = ${row.days}`)
    if (!APPLY) continue
    await sql`update allowances set days = ${encrypt(row.days)} where id = ${row.id}`
  }

  console.log(`allowances: ${stale.length} of ${rows.length} needed encrypting`)
}

async function encryptRefreshTokens() {
  const rows = (await sql`select id, email, google_refresh_token from users`) as Row[]
  const stale = rows.filter(
    (row) => row.google_refresh_token !== null && !isEncrypted(row.google_refresh_token)
  )

  for (const row of stale) {
    console.log(`user ${row.email}: google_refresh_token`)
    if (!APPLY) continue
    const value = encrypt(row.google_refresh_token as string)
    await sql`update users set google_refresh_token = ${value} where id = ${row.id}`
  }

  console.log(`users: ${stale.length} of ${rows.length} needed encrypting`)
}

async function main() {
  console.log(APPLY ? 'Encrypting.\n' : 'Dry run, nothing will be written. Add --apply.\n')
  await encryptProfiles()
  await encryptAllowances()
  await encryptRefreshTokens()
  console.log(APPLY ? '\nDone.' : '\nNothing written.')
}

main().catch((error) => {
  console.error('FAILED:', error.message)
  process.exit(1)
})
