'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import type { FormState } from '@/actions/state'
import { isDateOnly, type DateOnly } from '@/lib/dates'
import { balanceFor, bookedDays, type Period } from '@/lib/validation'
import { chargesByYear, holidaysInRange, workingDays } from '@/lib/workdays'
import { DateField } from './DateField'
import { PeriodCalendar } from './PeriodCalendar'

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  /** Everything the user has booked, used to show what the request leaves behind. */
  existing: Period[]
  allowances: [number, number][]
  initial: { id?: string; startDate: DateOnly; endDate: DateOnly; requestDate: DateOnly }
  currentYear: number
  submitLabel: string
}

export function TimeoffForm({
  action,
  existing,
  allowances,
  initial,
  currentYear,
  submitLabel,
}: Props) {
  const [state, submit, pending] = useActionState(action, {})
  const [start, setStart] = useState(initial.startDate)
  const [end, setEnd] = useState(initial.endDate)
  const [requestDate, setRequestDate] = useState(initial.requestDate)

  const others = existing.filter((period) => period.id !== initial.id)
  const taken = bookedDays(others)
  const summary = summarise(start, end, others, new Map(allowances), currentYear)

  return (
    <form action={submit} className="space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid max-w-lg gap-4 sm:grid-cols-2">
        <DateField
          name="startDate"
          label="First day"
          value={start}
          unavailable={taken}
          onChange={(picked) => {
            setStart(picked)
            if (picked > end) setEnd(picked)
          }}
        />
        <DateField
          name="endDate"
          label="Last day"
          value={end}
          min={start}
          unavailable={taken}
          onChange={setEnd}
        />
      </div>

      <PeriodCalendar
        start={start}
        end={end}
        taken={taken}
        onChange={(from, to) => {
          setStart(from)
          setEnd(to)
        }}
      />

      <div className="max-w-xs">
        <DateField
          name="requestDate"
          label="Request date"
          value={requestDate}
          onChange={setRequestDate}
          hint="Printed as &ldquo;Data&rdquo; on the request."
        />
      </div>

      {summary && (
        <div className="max-w-lg rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/15">
          <p>
            Uses <span className="font-semibold">{summary.days}</span> working{' '}
            {summary.days === 1 ? 'day' : 'days'}.
          </p>
          {summary.perYear.map(({ year, charge, balance }) => (
            <p key={year} className="mt-1 text-black/60 dark:text-white/60">
              {balance.remaining === null ? (
                <>No allowance set for {year}.</>
              ) : (
                <>
                  {year}: {charge} of {balance.remaining} available
                  {balance.carriedOver > 0 && <> ({balance.carriedOver} carried over)</>}
                  {' → '}
                  {balance.remaining - charge} left afterwards
                </>
              )}
            </p>
          ))}
          {summary.holidays.length > 0 && (
            <p className="mt-2 text-black/60 dark:text-white/60">
              Not counted: {summary.holidays.map((holiday) => holiday.name).join(', ')}.
            </p>
          )}
        </div>
      )}

      {state.error && (
        <p
          role="alert"
          className="max-w-lg rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Saving...' : submitLabel}
        </button>
        <Link href="/" className="text-sm text-black/60 hover:underline dark:text-white/60">
          Cancel
        </Link>
      </div>
    </form>
  )
}

/** Mirrors the server rules so the user sees the cost before submitting. */
function summarise(
  start: string,
  end: string,
  others: Period[],
  allowances: Map<number, number>,
  currentYear: number
) {
  if (!isDateOnly(start) || !isDateOnly(end) || start > end) return null

  return {
    days: workingDays(start, end),
    holidays: holidaysInRange(start, end),
    perYear: [...chargesByYear(start, end)].map(([year, charge]) => ({
      year,
      charge,
      balance: balanceFor(year, others, allowances, currentYear),
    })),
  }
}
