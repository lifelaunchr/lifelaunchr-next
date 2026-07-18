'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Global safety net for accepting an invite when you ALREADY have an account.
 *
 * The invite token is stored in localStorage by /accept-invite but is only redeemed by
 * /onboarding. A brand-new invitee flows accept-invite → sign-up → onboarding, so it works.
 * But someone who already has a Soar account and is signed out hits /sign-up → "email taken"
 * → signs in → lands on /chat (the after-sign-in URL), which never runs the onboarding
 * redemption — so their pending invite is stranded.
 *
 * This catches a pending `migration_invite_token` on ANY authenticated landing and sends the
 * user to /onboarding, which redeems it (/accept-invite + /auth/sync) and routes by
 * account_type. Works for every role — student, parent, counselor. Loop-safe: onboarding's
 * `finally` always clears the token, so a stale/expired token is removed on the first pass.
 * A no-op whenever no token is present, so it never affects normal users.
 */
export default function PendingInviteRedirect() {
  const { isLoaded, isSignedIn } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    // Routes that already own the invite/auth flow — don't interfere (avoids redirect loops).
    if (
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/accept-invite') ||
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/sign-up') ||
      pathname.startsWith('/join')
    ) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem('migration_invite_token')) {
      router.replace('/onboarding')
    }
  }, [isLoaded, isSignedIn, pathname, router])

  return null
}
