'use client'

import { useFormStatus } from 'react-dom'
import { deleteTimeoff } from '@/actions/timeoffs'

function Submit({ period }: { period: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!confirm(`Delete the time off on ${period}?`)) event.preventDefault()
      }}
      className="rounded-lg border border-black/15 px-3 py-1.5 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-white/20 dark:text-red-400 dark:hover:bg-red-950"
    >
      {pending ? 'Deleting...' : 'Delete'}
    </button>
  )
}

export function DeleteTimeoffButton({ id, period }: { id: string; period: string }) {
  return (
    <form action={deleteTimeoff}>
      <input type="hidden" name="id" value={id} />
      <Submit period={period} />
    </form>
  )
}
