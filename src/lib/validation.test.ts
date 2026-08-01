import { describe, expect, it } from 'vitest'
import { checkRequest, remainingIn, usedByYear, type Period } from './validation'

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

describe('remainingIn', () => {
  it('subtracts booked days from the allowance', () => {
    expect(remainingIn(2026, [booked('a', '2026-03-16', '2026-03-20')], allowances)).toBe(16)
  })

  it('is null when no allowance is set for the year', () => {
    expect(remainingIn(2027, [], allowances)).toBeNull()
  })
})

describe('checkRequest', () => {
  it('accepts a request within the allowance', () => {
    const check = checkRequest({
      start: '2026-03-16',
      end: '2026-03-20',
      existing: [],
      allowances,
    })
    expect(check).toStrictEqual({ ok: true, workingDays: 5, charges: new Map([[2026, 5]]) })
  })

  it('rejects an inverted range', () => {
    const check = checkRequest({
      start: '2026-03-20',
      end: '2026-03-16',
      existing: [],
      allowances,
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
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('of 21 remain'))
  })

  it('counts days already booked against the balance', () => {
    const existing = [booked('a', '2026-02-02', '2026-02-27')] // 20 working days
    const check = checkRequest({
      start: '2026-03-16',
      end: '2026-03-18',
      existing,
      allowances,
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('only 1 of 21 remain'))
  })

  it('rejects a year that has no allowance', () => {
    const check = checkRequest({
      start: '2027-03-15',
      end: '2027-03-19',
      existing: [],
      allowances,
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('2027'))
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
    })
    expect(check).toMatchObject({ ok: false })
    expect(check).toHaveProperty('message', expect.stringContaining('3 day(s) from 2027'))
  })
})
