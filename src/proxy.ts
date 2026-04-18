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

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD
const COOKIE_NAME = 'soar_access'
const LOGIN_PATH = '/__soar_login'

// Minimal inline login page. `redirect` is the path to send the user after
// a successful password entry; it is preserved across wrong-password attempts
// via a hidden form field + query param.
function accessLoginPage(redirect: string, error = false): NextResponse {
  const safeRedirect = redirect.startsWith('/') ? redirect : '/'
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Soar — Restricted Access</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           background: #0c1b33; min-height: 100dvh; display: flex;
           align-items: center; justify-content: center; }
    .card { background: #fff; border-radius: 12px; padding: 40px 36px;
            width: 100%; max-width: 380px; text-align: center; }
    h1 { font-size: 1.4rem; font-weight: 700; color: #0c1b33; margin-bottom: 6px; }
    p { font-size: 0.88rem; color: #6b7280; margin-bottom: 24px; }
    input { width: 100%; border: 1px solid #d1d5db; border-radius: 8px;
            padding: 10px 14px; font-size: 0.95rem; outline: none;
            margin-bottom: 12px; }
    input:focus { border-color: #7dd3fc; box-shadow: 0 0 0 2px rgba(125,211,252,0.3); }
    button { width: 100%; background: #0c1b33; color: #fff; border: none;
             border-radius: 8px; padding: 11px; font-size: 0.95rem;
             font-weight: 600; cursor: pointer; }
    .error { color: #dc2626; font-size: 0.82rem; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Soar</h1>
    <p>This environment is restricted. Enter the access password to continue.</p>
    ${error ? '<p class="error">Incorrect password — try again.</p>' : ''}
    <form method="POST" action="${LOGIN_PATH}">
      <input type="hidden" name="redirect" value="${safeRedirect}" />
      <input type="password" name="password" placeholder="Password" autofocus />
      <button type="submit">Continue</button>
    </form>
  </div>
</body>
</html>`
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

export default clerkMiddleware(async (auth, req) => {
  const url = new URL(req.url)

  // ── ACCESS_PASSWORD gate ──────────────────────────────────────────────────
  // If ACCESS_PASSWORD is set, require a valid cookie before allowing access.
  // Uses a dedicated login route (/__soar_login) with POST-Redirect-GET so
  // wrong-password errors never cause redirect loops.
  if (ACCESS_PASSWORD) {
    if (url.pathname === LOGIN_PATH) {
      if (req.method === 'POST') {
        // Process password submission
        const body = await req.text()
        const params = new URLSearchParams(body)
        const submitted = params.get('password') ?? ''
        const redirect = params.get('redirect') || '/'

        if (submitted === ACCESS_PASSWORD) {
          // Correct — set cookie and send to intended destination.
          // 303 See Other converts POST → GET so the destination isn't hit as a POST.
          const res = NextResponse.redirect(new URL(redirect, req.url), { status: 303 })
          res.cookies.set(COOKIE_NAME, ACCESS_PASSWORD, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
          })
          return res
        }

        // Wrong password — PRG: redirect back to login page with error flag,
        // preserving the original redirect target
        const loginUrl = new URL(LOGIN_PATH, req.url)
        loginUrl.searchParams.set('redirect', redirect)
        loginUrl.searchParams.set('error', '1')
        return NextResponse.redirect(loginUrl, { status: 303 })
      }

      // GET /__soar_login — serve the login page
      const error = url.searchParams.get('error') === '1'
      const redirect = url.searchParams.get('redirect') || '/'
      return accessLoginPage(redirect, error)
    }

    // All other routes: check for valid cookie
    const cookie = req.headers.get('cookie') ?? ''
    const cookieValue = cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')[1]

    if (cookieValue !== ACCESS_PASSWORD) {
      const loginUrl = new URL(LOGIN_PATH, req.url)
      loginUrl.searchParams.set('redirect', url.pathname + url.search)
      return NextResponse.redirect(loginUrl)
    }
  }
  // ── end ACCESS_PASSWORD gate ──────────────────────────────────────────────

  const { userId } = await auth()
  const { pathname } = url

  // Signed-in users hitting the landing page get redirected to /chat immediately,
  // before any HTML is sent to the browser.
  if (userId && pathname === '/') {
    return NextResponse.redirect(new URL('/chat', req.url))
  }

  if (!isPublicRoute(req)) {
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
