import { signIn, COMPANY_DOMAIN } from '@/auth'

const MESSAGES: Record<string, string> = {
  domain: `Only @${COMPANY_DOMAIN} accounts can use this app.`,
  AccessDenied: `Only @${COMPANY_DOMAIN} accounts can use this app.`,
  Configuration: 'Sign-in is not configured correctly. Check the server settings.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const message = error ? (MESSAGES[error] ?? 'Sign-in failed. Please try again.') : null

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 p-8 shadow-sm dark:border-white/15">
        <h1 className="text-2xl font-semibold tracking-tight">Time off</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Track your vacation days and generate leave requests.
        </p>

        {message && (
          <p
            role="alert"
            className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {message}
          </p>
        )}

        <form
          className="mt-6"
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/' })
          }}
        >
          <button
            type="submit"
            className="bg-foreground text-background w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Sign in with Google
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-black/50 dark:text-white/50">
          Use your @{COMPANY_DOMAIN} account
        </p>
      </div>
    </main>
  )
}
