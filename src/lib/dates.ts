/**
 * Calendar days without time or timezone. A `DateOnly` is always `YYYY-MM-DD`,
 * matching how Postgres stores a `date`. All arithmetic goes through UTC so a
 * day never shifts because of the machine's local offset.
 */
export type DateOnly = string

const PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isDateOnly(value: unknown): value is DateOnly {
  if (typeof value !== 'string' || !PATTERN.test(value)) return false
  return toUtc(value) !== null
}

function toUtc(date: DateOnly): Date | null {
  const [year, month, day] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  const roundTrips =
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  return roundTrips ? utc : null
}

function utcOf(date: DateOnly): Date {
  const utc = toUtc(date)
  if (!utc) throw new Error(`Not a calendar date: ${date}`)
  return utc
}

function fromUtc(utc: Date): DateOnly {
  return utc.toISOString().slice(0, 10)
}

export function year(date: DateOnly): number {
  return utcOf(date).getUTCFullYear()
}

/** 0 = Sunday, 6 = Saturday. */
export function weekday(date: DateOnly): number {
  return utcOf(date).getUTCDay()
}

export function isWeekend(date: DateOnly): boolean {
  const day = weekday(date)
  return day === 0 || day === 6
}

export function addDays(date: DateOnly, days: number): DateOnly {
  const utc = utcOf(date)
  utc.setUTCDate(utc.getUTCDate() + days)
  return fromUtc(utc)
}

export function daysBetween(start: DateOnly, end: DateOnly): number {
  const ms = utcOf(end).getTime() - utcOf(start).getTime()
  return Math.round(ms / 86_400_000)
}

/** Every day from `start` to `end`, both included. Empty when `start` is after `end`. */
export function eachDay(start: DateOnly, end: DateOnly): DateOnly[] {
  const days: DateOnly[] = []
  for (let day = start; daysBetween(day, end) >= 0; day = addDays(day, 1)) {
    days.push(day)
  }
  return days
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function makeDate(year: number, month: number, day: number): DateOnly {
  const padded = (value: number) => String(value).padStart(2, '0')
  return `${String(year).padStart(4, '0')}-${padded(month)}-${padded(day)}`
}

export function today(): DateOnly {
  const now = new Date()
  return makeDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/**
 * Bridges to calendar widgets that speak `Date`. Both directions use the local
 * midnight of the day, so a date survives the round trip in any timezone.
 */
export function toLocalDate(date: DateOnly): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function fromLocalDate(date: Date): DateOnly {
  return makeDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

/** The `dd.MM.yyyy` form used across the UI and in the generated request. */
export function formatRomanian(date: DateOnly): string {
  const [y, m, d] = date.split('-')
  return `${d}.${m}.${y}`
}
