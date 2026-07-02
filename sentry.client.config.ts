import * as Sentry from '@sentry/nextjs'

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
