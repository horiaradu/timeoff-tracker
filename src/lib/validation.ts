import { formatRomanian, type DateOnly } from './dates'
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
}

export type Check =
  { ok: true; workingDays: number; charges: Map<number, number> } | { ok: false; message: string }

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

export type Balance = {
  year: number
  used: number
  /** Null when the user has not set an allowance for that year yet. */
  granted: number | null
  remaining: number | null
}

export function balanceFor(
  year: number,
  periods: Period[],
  allowances: Map<number, number>
): Balance {
  const used = usedByYear(periods).get(year) ?? 0
  const granted = allowances.get(year) ?? null
  return { year, used, granted, remaining: granted === null ? null : granted - used }
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
  const used = usedByYear(others)
  const charges = chargesByYear(request.start, request.end)

  for (const [year, charge] of charges) {
    const granted = request.allowances.get(year)
    if (granted === undefined) {
      return {
        ok: false,
        message: `No vacation allowance is set for ${year}. Add it in Settings first.`,
      }
    }
    const remaining = granted - (used.get(year) ?? 0)
    if (charge > remaining) {
      return {
        ok: false,
        message: `This needs ${charge} day(s) from ${year} but only ${remaining} of ${granted} remain.`,
      }
    }
  }

  return { ok: true, workingDays: days, charges }
}
