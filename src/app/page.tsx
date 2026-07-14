'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://lifelaunchr.onrender.com'

// The home page mirrors the app-wide access gate — the same NEXT_PUBLIC_CLERK_ALLOWLIST_ENABLED
// flag CounselorCheckout uses. Allowlist ON = invite-only private beta → request-access form;
// allowlist OFF = open sign-up → "Start free today" CTA. Going public is then one env change
// that flips the messaging AND real signup access together, and the two can never drift apart.
const ALLOWLIST_ENABLED = process.env.NEXT_PUBLIC_CLERK_ALLOWLIST_ENABLED === 'true'
const ACCESS_PUBLIC = !ALLOWLIST_ENABLED

const TRUST_MARKERS: { label: string; note: string; logo?: string }[] = [
  { label: 'HECA Business Partner', logo: '/heca-business-partner.png', note: 'a member of HECA’s Business Partner program' },
  { label: 'Student data is protected', note: 'never sold, and never used to train AI models because we use the Anthropic API' },
]

const STEPS = [
  {
    step: '1',
    title: 'Invite your families',
    body: "Connect with your students and their families. Soar uses each student's information (GPA, test scores, college list, activities) to personalize every conversation from day one.",
  },
  {
    step: '2',
    title: 'Work with them using AI',
    body: "Research anything for a student: fit, cost, deadlines, scholarships, majors, careers. Soar pulls real data, remembers what you've discussed, and guides the conversation with thoughtful follow-up questions. When you research on behalf of a student, it goes into their shared record automatically. Build college and scholarship lists, generate meeting notes, make writing assignments, plan essays, and build activities lists.",
  },
  {
    step: '3',
    title: 'Stay organized',
    body: "Track each student's colleges, scholarships, summer plans, and activities in one place. Parents, students, and you see the same record and arrive at every session ready to do real work.",
  },
]

