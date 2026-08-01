import { addDays, formatRomanian, type DateOnly } from './dates'
import { accessTokenFrom, callGoogle, GoogleError } from './google'

const API = 'https://www.googleapis.com/calendar/v3/calendars'

/** The company calendar everyone's absences show up on. */
const TEAM_CALENDAR = 'c_phdi3scu7vmjlkg4to9iqa26v0@group.calendar.google.com'

const TIME_ZONE = 'Europe/Bucharest'

export type Period = {
  startDate: DateOnly
  endDate: DateOnly
}

export type EventIds = {
  personalEventId: string | null
  sharedEventId: string | null
}

function eventsUrl(calendarId: string, eventId?: string): string {
  const base = `${API}/${encodeURIComponent(calendarId)}/events`
  return eventId ? `${base}/${encodeURIComponent(eventId)}` : base
}

/**
 * Google refuses an all-day out-of-office event, so the user's own calendar gets
 * a timed one running from midnight to midnight after the last day.
 */
export function outOfOffice(period: Period) {
  return {
    eventType: 'outOfOffice',
    transparency: 'opaque',
    summary: 'Concediu de odihna',
    start: { dateTime: `${period.startDate}T00:00:00`, timeZone: TIME_ZONE },
    end: { dateTime: `${addDays(period.endDate, 1)}T00:00:00`, timeZone: TIME_ZONE },
    outOfOfficeProperties: { autoDeclineMode: 'declineNone' },
  }
}

/** All-day on the team calendar, where `end` is the day after the last one. */
export function teamEntry(period: Period, fullName: string) {
  return {
    summary: `${fullName} - out of office`,
    description: `Concediu de odihna ${formatRomanian(period.startDate)} - ${formatRomanian(period.endDate)}`,
    transparency: 'transparent',
    start: { date: period.startDate },
    end: { date: addDays(period.endDate, 1) },
  }
}

/** Patches the event when it is still there, otherwise makes a new one. */
async function upsert(
  accessToken: string,
  calendarId: string,
  eventId: string | null,
  body: unknown
): Promise<string> {
  if (eventId) {
    const patched = await callGoogle(accessToken, 'PATCH', eventsUrl(calendarId, eventId), body)
    if (patched.ok) return eventId
    // Anything other than a vanished event is a real problem.
    if (patched.status !== 404 && patched.status !== 410) {
      throw new GoogleError(describe(calendarId, patched.status, patched.body))
    }
  }

  const created = await callGoogle(accessToken, 'POST', eventsUrl(calendarId), body)
  if (!created.ok) throw new GoogleError(describe(calendarId, created.status, created.body))

  const { id } = JSON.parse(created.body) as { id?: string }
  if (!id) throw new GoogleError('Google Calendar returned an event without an id.')
  return id
}

function describe(calendarId: string, status: number, body: string): string {
  const where = calendarId === 'primary' ? 'your calendar' : 'the team calendar'
  if (status === 403) return `No permission to write to ${where}.`
  if (status === 404) return `${where} was not found.`
  return `Google Calendar refused the change to ${where} (${status}). ${body.slice(0, 160)}`
}

/** Creates or moves both events, returning the ids to store against the time off. */
export async function syncPeriod(
  refreshToken: string,
  period: Period,
  fullName: string,
  existing: EventIds
): Promise<EventIds> {
  const accessToken = await accessTokenFrom(refreshToken)

  return {
    personalEventId: await upsert(
      accessToken,
      'primary',
      existing.personalEventId,
      outOfOffice(period)
    ),
    sharedEventId: await upsert(
      accessToken,
      TEAM_CALENDAR,
      existing.sharedEventId,
      teamEntry(period, fullName)
    ),
  }
}

/** Best effort: an event already gone is the outcome we wanted anyway. */
export async function removePeriod(refreshToken: string, ids: EventIds): Promise<void> {
  const accessToken = await accessTokenFrom(refreshToken)

  const removals: [string, string | null][] = [
    ['primary', ids.personalEventId],
    [TEAM_CALENDAR, ids.sharedEventId],
  ]

  for (const [calendarId, eventId] of removals) {
    if (!eventId) continue
    await callGoogle(accessToken, 'DELETE', eventsUrl(calendarId, eventId))
  }
}
