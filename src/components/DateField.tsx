'use client'

import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { formatRomanian, fromLocalDate, toLocalDate, type DateOnly } from '@/lib/dates'
import { holidaysOf } from '@/lib/holidays'

type Props = {
  name: string
  label: string
  value: DateOnly
  onChange: (value: DateOnly) => void
  hint?: string
  /** Earliest day that can be picked. */
  min?: DateOnly
  /** Days that cannot be picked, such as time off already booked. */
  unavailable?: Set<DateOnly>
}

export function DateField({ name, label, value, onChange, hint, min, unavailable }: Props) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnOutside = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={container} className="relative">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>

      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="border-line hover:border-accent/60 focus:border-accent flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:outline-none"
      >
        <span>{formatRomanian(value)}</span>
        <span aria-hidden className="text-muted">
          &#9662;
        </span>
      </button>

      {hint && <span className="text-muted mt-1.5 block text-xs">{hint}</span>}

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="bg-bg border-line absolute z-20 mt-2 rounded-xl border p-2 shadow-lg"
        >
          <DayPicker
            mode="single"
            required
            ISOWeek
            showOutsideDays
            defaultMonth={toLocalDate(value)}
            selected={toLocalDate(value)}
            disabled={[
              ...(min ? [{ before: toLocalDate(min) }] : []),
              (date: Date) => unavailable?.has(fromLocalDate(date)) ?? false,
            ]}
            modifiers={{
              holiday: (date: Date) => holidaysOf(date.getFullYear()).has(fromLocalDate(date)),
            }}
            modifiersClassNames={{ holiday: 'is-holiday' }}
            onSelect={(picked) => {
              onChange(fromLocalDate(picked))
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
