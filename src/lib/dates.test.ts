import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysBetween,
  daysInMonth,
  eachDay,
  formatRomanian,
  isDateOnly,
  isWeekend,
  makeDate,
  weekday,
  year,
} from './dates'

describe('isDateOnly', () => {
  it('accepts a calendar date', () => {
    expect(isDateOnly('2026-04-12')).toBe(true)
  })

  it('rejects malformed or impossible dates', () => {
    for (const value of ['', '2026-4-12', '12.04.2026', '2026-02-30', '2026-13-01', 42, null]) {
      expect(isDateOnly(value), String(value)).toBe(false)
    }
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('handles leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('is unaffected by daylight saving switches', () => {
    // Romania moves the clock on the last Sunday of March and October.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
  })
})

describe('daysBetween', () => {
  it('counts forwards and backwards', () => {
    expect(daysBetween('2026-03-16', '2026-03-20')).toBe(4)
    expect(daysBetween('2026-03-20', '2026-03-16')).toBe(-4)
    expect(daysBetween('2026-03-16', '2026-03-16')).toBe(0)
  })

  it('spans a daylight saving change without drifting', () => {
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31)
    expect(daysBetween('2026-10-01', '2026-11-01')).toBe(31)
  })
})

describe('eachDay', () => {
  it('includes both ends', () => {
    expect(eachDay('2026-03-16', '2026-03-18')).toStrictEqual([
      '2026-03-16',
      '2026-03-17',
      '2026-03-18',
    ])
  })

  it('is empty when the range is inverted', () => {
    expect(eachDay('2026-03-18', '2026-03-16')).toStrictEqual([])
  })
})

describe('weekday', () => {
  it('reports Sunday as 0 and Saturday as 6', () => {
    expect(weekday('2026-03-15')).toBe(0)
    expect(weekday('2026-03-16')).toBe(1)
    expect(weekday('2026-03-21')).toBe(6)
  })

  it('marks only Saturday and Sunday as weekend', () => {
    expect(isWeekend('2026-03-20')).toBe(false)
    expect(isWeekend('2026-03-21')).toBe(true)
    expect(isWeekend('2026-03-22')).toBe(true)
  })
})

describe('daysInMonth', () => {
  it('knows the length of each month', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
  })
})

describe('formatting', () => {
  it('writes dates the Romanian way', () => {
    expect(formatRomanian('2026-04-12')).toBe('12.04.2026')
    expect(formatRomanian('2026-12-01')).toBe('01.12.2026')
  })

  it('pads makeDate and reads the year back', () => {
    expect(makeDate(2026, 4, 5)).toBe('2026-04-05')
    expect(year('2026-04-05')).toBe(2026)
  })
})
