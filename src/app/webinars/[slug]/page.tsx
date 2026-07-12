import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/blog/PageHeader'
import PortableBody from '@/components/blog/PortableBody'
import VideoEmbed from '@/components/blog/VideoEmbed'
import { client } from '@/sanity/client'
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
  return { title: webinar.title, description: webinar.summary }
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
      </main>
    </div>
  )
}
