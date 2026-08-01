'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import type { FormState } from '@/actions/state'
import { isDateOnly, toLocalDate, type DateOnly } from '@/lib/dates'
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
  const [month, setMonth] = useState(() => toLocalDate(initial.startDate))

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
            setMonth(toLocalDate(picked))
          }}
        />
        <DateField
          name="endDate"
          label="Last day"
          value={end}
          min={start}
          unavailable={taken}
          onChange={(picked) => {
            setEnd(picked)
            setMonth(toLocalDate(picked))
          }}
        />
      </div>

      <PeriodCalendar
        start={start}
        end={end}
        taken={taken}
        month={month}
        onMonthChange={setMonth}
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
        <div className="border-line max-w-lg rounded-lg border px-4 py-3 text-sm">
          <p>
            Uses <span className="font-semibold">{summary.days}</span> working{' '}
            {summary.days === 1 ? 'day' : 'days'}.
          </p>
          {summary.perYear.map(({ year, charge, balance }) => (
            <p key={year} className="text-muted mt-1">
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
            <p className="text-muted mt-2">
              Not counted: {summary.holidays.map((holiday) => holiday.name).join(', ')}.
            </p>
          )}
        </div>
      )}

      {state.error && (
        <p
          role="alert"
          className="bg-danger-surface text-danger max-w-lg rounded-lg px-4 py-3 text-sm"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-accent text-accent-ink rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Saving...' : submitLabel}
        </button>
        <Link href="/" className="text-muted text-sm hover:underline">
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
