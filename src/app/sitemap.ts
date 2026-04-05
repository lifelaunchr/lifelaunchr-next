import { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lifelaunchr-next.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${base}/join`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