const FEATURES = [
  'Research colleges by major, size, location, cost, culture, and fit, using real data on 1,800+ schools',
  'Estimate admissions likelihood from a student’s actual profile, with a plain-English explanation',
  'Search 6,700+ scholarships scored against each student',
  'Explore majors and careers, and search 250+ enrichment programs',
  'Analyze transcripts, including international transcripts and dual enrollment',
  'Organize college and scholarship lists, activities, and deadlines in one shared record',
  'Draft session reports and meeting briefs so you walk into every meeting prepared',
  'Coach essays in the Writing Hub, where humans do the coaching and Soar never writes the essay',
]

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  // Client-side fallback for cases where the server-side redirect in proxy.ts
  // didn't fire (e.g. Brave tab isolation blocking the session cookie).
  // If Clerk detects an active session via localStorage, redirect immediately.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/chat')
    }
  }, [isLoaded, isSignedIn, router])

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
      setError('Something went wrong. Please try again or email help@withsoar.ai.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header style={{ background: '#0c1b33' }}>
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight" style={{ color: '#fff' }}>
            <span style={{ color: '#7dd3fc' }}>Soar</span>
          </span>
          <nav className="flex items-center gap-5">
            <Link href="/upgrade" className="text-sm transition-colors" style={{ color: '#a0aec0' }}>
              Plans &amp; Pricing
            </Link>
            {isSignedIn ? (
              <Link href="/chat" className="text-sm font-medium transition-colors" style={{ color: '#fff' }}>
                Open Soar →
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm font-medium transition-colors" style={{ color: '#fff' }}>
                  Sign in
                </Link>
                {ACCESS_PUBLIC && (
                  <Link
                    href="/sign-up"
                    className="text-sm font-semibold rounded-md px-3 py-1.5 transition-opacity hover:opacity-90"
                    style={{ background: '#7dd3fc', color: '#0c1b33' }}
                  >
                    Sign up
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section style={{ background: '#0c1b33' }}>
          <div className="mx-auto max-w-3xl px-6 pt-16 pb-14 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-8" style={{ color: '#fff' }}>
              Soar: the College Counselor&rsquo;s Edge in a World Run by AI.
            </h1>
            <p className="text-lg leading-relaxed mb-5 max-w-2xl mx-auto" style={{ color: '#cbd5e1' }}>
              Your students are already using AI for college planning. They&rsquo;re doing it late at
              night, without you in the room. And college admissions conversations now range far
              beyond: careers, majors, costs, scholarships, and everything in between. Soar&trade; is
              the AI college and career planning platform that has your back: an AI that actually
              knows each student and has deep knowledge of college and career, with a shared record
              of everything they explore.
            </p>
            <p className="text-lg leading-relaxed mb-5 max-w-2xl mx-auto" style={{ color: '#cbd5e1' }}>
              Where general AI hands students a smarter search engine, Soar is built for the whole
              job. It researches colleges, scholarships, majors, and careers on authoritative data
              covering 1,800+ colleges, 6,700+ scholarships, and 250+ enrichment programs. It
              organizes lists, deadlines, and activities. It guides essays and self-discovery in the
              Writing Hub. And it prepares you for every session, all personalized to each student
              and remembered over time.
            </p>
            <p className="text-lg leading-relaxed mb-5 max-w-2xl mx-auto" style={{ color: '#cbd5e1' }}>
              For IECs and school counselors, Soar keeps you connected with your students between
              sessions, helps them make real progress on their own, and makes your time with students
              count for more. It helps you meet the challenges of a changing college counseling world.
              Soar is free to get started, and you can do meaningful work from day one.
            </p>
            <p className="text-base leading-relaxed mb-10 max-w-2xl mx-auto italic" style={{ color: '#7dd3fc' }}>
              Built by a counselor who has been working with AI since before it was cool.
            </p>

            {ACCESS_PUBLIC && (
              <div className="mb-10">
                <Link
                  href="/sign-up"
                  className="inline-block rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: '#7dd3fc', color: '#0c1b33' }}
                >
                  Sign up now — free for up to 3 students
                </Link>
              </div>
            )}

            {/* Privacy callout */}
            <div
              className="inline-block rounded-lg px-5 py-3 text-sm max-w-xl text-left"
              style={{ background: 'rgba(125,211,252,0.08)', border: '1px solid rgba(125,211,252,0.2)', color: '#93c5fd' }}
            >
              Soar won&rsquo;t write essays for students, and won&rsquo;t sell your data or use your
              conversations to train AI models. What you share stays private.
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b border-gray-100" style={{ background: '#f8fafc' }}>
          <div className="mx-auto max-w-5xl px-6 py-6">
            <div className="grid gap-6 sm:grid-cols-2 items-start max-w-3xl mx-auto">
              {TRUST_MARKERS.map(({ label, note, logo }) => (
                <div key={label} className="text-center sm:text-left">
                  {logo ? (
                    <div className="flex justify-center sm:justify-start mb-2">
                      <span className="inline-block bg-white rounded-lg border border-gray-200 px-5 py-3.5">
                        <Image src={logo} alt={label} width={216} height={73} />
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How it works</h2>
            <div className="grid sm:grid-cols-3 gap-8">
              {STEPS.map(({ step, title, body }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div
                    className="w-10 h-10 rounded-full text-white flex items-center justify-center text-lg font-bold mb-4"
                    style={{ background: '#0c1b33' }}
                  >
                    {step}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Soar and not ChatGPT */}
        <section className="bg-gray-50 border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
              Why Soar, and not ChatGPT?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4 max-w-2xl mx-auto text-center">
              <strong>Keep using ChatGPT and Claude for your newsletter, client emails, and general
              research.</strong> Soar is what those tools would be if they had spent a decade in a
              college counseling office.
            </p>
            <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto text-center">
              General AI does not know your student and can hallucinate acceptance rates and aid
              figures. Soar knows each student&rsquo;s profile, works from authoritative data, applies
              real counseling methodology, and keeps a permanent shared record.
            </p>
          </div>
        </section>

        {/* College is the gateway to careers and life */}
        <section className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
              College is the gateway to careers and life
            </h2>
            <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto text-center">
              Soar also covers the parts of this work that have grown: careers and where a major
              actually leads, scholarships and the cost of college, and the enrichment programs that
              strengthen a student&rsquo;s profile. Soar helps you cover the ground, so you can focus
              on the judgment and mentorship your students need as they plan their life.
            </p>
          </div>
        </section>

        {/* Built to make you more effective */}
        <section className="bg-gray-50 border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
              Built to make you more effective
            </h2>
            <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto text-center">
              Soar is built to make your work better, not just save time. Families with AI in their
              pocket are asking what a counselor adds that a chatbot doesn&rsquo;t. Soar helps you
              become the professional who teaches students to use AI well, who sees everything they
              explore, and who brings the judgment, mentorship, and honest conversations a chatbot
              never will. And Soar works alongside the tools you already use: Scoir, Maia Learning,
              College Planner Pro, and others.
            </p>
          </div>
        </section>

        {/* What Soar does */}
        <section className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-14">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">What Soar does</h2>
            <ul className="grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                  <span aria-hidden="true" style={{ color: '#0c1b33' }} className="mt-0.5 font-bold">
                    →
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* From counselors using Soar */}
        <section className="bg-gray-50 border-b border-gray-100">
          <div className="mx-auto max-w-2xl px-6 py-14">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              From counselors using Soar
            </h2>
            <div className="space-y-5">
              <figure className="rounded-xl bg-white border border-gray-200 px-6 py-6 shadow-sm">
                <blockquote className="text-gray-800 leading-relaxed">
                  &ldquo;It&rsquo;s helped me go deeper. The surface-level first hour is gone, my
                  students have already answered those questions, so now we start where the real
                  conversation begins.&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">Ranna Patel</span>, College
                  Admissions Consultant, San Francisco Bay Area
                </figcaption>
              </figure>
              <figure className="rounded-xl bg-white border border-gray-200 px-6 py-6 shadow-sm">
                <blockquote className="text-gray-800 leading-relaxed">
                  &ldquo;A student with a 3.0 wanted a professional sales program, practice rooms
                  without a music major, and Greek life. I didn&rsquo;t even know where to start.
                  Not only did I get the answer, I learned about an entire niche of college life
                  I&rsquo;d never heard of.&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">Kelly Hertzig</span>, Independent
                  Educational Consultant, San Jose, CA
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* CTA — request access (private beta) OR sign up (public) */}
        <section className="mx-auto max-w-xl px-6 py-16">
          {ACCESS_PUBLIC ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Start free today</h2>
              <p className="text-gray-500 mb-6 text-sm">
                Free for up to three students, no credit card required. Add more students any time.
              </p>
              <Link
                href="/sign-up"
                className="inline-block rounded-md px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: '#0c1b33' }}
              >
                Sign up now — free for up to 3 students
              </Link>
              <p className="text-xs text-gray-400 mt-4">
                For IECs and school counselors. Students and families join by invitation from their
                counselor.
              </p>
              <p className="text-center text-xs text-gray-400 mt-6">
                Already have access?{' '}
                <Link href="/sign-in" className="underline hover:text-gray-600">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Request access for your practice or school
              </h2>
              <p className="text-gray-500 text-center mb-8 text-sm">
                Soar is for IECs and school counselors. Students and families join by invitation from
                their counselor, not through this form. Tell us about your practice and we&rsquo;ll be
                in touch.
              </p>

              {submitted ? (
                <div className="rounded-lg bg-green-50 border border-green-200 px-6 py-8 text-center">
                  <p className="text-green-800 font-medium text-lg mb-1">You&rsquo;re on the list!</p>
                  <p className="text-green-700 text-sm">
                    We&rsquo;ll be in touch at the email you provided. In the meantime, feel free to
                    reach out at{' '}
                    <a href="mailto:help@withsoar.ai" className="underline">
                      help@withsoar.ai
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
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
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
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
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
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                    >
                      <option value="">Select one (optional)</option>
                      <option value="independent_counselor">Independent educational consultant</option>
                      <option value="school_counselor">School counselor</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="practice_name">
                      Company, practice, or school name
                    </label>
                    <input
                      id="practice_name"
                      name="practice_name"
                      type="text"
                      value={form.practice_name}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="message">
                      Anything else you&rsquo;d like us to know?
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                      placeholder="Optional"
                    />
                  </div>

                  {error && <p className="text-red-600 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-md text-white py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
                    style={{ background: '#0c1b33' }}
                  >
                    {submitting ? 'Submitting…' : 'Request access'}
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    Already have access?{' '}
                    {isSignedIn ? (
                      <Link href="/chat" className="underline hover:text-gray-600">
                        Open Soar →
                      </Link>
                    ) : (
                      <Link href="/sign-in" className="underline hover:text-gray-600">
                        Sign in
                      </Link>
                    )}
                  </p>
                </form>
              )}
            </>
          )}
        </section>

        {/* Parent / student callout */}
        <section className="border-t border-gray-100" style={{ background: '#f8fafc' }}>
          <div className="mx-auto max-w-2xl px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Are you a parent or student?</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Soar gives your student a college and career planning partner that actually knows them,
              and gives you a window into the process. It works through your counselor, so if you&rsquo;d
              like to use it, ask your IEC or school counselor to set up Soar and invite you. There&rsquo;s
              a free tier for up to three students, so they can get started at no cost.
            </p>
            <Link
              href="/families"
              className="inline-block mt-4 text-sm font-medium text-blue-600 hover:underline"
            >
              Learn how it works for families →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer is rendered by layout.tsx */}
    </div>
  )
}
