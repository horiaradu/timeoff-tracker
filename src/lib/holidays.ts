import { addDays, makeDate, type DateOnly } from './dates'

export type Holiday = {
  date: DateOnly
  name: string
}

/**
 * Orthodox Easter Sunday. Meeus' Julian algorithm gives the date in the Julian
 * calendar; the Gregorian date is 13 days later for any year in 1900-2099.
 */
export function orthodoxEaster(year: number): DateOnly {
  const a = year % 4
  const b = year % 7
  const c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31)
  const day = ((d + e + 114) % 31) + 1
  return addDays(makeDate(year, month, day), 13)
}

/** Boboteaza and Sfantul Ioan became legal holidays with Law 176/2023. */
const EPIPHANY_FROM_YEAR = 2024

/** Public holidays under art. 139 of the Romanian Labour Code. */
export function legalHolidays(year: number): Holiday[] {
  const easter = orthodoxEaster(year)

  const holidays: Holiday[] = [
    { date: makeDate(year, 1, 1), name: 'Anul Nou' },
    { date: makeDate(year, 1, 2), name: 'Anul Nou' },
    { date: makeDate(year, 1, 24), name: 'Unirea Principatelor Romane' },
    { date: addDays(easter, -2), name: 'Vinerea Mare' },
    { date: easter, name: 'Pastele' },
    { date: addDays(easter, 1), name: 'A doua zi de Paste' },
    { date: makeDate(year, 5, 1), name: 'Ziua Muncii' },
    { date: makeDate(year, 6, 1), name: 'Ziua Copilului' },
    { date: addDays(easter, 49), name: 'Rusaliile' },
    { date: addDays(easter, 50), name: 'A doua zi de Rusalii' },
    { date: makeDate(year, 8, 15), name: 'Adormirea Maicii Domnului' },
    { date: makeDate(year, 11, 30), name: 'Sfantul Andrei' },
    { date: makeDate(year, 12, 1), name: 'Ziua Nationala' },
    { date: makeDate(year, 12, 25), name: 'Craciunul' },
    { date: makeDate(year, 12, 26), name: 'Craciunul' },
  ]

  if (year >= EPIPHANY_FROM_YEAR) {
    holidays.push(
      { date: makeDate(year, 1, 6), name: 'Boboteaza' },
      { date: makeDate(year, 1, 7), name: 'Sfantul Ioan Botezatorul' }
    )
  }

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

const byYear = new Map<number, Map<DateOnly, string>>()

/** Holiday names of a year keyed by date, memoised since the rules never change. */
export function holidaysOf(year: number): Map<DateOnly, string> {
  let holidays = byYear.get(year)
  if (!holidays) {
    holidays = new Map(legalHolidays(year).map((holiday) => [holiday.date, holiday.name]))
    byYear.set(year, holidays)
  }
  return holidays
}
