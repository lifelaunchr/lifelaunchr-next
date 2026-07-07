// Client-side Sentry initialization.
//
// IMPORTANT: this file MUST live at `src/instrumentation-client.ts` (Next.js only
// looks inside `src/` when a src dir is present). Under Turbopack, the legacy
// `sentry.client.config.ts` is NOT loaded — Sentry's webpack plugin used to inject
// it, and Turbopack skips that step. Placing client init here is what makes Sentry
// actually initialize in the browser (next#78). Move/rename this and Sentry goes
// silent again.
import * as Sentry from '@sentry/nextjs'

// TEMP DIAGNOSTIC (next#78) — remove before production. Confirms whether Next
// actually executes this file on the client and whether init() throws.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('[sentry-diag] instrumentation-client executing')
}

try {
  Sentry.init({
    dsn: 'https://28fd656254fc074569b46400d3414bd5@o4511560738013184.ingest.us.sentry.io/4511560738996224',
    tracesSampleRate: 0,   // performance monitoring off — stay on free tier
    debug: false,
    // Queue events in IndexedDB while offline and replay them on reconnect.
    // Essential for capturing connection-drop errors (next#77): those occur while
    // the browser has no network, so the default transport can't report them and
    // silently drops the event. Offline transport delivers them once online again.
    transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
  })
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[sentry-diag] init complete; __SENTRY__ =', !!(window as unknown as { __SENTRY__?: unknown }).__SENTRY__)
  }
} catch (e) {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.error('[sentry-diag] init threw:', e)
  }
}

// Instruments App Router client-side navigations so Sentry can tie errors to the
// route transition that caused them.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
