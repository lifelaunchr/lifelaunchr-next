import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Soar by LifeLaunchr',
    short_name: 'Soar',
    description: 'Your AI-powered college planning advisor',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c1b33',
    theme_color: '#0c1b33',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon-32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    categories: ['education'],
  }
}
