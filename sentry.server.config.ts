import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://28fd656254fc074569b46400d3414bd5@o4511560738013184.ingest.us.sentry.io/4511560738996224',
  tracesSampleRate: 0,
  debug: false,
})
