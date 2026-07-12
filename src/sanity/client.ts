import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId } from './env'

// Read-only client for published blog/webinar content. useCdn = false reads live
// from the Sanity API so edits appear immediately everywhere (the CDN caches each
// query separately, which made the index page lag behind the detail page after an
// edit). The blog/webinar routes are force-dynamic and low-traffic, so always-fresh
// reads are the right trade-off over edge caching.
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
})
