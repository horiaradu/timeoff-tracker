import { eachDay, formatRomanian, today, year as yearOf, type DateOnly } from './dates'
import { chargesByYear, workingDays } from './workdays'

export type Period = {
  id: string
  startDate: DateOnly
  endDate: DateOnly
}

export type Request = {
  start: DateOnly
  end: DateOnly
  /** Every time off already booked by the user, including the one being edited. */
  existing: Period[]
  /** Vacation days granted per calendar year. */
  allowances: Map<number, number>
  /** The time off being edited, which must not count against itself. */
  excludeId?: string
  currentYear?: number
}

export type Check =
  { ok: true; workingDays: number; charges: Map<number, number> } | { ok: false; message: string }

export type Balance = {
  year: number
  used: number
  /** Days left over from earlier years. */
  carriedOver: number
  /** Null when the user has not set an allowance for that year yet. */
  granted: number | null
  remaining: number | null
}

/** Every calendar day covered by the given time off, for marking them in a calendar. */
export function bookedDays(periods: Period[]): Set<DateOnly> {
  const days = new Set<DateOnly>()
  for (const period of periods) {
    for (const day of eachDay(period.startDate, period.endDate)) days.add(day)
  }
  return days
}

/** Working days already booked, per calendar year. */
export function usedByYear(periods: Period[]): Map<number, number> {
  const used = new Map<number, number>()
  for (const period of periods) {
    for (const [year, days] of chargesByYear(period.startDate, period.endDate)) {
      used.set(year, (used.get(year) ?? 0) + days)
    }
  }
  return used
}

/**
 * Days left unused at the end of a year roll into the next one, chained from the
 * earliest year on record. A year still in progress carries nothing forward yet,
 * because how much of it goes unused is not known until it ends.
 */
function carriedInto(
  target: number,
  used: Map<number, number>,
  allowances: Map<number, number>,
  currentYear: number
): number {
  if (target > currentYear) return 0

  const finished = [...allowances.keys()].filter((year) => year < target).sort((a, b) => a - b)

  let carried = 0
  for (const year of finished) {
    const granted = allowances.get(year) ?? 0
    carried = Math.max(0, granted + carried - (used.get(year) ?? 0))
  }
  return carried
}

export function balanceFor(
  year: number,
  periods: Period[],
  allowances: Map<number, number>,
  currentYear: number = yearOf(today())
): Balance {
  const used = usedByYear(periods)
  const spent = used.get(year) ?? 0
  const granted = allowances.get(year) ?? null
  const carriedOver = carriedInto(year, used, allowances, currentYear)

  return {
    year,
    used: spent,
    carriedOver,
    granted,
    remaining: granted === null ? null : granted + carriedOver - spent,
  }
}

function overlapping(request: Request): Period | undefined {
  return request.existing.find(
    (period) =>
      period.id !== request.excludeId &&
      period.startDate <= request.end &&
      request.start <= period.endDate
  )
}

export function checkRequest(request: Request): Check {
  if (request.start > request.end) {
    return { ok: false, message: 'The end date cannot be before the start date.' }
  }

  const clash = overlapping(request)
  if (clash) {
    return {
      ok: false,
      message: `This overlaps time off you already booked (${formatRomanian(clash.startDate)} - ${formatRomanian(clash.endDate)}).`,
    }
  }

  const days = workingDays(request.start, request.end)
  if (days === 0) {
    return {
      ok: false,
      message:
        'That range has no working days. Weekends and legal holidays do not use up vacation.',
    }
  }

  const others = request.existing.filter((period) => period.id !== request.excludeId)
  const charges = chargesByYear(request.start, request.end)

  for (const [year, charge] of charges) {
    const balance = balanceFor(year, others, request.allowances, request.currentYear)

    if (balance.remaining === null) {
      return {
        ok: false,
        message: `No vacation allowance is set for ${year}. Add it in Settings first.`,
      }
    }

    if (charge > balance.remaining) {
      const carried = balance.carriedOver > 0 ? ` (${balance.carriedOver} carried over)` : ''
      return {
        ok: false,
        message: `This needs ${charge} day(s) from ${year} but only ${balance.remaining} remain${carried}.`,
      }
    }
  }

  return { ok: true, workingDays: days, charges }
}
