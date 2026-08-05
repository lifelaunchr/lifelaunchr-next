'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useUser, useClerk } from '@clerk/nextjs'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function Setting() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-slate-400 text-sm">Setting up your account…</p>
    </main>
  )
}

function AcceptInviteInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()

  // When a DIFFERENT account is signed in on this browser, we block redemption and
  // force a sign-out first (app#170 / next#69). Opening an invite link while, e.g.,
  // your kid is still signed in would otherwise redeem the invite against the wrong
  // Clerk session — corrupting an account or 500ing on a clerk_id collision.
  const [mismatch, setMismatch] = useState<{ inviteEmail: string; currentEmail: string } | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    const token = searchParams.get('token')
    if (token) localStorage.setItem('migration_invite_token', token)

    if (!isSignedIn) {
      router.replace('/sign-up')
      return
    }
    if (!token) {
      router.replace('/onboarding')
      return
    }

    // Signed in — confirm this invite is actually for the signed-in person.
    const currentEmail = (user?.primaryEmailAddress?.emailAddress || '').trim()
    let cancelled = false
    fetch(`${API}/invites/target/${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(info => {
        if (cancelled) return
        const inviteEmail = (info?.email || '').trim()
        if (
          info?.valid &&
          inviteEmail &&
          currentEmail &&
          inviteEmail.toLowerCase() !== currentEmail.toLowerCase()
        ) {
          setMismatch({ inviteEmail, currentEmail })
        } else {
          router.replace('/onboarding')
        }
      })
      .catch(() => { if (!cancelled) router.replace('/onboarding') })
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, user, searchParams, router])

  if (mismatch) {
    const token = searchParams.get('token') || ''
    const returnUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`
        : '/accept-invite'
    const handleSignOut = async () => {
      setSigningOut(true)
      try {
        // Let Clerk own the post-sign-out navigation so the session cookie is fully
        // cleared BEFORE we land back on the invite. A manual reload here raced the
        // sign-out and intermittently re-showed this screen (the reload re-read a
        // still-present session cookie). redirectUrl clears then navigates atomically.
        await signOut({ redirectUrl: returnUrl })
      } catch {
        // Fallback only if the SDK redirect didn't fire.
        window.location.href = returnUrl
      }
    }
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <h1 className="text-lg font-semibold text-slate-800 mb-3">
            This invitation isn&apos;t for this account
          </h1>
          <p className="text-sm text-slate-600 mb-1">
            This invitation is for <strong>{mismatch.inviteEmail}</strong>,
          </p>
          <p className="text-sm text-slate-600 mb-5">
            but you&apos;re signed in as <strong>{mismatch.currentEmail}</strong>.
          </p>
          <p className="text-sm text-slate-600 mb-6">
            Sign out and continue to accept this invitation with the right account.
          </p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full rounded-md bg-indigo-600 text-white py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {signingOut ? 'Signing out…' : 'Sign out & continue'}
          </button>
        </div>
      </main>
    )
  }

  return <Setting />
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<Setting />}>
      <AcceptInviteInner />
    </Suspense>
  )
}
