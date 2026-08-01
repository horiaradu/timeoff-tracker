import Image from 'next/image'
import Link from 'next/link'
import { endSession } from '@/actions/session'
import { auth } from '@/auth'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

const LINKS = [
  { href: '/', label: 'Time off' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/settings', label: 'Settings' },
]

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-line border-b">
        <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted hover:text-ink text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}

          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-2">
              {user?.image && (
                <Image
                  src={user.image}
                  alt=""
                  width={24}
                  height={24}
                  className="border-line rounded-full border"
                />
              )}
              <span className="text-muted hidden text-sm sm:inline">{user?.email}</span>
            </span>

            <ThemeSwitcher />

            <form action={endSession}>
              <button
                type="submit"
                className="text-muted text-sm underline-offset-4 hover:underline"
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
