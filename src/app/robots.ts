import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep the authed app (and API/admin) out of the index; only marketing pages are crawlable.
      disallow: [
        '/api/', '/admin', '/chat', '/dashboard', '/profile',
        '/lists', '/reports', '/activities', '/settings', '/onboarding',
      ],
    },
    sitemap: 'https://withsoar.ai/sitemap.xml',
  }
}
