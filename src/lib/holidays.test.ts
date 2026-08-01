import { describe, expect, it } from 'vitest'
import { legalHolidays, orthodoxEaster } from './holidays'

describe('orthodoxEaster', () => {
  it('matches the known Orthodox Easter Sundays', () => {
    expect(orthodoxEaster(2024)).toBe('2024-05-05')
    expect(orthodoxEaster(2025)).toBe('2025-04-20')
    expect(orthodoxEaster(2026)).toBe('2026-04-12')
    expect(orthodoxEaster(2027)).toBe('2027-05-02')
    expect(orthodoxEaster(2028)).toBe('2028-04-16')
  })

  it('always lands on a Sunday', () => {
    for (let year = 2020; year <= 2040; year++) {
      const easter = orthodoxEaster(year)
      expect(new Date(`${easter}T00:00:00Z`).getUTCDay(), `${year} (${easter})`).toBe(0)
    }
  })
})

describe('legalHolidays', () => {
  const datesOf = (year: number) => legalHolidays(year).map((holiday) => holiday.date)

  it('includes every fixed date', () => {
    const dates = datesOf(2026)
    for (const date of [
      '2026-01-01',
      '2026-01-02',
      '2026-01-24',
      '2026-05-01',
      '2026-06-01',
      '2026-08-15',
      '2026-11-30',
      '2026-12-01',
      '2026-12-25',
      '2026-12-26',
    ]) {
      expect(dates).toContain(date)
    }
  })

  it('places the movable feasts around Easter', () => {
    const dates = datesOf(2026)
    expect(dates).toContain('2026-04-10') // Vinerea Mare
    expect(dates).toContain('2026-04-12') // Pastele
    expect(dates).toContain('2026-04-13') // A doua zi de Paste
    expect(dates).toContain('2026-05-31') // Rusaliile
    expect(dates).toContain('2026-06-01') // A doua zi de Rusalii
  })

  it('counts Boboteaza and Sfantul Ioan only from 2024', () => {
    expect(datesOf(2023)).not.toContain('2023-01-06')
    expect(datesOf(2023)).not.toContain('2023-01-07')
    expect(datesOf(2024)).toContain('2024-01-06')
    expect(datesOf(2024)).toContain('2024-01-07')
  })

  it('returns the days in chronological order', () => {
    const dates = datesOf(2026)
    expect(dates).toStrictEqual([...dates].sort())
  })
})
