'use client'

import { useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { deleteTimeoff } from '@/actions/timeoffs'

const OUTLINE = 'border-line hover:bg-surface rounded-lg border px-3 py-1.5 transition-colors'

function Confirm() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-danger rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Deleting...' : 'Delete'}
    </button>
  )
}

export function DeleteTimeoffButton({ id, period }: { id: string; period: string }) {
  const dialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={`${OUTLINE} text-danger hover:bg-danger-surface`}
      >
        Delete
      </button>

      {/* A native dialog brings focus trapping, Escape and a backdrop with it. */}
      <dialog
        ref={dialog}
        aria-labelledby={`delete-${id}`}
        className="border-line bg-bg text-ink m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border p-5 shadow-xl backdrop:bg-black/50"
      >
        <h2 id={`delete-${id}`} className="text-base font-semibold">
          Delete this time off?
        </h2>
        <p className="text-muted mt-2 text-sm">
          {period} goes back into your allowance, and its calendar entries are removed.
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className={`${OUTLINE} text-sm`}
          >
            Keep it
          </button>
          <form action={deleteTimeoff}>
            <input type="hidden" name="id" value={id} />
            <Confirm />
          </form>
        </div>
      </dialog>
    </>
  )
}
