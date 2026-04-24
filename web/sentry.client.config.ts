import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV ?? 'production',

  // Sample 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Record 5% of sessions and 100% of sessions with errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and inputs to protect user PII in replays
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  // Silence noisy network errors that are expected (auth refresh on page load)
  ignoreErrors: [
    'Network Error',
    'Failed to fetch',
    'AbortError',
  ],
})
