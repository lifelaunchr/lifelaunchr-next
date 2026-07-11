import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/react'
import type { SanityImageSource } from '@sanity/image-url'
import Image from 'next/image'
import { urlFor } from '@/sanity/image'

const components: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      const img = value as SanityImageSource & { alt?: string; asset?: unknown }
      if (!img?.asset) return null
      return (
        <Image
          src={urlFor(img).width(1600).fit('max').url()}
          alt={img.alt ?? ''}
          width={1600}
          height={900}
          className="my-6 h-auto w-full rounded-lg"
        />
      )
    },
  },
  block: {
    normal: ({ children }) => <p className="mb-4 leading-relaxed text-gray-700">{children}</p>,
    h2: ({ children }) => <h2 className="mt-8 mb-3 text-xl font-bold text-gray-900">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-6 mb-2 text-lg font-semibold text-gray-900">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-4 border-gray-200 pl-4 italic text-gray-600">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6 text-gray-700">{children}</ul>,
    number: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6 text-gray-700">{children}</ol>,
  },
  marks: {
    link: ({ value, children }) => {
      const href = (value as { href?: string })?.href ?? '#'
      const external = /^https?:\/\//.test(href)
      return external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          {children}
        </a>
      ) : (
        <a href={href} className="text-blue-600 underline">
          {children}
        </a>
      )
    },
  },
}

export default function PortableBody({ value }: { value?: PortableTextBlock[] }) {
  if (!value?.length) return null
  return (
    <div className="text-[0.95rem]">
      <PortableText value={value} components={components} />
    </div>
  )
}
