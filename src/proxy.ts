import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Public routes — accessible without signing in.
 * Everything else is protected: unauthenticated users are redirected to sign-in.
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
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
