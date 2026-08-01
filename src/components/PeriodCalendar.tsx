'use client'

import { DayPicker } from 'react-day-picker'
import { fromLocalDate, toLocalDate, type DateOnly } from '@/lib/dates'
import { holidaysOf } from '@/lib/holidays'

type Props = {
  start: DateOnly
  end: DateOnly
  onChange: (start: DateOnly, end: DateOnly) => void
  /** Leftmost month on show, owned by the form so the pickers can move it. */
  month: Date
  onMonthChange: (month: Date) => void
  /** Days belonging to other time off, which a new period may not cover. */
  taken: Set<DateOnly>
}

export function PeriodCalendar({ start, end, onChange, month, onMonthChange, taken }: Props) {
  return (
    <div className="border-line rounded-xl border p-3">
      <DayPicker
        mode="range"
        required
        ISOWeek
        excludeDisabled
        numberOfMonths={2}
        month={month}
        onMonthChange={onMonthChange}
        selected={{ from: toLocalDate(start), to: toLocalDate(end) }}
        disabled={(date: Date) => taken.has(fromLocalDate(date))}
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
      <p className="text-muted mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs">
        <span>Click a day to start the period, then click the last day.</span>
        <span className="text-holiday font-semibold">Legal holiday</span>
        <span className="line-through">Already booked, cannot be used</span>
      </p>
    </div>
  )
}
