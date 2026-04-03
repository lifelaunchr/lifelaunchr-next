'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function JoinContent() {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const { user: clerkUser } = useUser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const code = searchParams.get('code')

  const [step, setStep] = useState<'loading' | 'confirm' | 'done' | 'already_linked' | 'no_link' | 'self_link' | 'counselor_limit' | 'error'>('loading')
  const [inviterName, setInviterName] = useState('')
  const [inviterType, setInviterType] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // Track whether the user was already signed in when they arrived (vs. just signed up via this invite)
  const [arrivedSignedIn] = useState(() => {
    if (typeof window === 'undefined') return true
    const isNew = sessionStorage.getItem('invite_new_user') === 'true'
    if (isNew) sessionStorage.removeItem('invite_new_user')
    return !isNew
  })

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn || !clerkUser) return  // show sign-in prompt instead
    if (!code) { setStep('error'); setErrorMsg('No invite code found in the URL.'); return }

    const accept = async () => {
      try {
        const token = await getToken()

        // Ensure the user has a DB row before calling /invites/accept.
        // This handles new users who signed up via the invite link and
        // were redirected back here before ever visiting /chat (where
        // auth/sync normally runs).
        await fetch(`${apiUrl}/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            clerk_user_id: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            full_name: clerkUser.fullName || clerkUser.firstName || '',
            account_type: 'student',
          }),
        })

        const res = await fetch(`${apiUrl}/invites/accept/${code}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setErrorMsg(body.detail || 'This invite link is invalid or has expired.')
          setStep('error')
          return
        }
        const data = await res.json()
        if (data.status === 'self') {
          setStep('self_link')
          return
        }
        if (data.status === 'already_linked') {
          setInviterName(data.inviter_name || 'your contact')
          setInviterType(data.inviter_type || '')
          setStep('already_linked')
          return
        }
        if (!data.relationship_proposed) {
          setInviterName(data.inviter_name || '')
          setStep('no_link')
          return
        }
        setInviterName(data.inviter_name || 'your contact')
        setInviterType(data.inviter_type || '')
        setStep('confirm')
      } catch {
        setErrorMsg('Something went wrong. Please try again.')
        setStep('error')
      }
    }
    accept()
  }, [isLoaded, isSignedIn, clerkUser, code, getToken, apiUrl])

  const confirm = async () => {
    if (!code) return
    setConfirming(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/invites/confirm/${code}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.detail === 'COUNSELOR_AT_CAPACITY') {
          setStep('counselor_limit')
          return
        }
        setErrorMsg(body.detail || 'Something went wrong confirming. Please try again.')
        setStep('error')
        return
      }
      setStep('done')
      setTimeout(() => router.push('/chat'), 2500)
    } catch {
      setErrorMsg('Something went wrong confirming. Please try again.')
      setStep('error')
    } finally {
      setConfirming(false)
    }
  }

  const roleLabel = inviterType === 'counselor' ? 'counselor' : inviterType === 'parent' ? 'parent' : 'contact'

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
              <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">Soar by LifeLaunchr</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          {/* Not signed in */}
          {isLoaded && !isSignedIn && (
            <>
              <h1 className="text-xl font-bold text-gray-800 mb-3">You&apos;ve been invited</h1>
              <p className="text-gray-500 text-sm mb-6">
                Sign in or create an account to accept this invitation and connect your workspace.
              </p>
              <Link
                href={`/sign-in?redirect_url=${encodeURIComponent(`/join?code=${code}`)}`}
                className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm mb-3"
              >
                Sign in
              </Link>
              <button
                onClick={() => {
                  if (code) sessionStorage.setItem('pending_invite_code', code)
                  sessionStorage.setItem('invite_new_user', 'true')
                  router.push(`/sign-up?redirect_url=${encodeURIComponent('/onboarding')}`)
                }}
                className="block w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Create an account
              </button>
            </>
          )}

          {/* Loading */}
          {isSignedIn && step === 'loading' && (
            <p className="text-gray-400 text-sm py-4">Checking invite…</p>
          )}

          {/* Confirm connection */}
          {step === 'confirm' && (
            <>
              <div className="text-4xl mb-4">🔗</div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">Connect with {inviterName}</h1>
              <p className="text-gray-500 text-sm mb-6">
                {inviterType === 'counselor'
                  ? `Connecting links you to ${inviterName}'s counselor workspace. They'll be able to see your research sessions and help guide your college search.`
                  : inviterType === 'parent'
                  ? `Connecting allows ${inviterName} to see your non-private research sessions.`
                  : `Connecting links your account with ${inviterName}.`}
              </p>
              <button
                onClick={confirm}
                disabled={confirming}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm mb-3"
              >
                {confirming ? 'Connecting…' : `Connect with ${inviterName}`}
              </button>
              <Link href="/chat" className="block text-sm text-gray-400 hover:text-gray-600">
                Maybe later
              </Link>
            </>
          )}

          {/* Done */}
          {step === 'done' && (
            <>
              <div className="text-4xl mb-4">✅</div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">You&apos;re connected!</h1>
              <p className="text-gray-500 text-sm">
                You&apos;re now linked with your {roleLabel}. Redirecting to Soar…
              </p>
            </>
          )}

          {/* Already connected */}
          {step === 'already_linked' && (
            <>
              <div className="text-4xl mb-4">✅</div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">You&apos;re already connected!</h1>
              <p className="text-gray-500 text-sm mb-6">
                You&apos;re already linked with {inviterName}. No action needed.
              </p>
              <Link href="/chat" className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Go to Soar
              </Link>
            </>
          )}

          {/* Peer invite — accounts don't create a relationship with each other */}
          {step === 'no_link' && (
            <>
              <div className="text-4xl mb-4">👋</div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">
                {arrivedSignedIn ? 'Welcome back to Soar!' : 'Welcome to Soar!'}
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                You can use Soar with full access, but a connection won&apos;t be created between you{inviterName ? ` and ${inviterName}` : ''}. Connections are between counselors and students, or parents and students. But your Soar account is live!
              </p>
              <Link href="/chat" className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Go to Soar →
              </Link>
            </>
          )}

          {/* Self-invite */}
          {step === 'self_link' && (
            <>
              <div className="text-4xl mb-4">😄</div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">That&apos;s your own link!</h1>
              <p className="text-gray-500 text-sm mb-6">
                Share this link with a student, parent, or counselor to connect your accounts.
              </p>
              <Link href="/chat" className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Go to Soar
              </Link>
            </>
          )}

          {/* Counselor at capacity */}
          {step === 'counselor_limit' && (
            <>
              <div className="text-4xl mb-4">📋</div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">Your counselor&apos;s account is full</h1>
              <p className="text-gray-500 text-sm mb-6">
                They&apos;ve reached the student limit on their current plan. Ask them to upgrade to connect with you.
                <br /><br />
                In the meantime, you have full access to Soar and can start researching colleges right now.
              </p>
              <Link
                href={arrivedSignedIn ? '/chat' : '/onboarding'}
                className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                {arrivedSignedIn ? 'Go to Soar →' : 'Start using Soar →'}
              </Link>
            </>
          )}

          {/* Error */}
          {step === 'error' && (
            <>
              <div className="text-4xl mb-4">⚠️</div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
              <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
              <Link href="/chat" className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Go to Soar
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    }>
      <JoinContent />
    </Suspense>
  )
}
