import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Public routes — no sign-in required.
 * Everything else is protected: unauthenticated users are redirected to sign-in.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/faq',
  '/terms',
  '/privacy',
  '/safety',         // public "How we keep teens safe" info page
  '/upgrade',        // public upsell page (visible to both signed-in and not)
  '/join(.*)',       // counselor invite acceptance landing
  '/accept-invite(.*)', // migration invite claim
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
