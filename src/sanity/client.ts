import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId } from './env'

// Read-only client for published blog/webinar content. useCdn = true serves cached,
// published content from Sanity's edge (fast + cheap); pages revalidate on an interval.
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
})
