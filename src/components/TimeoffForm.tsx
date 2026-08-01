'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import type { FormState } from '@/actions/state'
import { isDateOnly, type DateOnly } from '@/lib/dates'
import { balanceFor, type Period } from '@/lib/validation'
import { chargesByYear, holidaysInRange, workingDays } from '@/lib/workdays'

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  /** Everything the user has booked, used to show what the request leaves behind. */
  existing: Period[]
  allowances: [number, number][]
  initial: { id?: string; startDate: DateOnly; endDate: DateOnly; requestDate: DateOnly }
  submitLabel: string
}

const field =
  'w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50'

export function TimeoffForm({ action, existing, allowances, initial, submitLabel }: Props) {
  const [state, submit, pending] = useActionState(action, {})
  const [start, setStart] = useState(initial.startDate)
  const [end, setEnd] = useState(initial.endDate)

  const summary = summarise(start, end, existing, new Map(allowances), initial.id)

  return (
    <form action={submit} className="max-w-lg space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">First day</span>
          <input
            type="date"
            name="startDate"
            required
            value={start}
            onChange={(event) => {
              setStart(event.target.value)
              if (event.target.value > end) setEnd(event.target.value)
            }}
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Last day</span>
          <input
            type="date"
            name="endDate"
            required
            min={start}
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className={field}
          />
        </label>
      </div>

      <label className="block sm:w-1/2 sm:pr-2">
        <span className="mb-1.5 block text-sm font-medium">Request date</span>
        <input
          type="date"
          name="requestDate"
          required
          defaultValue={initial.requestDate}
          className={field}
        />
        <span className="mt-1.5 block text-xs text-black/50 dark:text-white/50">
          Printed as &ldquo;Data&rdquo; on the request.
        </span>
      </label>

      {summary && (
        <div className="rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/15">
          <p>
            Uses <span className="font-semibold">{summary.days}</span> working{' '}
            {summary.days === 1 ? 'day' : 'days'}.
          </p>
          {summary.perYear.map(({ year, charge, remaining, granted }) => (
            <p key={year} className="mt-1 text-black/60 dark:text-white/60">
              {granted === null ? (
                <>No allowance set for {year}.</>
              ) : (
                <>
                  {year}: {charge} of {remaining} remaining {remaining === 1 ? 'day' : 'days'}
                  {remaining - charge >= 0 && <> &rarr; {remaining - charge} left afterwards</>}
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
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
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
  existing: Period[],
  allowances: Map<number, number>,
  excludeId?: string
) {
  if (!isDateOnly(start) || !isDateOnly(end) || start > end) return null

  const others = existing.filter((period) => period.id !== excludeId)

  return {
    days: workingDays(start, end),
    holidays: holidaysInRange(start, end),
    perYear: [...chargesByYear(start, end)].map(([year, charge]) => {
      const { granted, remaining } = balanceFor(year, others, allowances)
      return { year, charge, granted, remaining: remaining ?? 0 }
    }),
  }
}
