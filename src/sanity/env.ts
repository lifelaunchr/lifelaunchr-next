// Sanity project config. Project ID + dataset are public (they ship in the client bundle),
// so hardcoded defaults are fine; the env vars let Vercel override without a code change.
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '5wgy4b30'
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-10-01'
