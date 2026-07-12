import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import PageHeader from '@/components/blog/PageHeader'
import { client } from '@/sanity/client'
import { urlFor } from '@/sanity/image'
import { webinarsQuery, type WebinarCard } from '@/sanity/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Webinars',
  description: 'Watch Soar webinar replays on college and career planning for counselors and families.',
}

function fmtDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function WebinarsIndex() {
  const webinars = await client.fetch<WebinarCard[]>(webinarsQuery)
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Webinars</h1>
        <p className="text-gray-500 mb-10">Replays and recordings from the Soar team.</p>
        {webinars.length === 0 ? (
          <p className="text-gray-500">No webinars yet. Check back soon.</p>
        ) : (
          <div className="space-y-10">
            {webinars.map((w) => (
              <article key={w._id}>
                <Link href={`/webinars/${w.slug}`} className="group block">
                  {w.mainImage && (
                    <div className="mb-4 overflow-hidden rounded-xl">
                      <Image
                        src={urlFor(w.mainImage).width(800).height(450).fit('crop').url()}
                        alt={w.title}
                        width={800}
                        height={450}
                        className="h-auto w-full"
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {w.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">{fmtDate(w.date)}</p>
                  {w.summary && <p className="text-sm text-gray-600 leading-relaxed mt-2">{w.summary}</p>}
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
