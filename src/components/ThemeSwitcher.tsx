'use client'

import { useEffect, useSyncExternalStore } from 'react'

type Choice = 'system' | 'light' | 'dark'

const CHOICES: { value: Choice; label: string; glyph: string }[] = [
  { value: 'system', label: 'Follow my device', glyph: '◐' },
  { value: 'light', label: 'Light', glyph: '☀' },
  { value: 'dark', label: 'Dark', glyph: '☾' },
]

const KEY = 'theme'

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

/** The stored choice is external state, so the component subscribes rather than copying it. */
const listeners = new Set<() => void>()

function subscribe(notify: () => void) {
  listeners.add(notify)
  window.addEventListener('storage', notify)
  return () => {
    listeners.delete(notify)
    window.removeEventListener('storage', notify)
  }
}

function storedChoice(): Choice {
  const stored = localStorage.getItem(KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

/** Nothing is known about the device until the browser takes over. */
const serverChoice = (): Choice => 'system'

function apply(choice: Choice) {
  document.documentElement.dataset.theme =
    choice === 'system' ? (prefersDark() ? 'dark' : 'light') : choice
}

function choose(next: Choice) {
  localStorage.setItem(KEY, next)
  apply(next)
  for (const notify of listeners) notify()
}

export function ThemeSwitcher() {
  const choice = useSyncExternalStore(subscribe, storedChoice, serverChoice)

  // While following the device, a change of system setting has to take effect live.
  useEffect(() => {
    if (choice !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const follow = () => apply('system')
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [choice])

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="border-line flex items-center gap-0.5 rounded-lg border p-0.5"
    >
      {CHOICES.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => choose(option.value)}
          title={option.label}
          aria-label={option.label}
          aria-pressed={choice === option.value}
          className={`rounded-md px-1.5 py-0.5 text-xs transition-colors ${
            choice === option.value
              ? 'bg-accent text-accent-ink'
              : 'text-muted hover:bg-surface hover:text-ink'
          }`}
        >
          <span aria-hidden>{option.glyph}</span>
        </button>
      ))}
    </div>
  )
}
