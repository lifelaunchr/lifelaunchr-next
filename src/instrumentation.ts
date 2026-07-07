// Server + edge Sentry initialization.
//
// Next.js calls `register()` once per runtime at startup. We lazy-import the
// matching Sentry config so the Node SDK only loads on the Node runtime and the
// edge SDK only on the edge runtime. Must live at `src/instrumentation.ts` (Next
// looks inside `src/` when a src dir is present). The server/edge config files
// stay at the repo root, hence the `../` import paths.
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

// Captures errors thrown in server components / route handlers and reports them
// to Sentry with request context.
export const onRequestError = Sentry.captureRequestError
