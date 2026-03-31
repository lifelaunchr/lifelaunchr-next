'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

function AcceptInviteInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()

  useEffect(() => {
    if (!isLoaded) return

    const token = searchParams.get('token')
    if (token) {
      // Persist across sign-up redirect
      sessionStorage.setItem('migration_invite_token', token)
    }

    if (isSignedIn) {
      // Already signed in — onboarding will handle the token
      router.replace('/onboarding')
    } else {
      router.replace('/sign-up')
    }
  }, [isLoaded, isSignedIn, searchParams, router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-slate-400 text-sm">Setting up your account…</p>
    </main>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-900">
          <p className="text-slate-400 text-sm">Setting up your account…</p>
        </main>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  )
}
