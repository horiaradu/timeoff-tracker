import { describe, expect, it } from 'vitest'
import { balanceFor, checkRequest, usedByYear, type Period } from './validation'

const allowances = new Map([[2026, 21]])

const booked = (id: string, startDate: string, endDate: string): Period => ({
  id,
  startDate,
  endDate,
})

describe('usedByYear', () => {
  it('adds up the working days of every period', () => {
    const used = usedByYear([
      booked('a', '2026-03-16', '2026-03-20'),
      booked('b', '2026-06-15', '2026-06-16'),
    ])
    expect(used.get(2026)).toBe(7)
  })

  it('attributes a period crossing New Year to both years', () => {
    const used = usedByYear([booked('a', '2026-12-28', '2027-01-08')])
    expect(used.get(2026)).toBe(4)
    expect(used.get(2027)).toBe(3)
  })
})

describe('balanceFor', () => {
  it('subtracts booked days from the allowance', () => {
    expect(
      balanceFor(2026, [booked('a', '2026-03-16', '2026-03-20')], allowances, 2026)
    ).toStrictEqual({
      year: 2026,
      used: 5,
      carriedOver: 0,
      granted: 21,
      remaining: 16,
    })
  })

  it('reports no allowance set for the year', () => {
    expect(balanceFor(2027, [], allowances, 2026)).toStrictEqual({
      year: 2027,
      used: 0,
      carriedOver: 0,
      granted: null,
      remaining: null,
    })
  })
})

describe('balanceFor carry over', () => {
  const twoYears = new Map([
    [2025, 20],
    [2026, 21],
  ])

  it('rolls days left over from a finished year into the next one', () => {
    // 5 of the 20 days granted for 2025 were used, so 15 carry over.
    const balance = balanceFor(2026, [booked('a', '2025-03-17', '2025-03-21')], twoYears, 2026)
    expect(balance).toStrictEqual({
      year: 2026,
      used: 0,
      carriedOver: 15,
      granted: 21,
      remaining: 36,
    })
  })

  it('chains the carry over through several finished years', () => {
    const threeYears = new Map([
      [2024, 20],
      [2025, 20],
      [2026, 21],
    ])
    expect(balanceFor(2026, [], threeYears, 2026).carriedOver).toBe(40)
  })

  it('never carries a negative balance forward', () => {
    // A year with no allowance set but days booked must not create a debt.
    const balance = balanceFor(
      2026,
      [booked('a', '2025-03-17', '2025-03-21')],
      new Map([[2026, 21]]),
      2026
    )
    expect(balance.carriedOver).toBe(0)
  })

  it('carries nothing forward from a year that is still running', () => {
    // Standing in 2025, the days left in 2025 are not yet known to be unused.
    expect(balanceFor(2026, [], twoYears, 2025).carriedOver).toBe(0)
  })

  it('gives a past year only what came before it', () => {
    expect(balanceFor(2025, [], twoYears, 2026).carriedOver).toBe(0)
  })
})

describe('checkRequest', () => {
  it('accepts a request within the allowance', () => {
    const check = checkRequest({
      start: '2026-03-16',
      end: '2026-03-20',
      existing: [],
      allowances,
      currentYear: 2026,
    })
    expect(check).toStrictEqual({ ok: true, workingDays: 5, charges: new Map([[2026, 5]]) })
  })

  it('rejects an inverted range', () => {
    const check = checkRequest({
      start: '2026-03-20',
      end: '2026-03-16',
      existing: [],
      allowances,
      currentYear: 2026,
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('end date'))
  })

  it('rejects a range made only of weekends and holidays', () => {
    const check = checkRequest({
      start: '2026-04-11',
      end: '2026-04-13',
      existing: [],
      allowances,
      currentYear: 2026,
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('no working days'))
  })

  it('rejects a range overlapping an existing time off', () => {
    const check = checkRequest({
      start: '2026-03-18',
      end: '2026-03-25',
      existing: [booked('a', '2026-03-16', '2026-03-20')],
      allowances,
      currentYear: 2026,
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('16.03.2026 - 20.03.2026'))
  })

  it('allows editing a time off without clashing with itself', () => {
    const check = checkRequest({
      start: '2026-03-16',
      end: '2026-03-19',
      existing: [booked('a', '2026-03-16', '2026-03-20')],
      allowances,
      currentYear: 2026,
      excludeId: 'a',
    })
    expect(check).toMatchObject({ ok: true, workingDays: 4 })
  })

  it('frees up the days of the time off being edited', () => {
    const check = checkRequest({
      start: '2026-06-01',
      end: '2026-06-30',
      existing: [booked('a', '2026-06-01', '2026-06-30')],
      allowances: new Map([[2026, 21]]),
      currentYear: 2026,
      excludeId: 'a',
    })
    expect(check).toMatchObject({ ok: true })
  })

  it('rejects a request larger than the remaining balance', () => {
    const check = checkRequest({
      start: '2026-06-01',
      end: '2026-07-31',
      existing: [],
      allowances,
      currentYear: 2026,
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('only 21 remain'))
  })

  it('counts days already booked against the balance', () => {
    const existing = [booked('a', '2026-02-02', '2026-02-27')] // 20 working days
    const check = checkRequest({
      start: '2026-03-16',
      end: '2026-03-18',
      existing,
      allowances,
      currentYear: 2026,
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('only 1 remain'))
  })

  it('rejects a year that has no allowance', () => {
    const check = checkRequest({
      start: '2027-03-15',
      end: '2027-03-19',
      existing: [],
      allowances,
      currentYear: 2026,
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('2027'))
  })

  it('lets carried over days pay for a request the year alone could not', () => {
    const check = checkRequest({
      start: '2026-06-01',
      end: '2026-07-10',
      existing: [],
      allowances: new Map([
        [2025, 20],
        [2026, 21],
      ]),
      currentYear: 2026,
    })
    // 29 working days, more than the 21 granted for 2026 but within 21 + 20 carried over.
    expect(check).toMatchObject({ ok: true, workingDays: 29 })
  })

  it('mentions the carry over when the balance still falls short', () => {
    const check = checkRequest({
      start: '2026-01-05',
      end: '2026-12-31',
      existing: [],
      allowances: new Map([
        [2025, 20],
        [2026, 21],
      ]),
      currentYear: 2026,
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('20 carried over'))
  })

  it('checks each year of a request crossing New Year separately', () => {
    const check = checkRequest({
      start: '2026-12-28',
      end: '2027-01-08',
      existing: [],
      allowances: new Map([
        [2026, 21],
        [2027, 2],
      ]),
      currentYear: 2026,
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('3 day(s) from 2027'))
  })
})
