import { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://withsoar.ai'

// Public marketing pages only — authed app routes are excluded (and disallowed in robots.ts).
const PATHS = ['', '/families', '/faq', '/upgrade', '/safety', '/tutorials', '/terms', '/privacy']

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.7,
  }))
}
