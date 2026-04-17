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

  // Redirect the default Vercel deployment URL to the canonical production domain.
  // Preview deployment URLs (lifelaunchr-next-git-*-lifelaunchrs-projects.vercel.app)
  // are intentionally NOT matched so staging previews continue to work.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'lifelaunchr-next.vercel.app' }],
        destination: 'https://soar.lifelaunchr.com/:path*',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
