import { eq } from 'drizzle-orm'
import NextAuth, { type Profile } from 'next-auth'
import Google from 'next-auth/providers/google'
import { db } from '@/db'
import { users } from '@/db/schema'

export const COMPANY_DOMAIN = 'smilecloud.com'

function isCompanyAccount(profile: Profile | undefined): boolean {
  const email = profile?.email?.toLowerCase()
  return profile?.email_verified === true && email?.endsWith(`@${COMPANY_DOMAIN}`) === true
}

/** Creates the user on first sign-in and keeps their display name current. */
async function rememberUser(email: string, name: string | null): Promise<string> {
  const [row] = await db()
    .insert(users)
    .values({ email, name })
    .onConflictDoUpdate({ target: users.email, set: { name } })
    .returning({ id: users.id })

  if (row) return row.id

  const [existing] = await db().select({ id: users.id }).from(users).where(eq(users.email, email))
  return existing.id
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // A hint that pre-filters the Google account chooser. The signIn callback is what enforces it.
      authorization: { params: { hd: COMPANY_DOMAIN, prompt: 'select_account' } },
    }),
  ],
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    signIn({ profile }) {
      return isCompanyAccount(profile) || '/login?error=domain'
    },
    async jwt({ token, trigger, profile }) {
      const email = profile?.email?.toLowerCase()
      if (trigger === 'signIn' && profile && email && isCompanyAccount(profile)) {
        token.userId = await rememberUser(email, profile.name ?? null)
        token.email = email
      }
      return token
    },
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId
      return session
    },
  },
})

/** The signed-in user's id, or null when there is no session. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}
