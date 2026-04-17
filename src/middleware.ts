import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Routes that are accessible without signing in
const isPublicRoute = createRouteMatcher([
  '/',
  '/upgrade',
  '/faq',
  '/terms',
  '/privacy',
  '/safety',
  '/join(.*)',
  '/accept-invite(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const { pathname } = req.nextUrl

  // Signed-in users hitting the landing page get redirected to /chat immediately,
  // before any HTML is sent to the browser.
  if (userId && pathname === '/') {
    return NextResponse.redirect(new URL('/chat', req.url))
  }

  // All non-public routes require auth. Clerk handles the redirect to sign-in.
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Run middleware on all routes except Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
