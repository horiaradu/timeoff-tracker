import { eachDay, isWeekend, year, type DateOnly } from './dates'
import { holidaysOf, type Holiday } from './holidays'

/** A day only costs vacation allowance when it is neither a weekend nor a legal holiday. */
export function isWorkingDay(date: DateOnly): boolean {
  return !isWeekend(date) && !holidaysOf(year(date)).has(date)
}

export function workingDays(start: DateOnly, end: DateOnly): number {
  return eachDay(start, end).filter(isWorkingDay).length
}

/** Working days split by calendar year, so a range crossing New Year charges each year separately. */
export function chargesByYear(start: DateOnly, end: DateOnly): Map<number, number> {
  const charges = new Map<number, number>()
  for (const day of eachDay(start, end)) {
    if (!isWorkingDay(day)) continue
    const key = year(day)
    charges.set(key, (charges.get(key) ?? 0) + 1)
  }
  return charges
}

/** Legal holidays falling inside the range, for showing the user why days were not counted. */
export function holidaysInRange(start: DateOnly, end: DateOnly): Holiday[] {
  return eachDay(start, end)
    .map((date) => {
      const name = holidaysOf(year(date)).get(date)
      return name ? { date, name } : null
    })
    .filter((holiday): holiday is Holiday => holiday !== null)
}
