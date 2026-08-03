import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // The app handles ID and CNP details, which have no business leaving it.
  sendDefaultPii: false,
  tracesSampleRate: 1,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
})
