import type { Metadata } from 'next'

// The /families page itself is a client component (it has the referral form), so it can't
// export metadata. This route layout supplies its own title, description, and OG card.
export const metadata: Metadata = {
  title: 'For Families',
  description:
    'Soar gives your student a college and career planning partner that actually knows them, and gives you a window into the process. Families join through their IEC or school counselor.',
  openGraph: {
    title: 'Soar for Families',
    description:
      'A college and career planning partner that actually knows your student, set up by your counselor. Here is what it does, and how to get it.',
    images: [{ url: '/og-image.png?v=3', width: 1200, height: 630, alt: 'Soar' }],
    type: 'website',
  },
}

export default function FamiliesLayout({ children }: { children: React.ReactNode }) {
  return children
}
