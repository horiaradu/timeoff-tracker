import Link from 'next/link'
import { endSession } from '@/actions/session'
import { auth } from '@/auth'

const LINKS = [
  { href: '/', label: 'Time off' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/settings', label: 'Settings' },
]

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-black/10 dark:border-white/15">
        <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-black/70 transition-colors hover:text-black dark:text-white/70 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-sm text-black/50 sm:inline dark:text-white/50">
              {session?.user?.email}
            </span>
            <form action={endSession}>
              <button
                type="submit"
                className="text-sm text-black/50 underline-offset-4 hover:underline dark:text-white/50"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
