import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Public routes — accessible without signing in.
 * Everything else redirects unauthenticated users to the home page (not Clerk's
 * sign-in page directly), so they see the request-access form rather than a
 * sign-up option.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/faq',
  '/terms',
  '/privacy',
  '/safety',            // public "How we keep teens safe" info page
  '/upgrade',           // public upsell page
  '/join(.*)',          // counselor invite acceptance landing
  '/accept-invite(.*)', // migration invite claim
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
