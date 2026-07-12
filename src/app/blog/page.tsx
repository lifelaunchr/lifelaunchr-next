import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import PageHeader from '@/components/blog/PageHeader'
import { client } from '@/sanity/client'
import { urlFor } from '@/sanity/image'
import { postsQuery, type PostCard } from '@/sanity/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Notes on college and career planning, AI, and counseling from the Soar team.',
}

function fmtDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function BlogIndex() {
  const posts = await client.fetch<PostCard[]>(postsQuery)
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog</h1>
        <p className="text-gray-500 mb-10">Notes on college and career planning, AI, and counseling.</p>
        {posts.length === 0 ? (
          <p className="text-gray-500">No posts yet. Check back soon.</p>
        ) : (
          <div className="space-y-10">
            {posts.map((p) => (
              <article key={p._id}>
                <Link href={`/blog/${p.slug}`} className="group block">
                  {p.mainImage && (
                    <div className="mb-4 overflow-hidden rounded-xl">
                      <Image
                        src={urlFor(p.mainImage).width(800).height(420).fit('crop').url()}
                        alt={p.title}
                        width={800}
                        height={420}
                        className="h-auto w-full"
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {p.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {fmtDate(p.publishedAt)}
                    {p.authorName ? ` · ${p.authorName}` : ''}
                  </p>
                  {p.excerpt && <p className="text-sm text-gray-600 leading-relaxed mt-2">{p.excerpt}</p>}
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
