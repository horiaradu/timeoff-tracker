import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The leave request reads its font files at runtime, which the tracer cannot see.
  outputFileTracingIncludes: {
    '/api/timeoffs/[id]/pdf': ['src/pdf/fonts/**/*.ttf'],
  },
  images: {
    // Google profile pictures.
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Stack traces only point at real code once the maps are uploaded, which needs a token.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Lets the browser reach Sentry even where ad blockers stop requests to it directly.
  tunnelRoute: '/monitoring',
})
