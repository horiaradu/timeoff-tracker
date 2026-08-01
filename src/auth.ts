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

/** Sending the request from the user's own mailbox, and keeping their calendar in step. */
const GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send'
const CALENDAR_EVENTS = 'https://www.googleapis.com/auth/calendar.events'

/**
 * Creates the user on first sign-in and keeps their display name current.
 * Google only returns a refresh token when it feels like it, so an absent one
 * must never wipe the token already stored.
 */
async function rememberUser(
  email: string,
  name: string | null,
  refreshToken: string | null
): Promise<string> {
  const [row] = await db()
    .insert(users)
    .values({ email, name, googleRefreshToken: refreshToken })
    .onConflictDoUpdate({
      target: users.email,
      set: { name, ...(refreshToken ? { googleRefreshToken: refreshToken } : {}) },
    })
    .returning({ id: users.id })

  if (row) return row.id

  const [existing] = await db().select({ id: users.id }).from(users).where(eq(users.email, email))
  return existing.id
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          // A hint that pre-filters the account chooser. The signIn callback is what enforces it.
          hd: COMPANY_DOMAIN,
          scope: `openid email profile ${GMAIL_SEND} ${CALENDAR_EVENTS}`,
          // Asking for consent every time is what makes Google hand back a refresh token.
          access_type: 'offline',
          prompt: 'select_account consent',
        },
      },
    }),
  ],
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    signIn({ profile }) {
      return isCompanyAccount(profile) || '/login?error=domain'
    },
    async jwt({ token, trigger, profile, account }) {
      const email = profile?.email?.toLowerCase()
      if (trigger === 'signIn' && profile && email && isCompanyAccount(profile)) {
        token.userId = await rememberUser(
          email,
          profile.name ?? null,
          account?.refresh_token ?? null
        )
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
