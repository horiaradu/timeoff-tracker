'use client'

import { useActionState } from 'react'
import { saveAllowance } from '@/actions/profile'

const field =
  'w-24 rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent'

type Props = {
  year: number
  days?: number
  /** A year that has no row yet lets the user pick which year to add. */
  editableYear?: boolean
}

export function AllowanceForm({ year, days, editableYear = false }: Props) {
  const [state, submit, pending] = useActionState(saveAllowance, {})

  return (
    <form action={submit} className="flex flex-wrap items-end gap-3">
      <label>
        <span className="text-muted mb-1.5 block text-xs font-medium">Year</span>
        {editableYear ? (
          <input type="number" name="year" required defaultValue={year} className={field} />
        ) : (
          <>
            <input type="hidden" name="year" value={year} />
            <span className="block px-1 py-2 text-sm font-medium">{year}</span>
          </>
        )}
      </label>

      <label>
        <span className="text-muted mb-1.5 block text-xs font-medium">Days</span>
        <input
          type="number"
          name="days"
          required
          min={0}
          max={365}
          defaultValue={days ?? 21}
          className={field}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="border-line hover:bg-surface rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50"
      >
        {pending ? 'Saving...' : days === undefined ? 'Add year' : 'Save'}
      </button>

      {state.error && (
        <span role="alert" className="text-danger text-xs">
          {state.error}
        </span>
      )}
    </form>
  )
}
