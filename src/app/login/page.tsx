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
      <div className="border-line w-full max-w-sm rounded-2xl border p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Time off</h1>
        <p className="text-muted mt-2 text-sm">
          Track your vacation days and generate leave requests.
        </p>

        {message && (
          <p
            role="alert"
            className="bg-danger-surface text-danger mt-6 rounded-lg px-3 py-2 text-sm"
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
            className="bg-accent text-accent-ink w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Sign in with Google
          </button>
        </form>

        <p className="text-muted mt-4 text-center text-xs">Use your @{COMPANY_DOMAIN} account</p>
      </div>
    </main>
  )
}
