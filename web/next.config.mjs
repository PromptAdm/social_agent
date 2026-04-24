import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default withSentryConfig(nextConfig, {
  // Sentry org and project — set in CI/CD environment
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs in CI to avoid noise in local dev
  silent: !process.env.CI,

  // Upload wider set of source maps for better stack traces
  widenClientFileUpload: true,

  // Hide source maps from browser bundles
  hideSourceMaps: true,

  // Tree-shake Sentry logger to reduce bundle size
  disableLogger: true,
})
