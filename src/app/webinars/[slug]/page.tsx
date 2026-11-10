import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/blog/PageHeader'
import PortableBody from '@/components/blog/PortableBody'
import VideoEmbed from '@/components/blog/VideoEmbed'
import { client } from '@/sanity/client'
import { urlFor } from '@/sanity/image'
import { webinarQuery, type Webinar } from '@/sanity/queries'

// Rendered dynamically — see the note in blog/[slug]/page.tsx. The root layout's
// headers() call forces dynamic rendering, so a static/ISR declaration here would
// make on-demand rendering of a not-yet-prerendered webinar throw DYNAMIC_SERVER_USAGE.
export const dynamic = 'force-dynamic'

function fmtDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const webinar = await client.fetch<Webinar | null>(webinarQuery, { slug })
  if (!webinar) return {}

  // Returning only title + description meant the root layout's openGraph and
  // twitter blocks were inherited WHOLE, so a shared webinar link showed the
  // homepage headline, the homepage marketing line, the generic logo and
  // og:url = https://withsoar.ai. The <title> was the only correct part, and
  // no social network reads it (next#101).
  const image = webinar.mainImage
    ? urlFor(webinar.mainImage).width(1200).height(630).fit('crop').url()
    : '/og-image.png?v=3'
  const url = `/webinars/${slug}`

  return {
    title: webinar.title,
    description: webinar.summary,
    alternates: { canonical: url },
    openGraph: {
      title: webinar.title,
      description: webinar.summary,
      url,
      siteName: 'Soar',
      type: 'article',
      publishedTime: webinar.date,
      images: [{ url: image, width: 1200, height: 630, alt: webinar.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: webinar.title,
      description: webinar.summary,
      images: [image],
    },
  }
}

export default async function WebinarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const webinar = await client.fetch<Webinar | null>(webinarQuery, { slug })
  if (!webinar) notFound()

  return (
    <div className="min-h-screen bg-white">
      <PageHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/webinars" className="text-sm text-gray-500 hover:text-gray-800">← All webinars</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2 leading-tight">{webinar.title}</h1>
        <p className="text-sm text-gray-500 mb-8">{fmtDate(webinar.date)}</p>
        {webinar.videoUrl && (
          <div className="mb-8">
            <VideoEmbed url={webinar.videoUrl} title={webinar.title} />
          </div>
        )}
        {webinar.summary && <p className="text-base text-gray-700 leading-relaxed mb-6">{webinar.summary}</p>}
        <PortableBody value={webinar.body} />
        {webinar.transcript?.length ? (
          <details className="mt-10 border-t border-gray-200 pt-6">
            <summary className="cursor-pointer select-none text-sm font-semibold text-blue-700 hover:text-blue-900">
              Transcript
            </summary>
            <div className="mt-5">
              <PortableBody value={webinar.transcript} />
            </div>
          </details>
        ) : null}
      </main>
    </div>
  )
}
