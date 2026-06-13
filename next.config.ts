import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  // Allow images from Clerk's CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },

  // Redirect old/default hostnames to the canonical production domain (withsoar.ai).
  // Preview deployment URLs (lifelaunchr-next-git-*-lifelaunchrs-projects.vercel.app)
  // are intentionally NOT matched so staging previews continue to work.
  //
  // NOTE: soar.lifelaunchr.com → withsoar.ai redirect is intentionally omitted here.
  // Add it back once withsoar.ai sign-in is verified working in production:
  //   { source: '/:path*', has: [{ type: 'host', value: 'soar.lifelaunchr.com' }],
  //     destination: 'https://withsoar.ai/:path*', permanent: false }
  async redirects() {
    return [
      // Old Vercel default URL
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'lifelaunchr-next.vercel.app' }],
        destination: 'https://withsoar.ai/:path*',
        permanent: false,
      },
      // On the withsoar.ai satellite domain, /accept-invite cannot run Clerk's
      // auth initialization (satellite Clerk.js rejects the lifelaunchr.com key).
      // Redirect to soar.lifelaunchr.com before middleware ever runs.
      // This runs at the CDN layer, before clerkMiddleware, preserving ?token= param.
      {
        source: '/accept-invite',
        has: [{ type: 'host', value: 'withsoar.ai' }],
        destination: 'https://soar.lifelaunchr.com/accept-invite',
        permanent: false,
      },
      {
        source: '/accept-invite',
        has: [{ type: 'host', value: 'www.withsoar.ai' }],
        destination: 'https://soar.lifelaunchr.com/accept-invite',
        permanent: false,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: 'lifelaunchr',
  project: 'javascript-nextjs',
  silent: true,         // suppress build output noise
  disableLogger: true,  // tree-shake Sentry logger in production bundle
})
