'use client'

import { DayPicker } from 'react-day-picker'
import { eachDay, fromLocalDate, toLocalDate, type DateOnly } from '@/lib/dates'
import { holidaysOf } from '@/lib/holidays'
import type { Period } from '@/lib/validation'

type Props = {
  start: DateOnly
  end: DateOnly
  onChange: (start: DateOnly, end: DateOnly) => void
  /** Time off already booked, shown so the period can be placed around it. */
  booked: Period[]
}

export function PeriodCalendar({ start, end, onChange, booked }: Props) {
  const taken = new Set<DateOnly>()
  for (const period of booked) {
    for (const day of eachDay(period.startDate, period.endDate)) taken.add(day)
  }

  return (
    <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
      <DayPicker
        mode="range"
        required
        ISOWeek
        numberOfMonths={2}
        defaultMonth={toLocalDate(start)}
        selected={{ from: toLocalDate(start), to: toLocalDate(end) }}
        onSelect={(range) => {
          if (!range?.from) return
          onChange(fromLocalDate(range.from), fromLocalDate(range.to ?? range.from))
        }}
        modifiers={{
          holiday: (date: Date) => holidaysOf(date.getFullYear()).has(fromLocalDate(date)),
          booked: (date: Date) => taken.has(fromLocalDate(date)),
        }}
        modifiersClassNames={{ holiday: 'is-holiday', booked: 'is-booked' }}
      />
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-black/55 dark:text-white/55">
        <span>Click a day to start the period, then click the last day.</span>
        <span className="font-semibold text-amber-700 dark:text-amber-500">Legal holiday</span>
        <span className="line-through">Already booked</span>
      </p>
    </div>
  )
}
