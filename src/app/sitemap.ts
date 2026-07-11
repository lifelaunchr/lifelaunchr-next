import { MetadataRoute } from 'next'
import { client } from '@/sanity/client'
import { postSlugsQuery, webinarSlugsQuery } from '@/sanity/queries'

const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://withsoar.ai'

// Refresh the sitemap on the same cadence as the blog (ISR).
export const revalidate = 60

// Public marketing pages only — authed app routes are excluded (and disallowed in robots.ts).
const PATHS = ['', '/families', '/faq', '/upgrade', '/safety', '/tutorials', '/blog', '/webinars', '/terms', '/privacy']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Pull published blog/webinar slugs from Sanity. Guard against a Sanity
  // outage so a failed fetch never breaks the sitemap (or the build).
  let postSlugs: string[] = []
  let webinarSlugs: string[] = []
  try {
    ;[postSlugs, webinarSlugs] = await Promise.all([
      client.fetch<string[]>(postSlugsQuery),
      client.fetch<string[]>(webinarSlugsQuery),
    ])
  } catch {
    // leave both empty
  }

  const staticEntries: MetadataRoute.Sitemap = PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.7,
  }))

  const postEntries: MetadataRoute.Sitemap = postSlugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const webinarEntries: MetadataRoute.Sitemap = webinarSlugs.map((slug) => ({
    url: `${base}/webinars/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticEntries, ...postEntries, ...webinarEntries]
}
