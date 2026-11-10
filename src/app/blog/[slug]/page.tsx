import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/blog/PageHeader'
import PortableBody from '@/components/blog/PortableBody'
import { client } from '@/sanity/client'
import { urlFor } from '@/sanity/image'
import { postQuery, type Post } from '@/sanity/queries'

// Rendered dynamically: the root layout calls headers() (Clerk satellite-domain
// detection), which forces dynamic rendering app-wide. Declaring this route
// static (revalidate + generateStaticParams) makes on-demand generation of a
// not-yet-prerendered post throw DYNAMIC_SERVER_USAGE. force-dynamic renders
// each request server-side (Sanity CDN keeps it fast) and shows new posts instantly.
export const dynamic = 'force-dynamic'

function fmtDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await client.fetch<Post | null>(postQuery, { slug })
  if (!post) return {}

  const title = post.seo?.metaTitle ?? post.title
  const description = post.seo?.metaDescription ?? post.excerpt
  // Fall back to the site card rather than emitting no image. A post with no
  // mainImage previously defined no openGraph at all and so inherited the
  // homepage's entire card — title, description and all.
  const image = post.mainImage
    ? urlFor(post.mainImage).width(1200).height(630).fit('crop').url()
    : '/og-image.png?v=3'
  const url = `/blog/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    // openGraph and twitter are REPLACED wholesale, not deep-merged, when a
    // child route defines them — so each has to be stated in full here. The old
    // version set only openGraph.images, which silently dropped the inherited
    // url and type while leaving twitter untouched, so LinkedIn showed the
    // post's image and X showed the Soar logo (next#101).
    openGraph: {
      title,
      description,
      url,
      siteName: 'Soar',
      type: 'article',
      publishedTime: post.publishedAt,
      authors: post.authorName ? [post.authorName] : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await client.fetch<Post | null>(postQuery, { slug })
  if (!post) notFound()

  return (
    <div className="min-h-screen bg-white">
      <PageHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-800">← All posts</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2 leading-tight">{post.title}</h1>
        <p className="text-sm text-gray-500 mb-8">
          {fmtDate(post.publishedAt)}
          {post.authorName ? ` · ${post.authorName}` : ''}
        </p>
        {post.mainImage && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <Image
              src={urlFor(post.mainImage).width(1200).height(630).fit('crop').url()}
              alt={post.title}
              width={1200}
              height={630}
              className="h-auto w-full"
              priority
            />
          </div>
        )}
        <PortableBody value={post.body} />
      </main>
    </div>
  )
}
