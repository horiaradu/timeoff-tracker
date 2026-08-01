import { describe, expect, it } from 'vitest'
import { outOfOffice, teamEntry } from './calendar'

describe('outOfOffice', () => {
  it('runs from the first midnight to the midnight after the last day', () => {
    // Google rejects an all-day out-of-office event, so this one is timed.
    const event = outOfOffice({ startDate: '2026-04-17', endDate: '2026-04-20' })
    expect(event.start.dateTime).toBe('2026-04-17T00:00:00')
    expect(event.end.dateTime).toBe('2026-04-21T00:00:00')
    expect(event.start.timeZone).toBe('Europe/Bucharest')
  })

  it('still covers a whole day when the leave is a single day', () => {
    const event = outOfOffice({ startDate: '2026-05-02', endDate: '2026-05-02' })
    expect(event.start.dateTime).toBe('2026-05-02T00:00:00')
    expect(event.end.dateTime).toBe('2026-05-03T00:00:00')
  })

  it('carries the fields Google requires of an out-of-office event', () => {
    const event = outOfOffice({ startDate: '2026-04-17', endDate: '2026-04-20' })
    expect(event.eventType).toBe('outOfOffice')
    expect(event.transparency).toBe('opaque')
    expect(event.outOfOfficeProperties.autoDeclineMode).toBe('declineNone')
  })

  it('crosses a month boundary correctly', () => {
    const event = outOfOffice({ startDate: '2026-06-29', endDate: '2026-06-30' })
    expect(event.end.dateTime).toBe('2026-07-01T00:00:00')
  })
})

describe('teamEntry', () => {
  it('is titled with the person and ends the day after, as all-day events do', () => {
    const event = teamEntry({ startDate: '2026-04-17', endDate: '2026-04-20' }, 'Ion Popescu')
    expect(event.summary).toBe('Ion Popescu - out of office')
    expect(event.start.date).toBe('2026-04-17')
    expect(event.end.date).toBe('2026-04-21')
  })

  it('spans two days for a single day of leave', () => {
    const event = teamEntry({ startDate: '2026-05-02', endDate: '2026-05-02' }, 'Ion Popescu')
    expect(event.start.date).toBe('2026-05-02')
    expect(event.end.date).toBe('2026-05-03')
  })

  it('leaves colleagues free rather than blocking their availability', () => {
    const event = teamEntry({ startDate: '2026-04-17', endDate: '2026-04-20' }, 'Ion Popescu')
    expect(event.transparency).toBe('transparent')
  })

  it('notes the period in the description', () => {
    const event = teamEntry({ startDate: '2026-04-17', endDate: '2026-04-20' }, 'Ion Popescu')
    expect(event.description).toBe('Concediu de odihna 17.04.2026 - 20.04.2026')
  })

  it('crosses a year boundary correctly', () => {
    const event = teamEntry({ startDate: '2026-12-28', endDate: '2026-12-31' }, 'Ion Popescu')
    expect(event.end.date).toBe('2027-01-01')
  })
})
