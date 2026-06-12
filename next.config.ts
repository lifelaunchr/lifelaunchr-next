import type { NextConfig } from 'next'

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
    ]
  },
}

export default nextConfig
