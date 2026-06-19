import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tutorials — Soar',
  description:
    'Short video tutorials on how to get the most out of Soar: inviting families, building college lists, generating meeting briefs, session summaries, and more.',
  openGraph: {
    title: 'Soar Tutorials',
    description:
      'Short video tutorials on how to get the most out of Soar: inviting families, building college lists, generating meeting briefs, session summaries, and more.',
    url: 'https://withsoar.ai/tutorials',
    siteName: 'Soar',
    images: [
      {
        url: '/og-image.png?v=3',
        width: 1200,
        height: 630,
        alt: 'Soar — College and Career Planning, Built for the Whole Team',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soar Tutorials',
    description:
      'Short video tutorials on how to get the most out of Soar: inviting families, building college lists, generating meeting briefs, session summaries, and more.',
    images: ['/og-image.png?v=3'],
  },
}

export default function TutorialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
