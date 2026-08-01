'use client'

import { useEffect, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { fromLocalDate, toLocalDate, type DateOnly } from '@/lib/dates'
import { holidaysOf } from '@/lib/holidays'

const MONTHS_SHOWN = 2

type Props = {
  start: DateOnly
  end: DateOnly
  onChange: (start: DateOnly, end: DateOnly) => void
  /** Days belonging to other time off, which a new period may not cover. */
  taken: Set<DateOnly>
}

const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth()

export function PeriodCalendar({ start, end, onChange, taken }: Props) {
  const [month, setMonth] = useState(() => toLocalDate(start))

  // Follow the pickers: if the chosen first day is off-screen, scroll to it.
  useEffect(() => {
    const target = toLocalDate(start)
    const first = monthIndex(month)
    if (monthIndex(target) < first || monthIndex(target) > first + MONTHS_SHOWN - 1) {
      setMonth(target)
    }
  }, [start, month])

  return (
    <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
      <DayPicker
        mode="range"
        required
        ISOWeek
        excludeDisabled
        numberOfMonths={MONTHS_SHOWN}
        month={month}
        onMonthChange={setMonth}
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
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-black/55 dark:text-white/55">
        <span>Click a day to start the period, then click the last day.</span>
        <span className="font-semibold text-amber-700 dark:text-amber-500">Legal holiday</span>
        <span className="line-through">Already booked, cannot be used</span>
      </p>
    </div>
  )
}
