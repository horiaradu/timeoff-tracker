'use client'

import { useActionState } from 'react'
import { saveProfile } from '@/actions/profile'
import type { Profile } from '@/db/schema'
import { SignatureField } from './SignatureField'

const FIELDS = [
  { name: 'fullName', label: 'Full name', placeholder: 'Ion Popescu', span: true },
  { name: 'ciSeries', label: 'ID series', placeholder: 'XX' },
  { name: 'ciNumber', label: 'ID number', placeholder: '123456' },
  { name: 'cnp', label: 'CNP', placeholder: '1234567890123' },
  { name: 'city', label: 'City', placeholder: 'Bucuresti' },
  { name: 'jobTitle', label: 'Job title', placeholder: 'programator', span: true },
] as const

const field =
  'w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50'

export function ProfileForm({ profile }: { profile: Profile | undefined }) {
  const [state, submit, pending] = useActionState(saveProfile, {})

  return (
    <form action={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((entry) => (
          <label key={entry.name} className={'span' in entry && entry.span ? 'sm:col-span-2' : ''}>
            <span className="mb-1.5 block text-sm font-medium">{entry.label}</span>
            <input
              name={entry.name}
              required
              defaultValue={profile?.[entry.name] ?? ''}
              placeholder={entry.placeholder}
              className={field}
            />
            {state.fieldErrors?.[entry.name] && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                {state.fieldErrors[entry.name][0]}
              </span>
            )}
          </label>
        ))}
      </div>

      <SignatureField existing={profile?.signaturePng ?? null} />

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Saving...' : 'Save details'}
      </button>
    </form>
  )
}
