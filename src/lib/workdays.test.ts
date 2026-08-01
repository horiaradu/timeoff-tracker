import { describe, expect, it } from 'vitest'
import { chargesByYear, holidaysInRange, isWorkingDay, workingDays } from './workdays'

describe('isWorkingDay', () => {
  it('excludes weekends', () => {
    expect(isWorkingDay('2026-03-13')).toBe(true) // Friday
    expect(isWorkingDay('2026-03-14')).toBe(false) // Saturday
    expect(isWorkingDay('2026-03-15')).toBe(false) // Sunday
    expect(isWorkingDay('2026-03-16')).toBe(true) // Monday
  })

  it('excludes legal holidays that fall on a weekday', () => {
    expect(isWorkingDay('2026-12-01')).toBe(false) // Ziua Nationala, a Tuesday
    expect(isWorkingDay('2026-04-13')).toBe(false) // A doua zi de Paste, a Monday
  })
})

describe('workingDays', () => {
  it('counts a plain working week', () => {
    expect(workingDays('2026-03-16', '2026-03-20')).toBe(5)
  })

  it('skips the weekend inside a longer range', () => {
    expect(workingDays('2026-03-16', '2026-03-27')).toBe(10)
  })

  it('skips holidays inside the range', () => {
    // Easter week 2026: Friday 10th and Monday 13th are holidays.
    expect(workingDays('2026-04-06', '2026-04-17')).toBe(8)
  })

  it('counts a single day', () => {
    expect(workingDays('2026-03-16', '2026-03-16')).toBe(1)
  })

  it('returns zero for a weekend-only range', () => {
    expect(workingDays('2026-03-14', '2026-03-15')).toBe(0)
  })

  it('returns zero when the range is inverted', () => {
    expect(workingDays('2026-03-20', '2026-03-16')).toBe(0)
  })
})

describe('chargesByYear', () => {
  it('keeps a single year in one bucket', () => {
    expect([...chargesByYear('2026-03-16', '2026-03-20')]).toStrictEqual([[2026, 5]])
  })

  it('splits a range crossing New Year', () => {
    // 28-31 Dec 2026 are Mon-Thu; in January 1, 6 and 7 are holidays and 2-3 a weekend.
    const charges = chargesByYear('2026-12-28', '2027-01-08')
    expect(charges.get(2026)).toBe(4)
    expect(charges.get(2027)).toBe(3) // 4, 5 and 8 Jan
  })
})

describe('holidaysInRange', () => {
  it('names the holidays that fall inside the range', () => {
    expect(holidaysInRange('2026-04-10', '2026-04-13')).toStrictEqual([
      { date: '2026-04-10', name: 'Vinerea Mare' },
      { date: '2026-04-12', name: 'Pastele' },
      { date: '2026-04-13', name: 'A doua zi de Paste' },
    ])
  })

  it('is empty for an ordinary week', () => {
    expect(holidaysInRange('2026-03-16', '2026-03-20')).toStrictEqual([])
  })
})
