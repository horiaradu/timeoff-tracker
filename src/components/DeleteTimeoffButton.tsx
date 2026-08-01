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
      className="border-line text-danger hover:bg-danger-surface rounded-lg border px-3 py-1.5 transition-colors disabled:opacity-50"
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
