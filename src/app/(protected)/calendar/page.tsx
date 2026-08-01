import Link from 'next/link'
import { listTimeoffs } from '@/db/queries'
import {
  addDays,
  daysInMonth,
  eachDay,
  isWeekend,
  makeDate,
  today,
  weekday,
  year as yearOf,
  type DateOnly,
} from '@/lib/dates'
import { holidaysOf } from '@/lib/holidays'
import { requireUserId } from '@/lib/session'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** `YYYY-MM` from the query string, falling back to the current month. */
function readMonth(value: string | undefined): { year: number; month: number } {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) return { year, month }
  }
  const now = today()
  return { year: Number(now.slice(0, 4)), month: Number(now.slice(5, 7)) }
}

function shiftMonth(year: number, month: number, by: number): string {
  const shifted = month - 1 + by
  const targetYear = year + Math.floor(shifted / 12)
  const targetMonth = ((shifted % 12) + 12) % 12
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const userId = await requireUserId()
  const [{ month: monthParam }, timeoffs] = await Promise.all([searchParams, listTimeoffs(userId)])

  const { year, month } = readMonth(monthParam)
  const booked = new Set<DateOnly>()
  for (const timeoff of timeoffs) {
    for (const day of eachDay(timeoff.startDate, timeoff.endDate)) booked.add(day)
  }

  // Whole weeks, Monday first, padded with the tail of the neighbouring months.
  const first = makeDate(year, month, 1)
  const total = daysInMonth(year, month)
  const leading = (weekday(first) + 6) % 7
  const trailing = (7 - ((leading + total) % 7)) % 7
  const cells = eachDay(addDays(first, -leading), addDays(first, total - 1 + trailing))
  const now = today()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {MONTH_NAMES[month - 1]} {year}
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/calendar?month=${shiftMonth(year, month, -1)}`}
            className="border-line hover:bg-surface rounded-lg border px-3 py-1.5 transition-colors"
          >
            Previous
          </Link>
          <Link
            href="/calendar"
            className="border-line hover:bg-surface rounded-lg border px-3 py-1.5 transition-colors"
          >
            Today
          </Link>
          <Link
            href={`/calendar?month=${shiftMonth(year, month, 1)}`}
            className="border-line hover:bg-surface rounded-lg border px-3 py-1.5 transition-colors"
          >
            Next
          </Link>
        </div>
      </div>

      <div className="border-line bg-line grid grid-cols-7 gap-px overflow-hidden rounded-lg border">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-bg text-muted px-2 py-2 text-center text-xs font-medium">
            {label}
          </div>
        ))}

        {cells.map((date) => {
          const inMonth = date.slice(0, 7) === `${year}-${String(month).padStart(2, '0')}`
          const holiday = holidaysOf(yearOf(date)).get(date)
          const isBooked = booked.has(date)

          return (
            <div
              key={date}
              className={[
                'bg-bg min-h-20 px-2 py-1.5 text-sm',
                inMonth ? '' : 'opacity-35',
                isWeekend(date) ? 'bg-weekend' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  date === now ? 'bg-accent text-accent-ink font-semibold' : '',
                ].join(' ')}
              >
                {Number(date.slice(8, 10))}
              </span>
              {isBooked && (
                <span className="bg-booked text-booked-ink mt-1 block rounded px-1.5 py-0.5 text-[11px] font-medium">
                  Time off
                </span>
              )}
              {holiday && (
                <span className="text-holiday mt-1 block text-[11px] leading-tight">{holiday}</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-muted flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-booked h-3 w-3 rounded" /> Your time off
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-holiday h-3 w-3 rounded" /> Legal holiday
        </span>
      </div>
    </div>
  )
}
