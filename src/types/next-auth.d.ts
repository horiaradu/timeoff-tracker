import type { DefaultSession } from '@auth/core/types'

// next-auth re-exports these types from @auth/core, so the augmentation has to
// target the module that actually declares them.

declare module '@auth/core/types' {
  interface Session {
    user: { id: string } & DefaultSession['user']
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string
  }
}
