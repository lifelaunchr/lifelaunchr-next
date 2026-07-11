import { groq } from 'next-sanity'
import type { SanityImageSource } from '@sanity/image-url'
import type { PortableTextBlock } from '@portabletext/react'

// ---- Types (shape of the query results) ----
export type SeoFields = { metaTitle?: string; metaDescription?: string }

export type PostCard = {
  _id: string
  title: string
  slug: string
  excerpt?: string
  publishedAt?: string
  mainImage?: SanityImageSource
  authorName?: string
}

export type Post = PostCard & {
  body?: PortableTextBlock[]
  seo?: SeoFields
}

export type WebinarCard = {
  _id: string
  title: string
  slug: string
  summary?: string
  date?: string
  videoUrl?: string
  mainImage?: SanityImageSource
}

export type Webinar = WebinarCard & {
  body?: PortableTextBlock[]
}

// ---- Queries ----
export const postsQuery = groq`*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
  _id, title, "slug": slug.current, excerpt, publishedAt, mainImage,
  "authorName": author->name
}`

export const postSlugsQuery = groq`*[_type == "post" && defined(slug.current)].slug.current`

export const postQuery = groq`*[_type == "post" && slug.current == $slug][0]{
  _id, title, "slug": slug.current, excerpt, publishedAt, mainImage, body, seo,
  "authorName": author->name
}`

export const webinarsQuery = groq`*[_type == "webinar" && defined(slug.current)] | order(date desc){
  _id, title, "slug": slug.current, summary, date, videoUrl, mainImage
}`

export const webinarSlugsQuery = groq`*[_type == "webinar" && defined(slug.current)].slug.current`

export const webinarQuery = groq`*[_type == "webinar" && slug.current == $slug][0]{
  _id, title, "slug": slug.current, summary, date, videoUrl, mainImage, body
}`
