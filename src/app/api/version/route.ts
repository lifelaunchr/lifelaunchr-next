import { NextResponse } from 'next/server'

// Report the commit SHA of the currently-running deployment. Evaluated at request
// time (force-dynamic + no-store) so it always reflects what production is serving
// *now* — a tab that loaded an older build compares this against the `buildId` it was
// server-rendered with (passed from the root layout) and prompts a reload when they
// differ (next#85).
export const dynamic = 'force-dynamic'

export function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA || 'dev'
  return NextResponse.json(
    { version },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
