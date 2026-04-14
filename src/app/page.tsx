'use client'

import { useEffect, useState } from 'react'
import { useAuth, SignInButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://lifelaunchr.onrender.com'

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    email: '',
    practice_name: '',
    user_type: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/chat')
    }
  }, [isLoaded, isSignedIn, router])

  // Show nothing while Clerk loads (prevents flash)
  if (!isLoaded) return null
  if (isSignedIn) return null

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please enter your name and email.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/invite-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Request failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or email help@lifelaunchr.com.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900 tracking-tight">
            Soar <span className="text-sm font-normal text-gray-400">by LifeLaunchr</span>
          </span>
          <nav className="flex items-center gap-5">
            <Link href="/upgrade" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Plans &amp; Pricing
            </Link>
            <SignInButton mode="modal">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Sign in
              </button>
            </SignInButton>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
            Meet Soar™
          </h1>
          <p className="text-xl sm:text-2xl text-blue-700 font-medium mb-8">
            Built by a counselor. Powered by AI.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed mb-5 max-w-2xl mx-auto">
            Most AI tools give students a smarter search engine. Soar&trade; gives them a college
            and career research assistant, armed with authoritative data on thousands of colleges
            and scholarships, hundreds of majors and enrichment programs, and the process
            knowledge to guide students, parents, and counselors toward the right decisions.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto">
            For IECs and school counselors, that means more than efficiency. Soar keeps you
            connected with your students between sessions, helps them make real progress on their
            own, and prepares you for every meeting — so you&apos;re not just faster,
            you&apos;re more effective. It&apos;s free to get started, and you can do real work.
          </p>
          {/* Privacy callout */}
          <div className="inline-block bg-blue-50 border border-blue-100 rounded-lg px-5 py-3 text-sm text-blue-800 max-w-xl text-left">
            Soar won&apos;t write essays for students, and won&apos;t sell your data or use your
            conversations to train AI models. What you share stays private.
          </div>
        </section>

        {/* How it works */}
        <section className="bg-gray-50 border-y border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
              How it works
            </h2>
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                {
                  step: '1',
                  title: 'Invite your families',
                  body: "Connect with your students and their families. Soar uses each student's information — GPA, test scores, college lists, activities — to personalize every conversation.",
                },
                {
                  step: '2',
                  title: 'Research with AI',
                  body: "Research anything for a student — fit, cost, deadlines, scholarships. Soar pulls real data, remembers what you've discussed, and guides the conversation with thoughtful follow-up questions.",
                },
                {
                  step: '3',
                  title: 'Stay organized',
                  body: "Track each student's colleges, scholarships, summer plans, and activities in one place. Parents, students, and you collaborate and share — everyone on one team.",
                },
              ].map(({ step, title, body }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold mb-4">
                    {step}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Request access form */}
        <section className="mx-auto max-w-xl px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Request access
          </h2>
          <p className="text-gray-500 text-center mb-8 text-sm">
            Soar is currently available by invitation. Tell us about yourself and we&apos;ll be
            in touch.
          </p>

          {submitted ? (
            <div className="rounded-lg bg-green-50 border border-green-200 px-6 py-8 text-center">
              <p className="text-green-800 font-medium text-lg mb-1">You&apos;re on the list!</p>
              <p className="text-green-700 text-sm">
                We&apos;ll be in touch at the email you provided. In the meantime, feel free to
                reach out at{' '}
                <a href="mailto:help@lifelaunchr.com" className="underline">
                  help@lifelaunchr.com
                </a>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="user_type">
                  I am a…
                </label>
                <select
                  id="user_type"
                  name="user_type"
                  value={form.user_type}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select one (optional)</option>
                  <option value="independent_counselor">Independent educational consultant</option>
                  <option value="school_counselor">School counselor</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice_name">
                  Practice or school name
                </label>
                <input
                  id="practice_name"
                  name="practice_name"
                  type="text"
                  value={form.practice_name}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="message">
                  Anything else you&apos;d like us to know?
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Optional"
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-blue-600 text-white py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Request access'}
              </button>

              <p className="text-center text-xs text-gray-400">
                Already have access?{' '}
                <SignInButton mode="modal">
                  <button type="button" className="underline hover:text-gray-600">
                    Sign in
                  </button>
                </SignInButton>
              </p>
            </form>
          )}
        </section>
      </main>

      {/* Footer is rendered by layout.tsx */}
    </div>
  )
}
