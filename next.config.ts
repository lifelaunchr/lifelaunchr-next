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
  async redirects() {
    return [
      // Old Vercel default URL
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'lifelaunchr-next.vercel.app' }],
        destination: 'https://withsoar.ai/:path*',
        permanent: false,
      },
      // Old branded subdomain — many counselors and students have this bookmarked
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'soar.lifelaunchr.com' }],
        destination: 'https://withsoar.ai/:path*',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
