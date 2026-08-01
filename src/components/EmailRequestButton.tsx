'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { emailRequest } from '@/actions/email'

type Props = {
  id: string
  period: string
  /** Offered as the default, being whoever the last request went to. */
  lastRecipient: string | null
}

export function EmailRequestButton({ id, period, lastRecipient }: Props) {
  const [state, submit, pending] = useActionState(emailRequest, {})
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
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="rounded-lg border border-black/15 px-3 py-1.5 transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
      >
        Email
      </button>

      {state.sentTo && !open && (
        <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400">
          Sent to {state.sentTo}
        </span>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={`Email the request for ${period}`}
          className="bg-background absolute right-0 z-20 mt-2 w-80 rounded-xl border border-black/10 p-4 shadow-lg dark:border-white/15"
        >
          <p className="text-sm font-medium">Send the request</p>
          <p className="mt-1 text-xs text-black/55 dark:text-white/55">
            Subject &ldquo;Cerere concediu {period}&rdquo;, sent from your own address with the PDF
            attached.
          </p>

          <form action={submit} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={id} />
            <input
              type="email"
              name="to"
              required
              autoFocus
              defaultValue={lastRecipient ?? ''}
              placeholder="cineva@smilecloud.com"
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
            />

            {state.error && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {state.error}
              </p>
            )}
            {state.sentTo && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Sent to {state.sentTo}.
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="bg-foreground text-background w-full rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
