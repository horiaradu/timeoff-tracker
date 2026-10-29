import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The leave request reads its font files at runtime, which the tracer cannot see.
  outputFileTracingIncludes: {
    '/api/timeoffs/[id]/pdf': ['src/pdf/fonts/**/*.ttf'],
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Stack traces only point at real code once the maps are uploaded, which needs a token.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
})
