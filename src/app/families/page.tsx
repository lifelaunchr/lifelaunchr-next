'use client'

import { useState } from 'react'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://lifelaunchr.onrender.com'

// A short note a family can copy and forward to their own counselor (family-empowerment path,
// alongside the referral form which reaches the Soar team).
const FORWARD_NOTE = `Hi [Counselor's name],

I came across Soar (withsoar.ai), an AI college and career planning platform that works through counselors like you. Students and parents join by invitation, so I am not able to sign up on my own. Would you be open to setting it up and inviting me?

There's a free tier for up to three students, so you can try it at no cost. It would give me a research partner that knows my profile and keeps everything in one place, and it would give you visibility into what I am working on between our meetings.

Thank you for considering it.
[Your name]`

const STUDENT_GETS = [
  'An AI that knows their profile, so its answers actually fit them, and that does not invent acceptance rates or financial aid figures.',
  'A partner that remembers everything they have explored, so they never start from scratch.',
  'Help across the whole journey: majors and careers, college fit, cost and financial aid, scholarships, and enrichment and summer programs.',
  'Transcript analysis, including international transcripts and dual-enrollment coursework.',
  'Essay coaching where their counselor does the coaching and Soar never writes the essay. Soar supports the thinking and planning; the words stay the student’s own.',
]

const PARENT_GETS = [
  'A window into what your student is researching and where they are in the process.',
  'A place to ask your own questions, so you can stay involved without getting in the way of the counseling relationship.',
  'Free parent accounts, always.',
  'One shared record: you, your student, and your counselor all see the same research.',
]

const SAFETY = [
  { h: 'Crisis scanning.', b: 'Every student message is scanned for crisis language before Soar responds. If something is flagged, you and the counselor are both notified immediately, and Soar responds with the 988 Suicide and Crisis Lifeline.' },
  { h: 'Your data is not a product.', b: 'Student conversations are never sold and never used to train AI models.' },
  { h: 'Honest transparency.', b: 'Soar is a shared workspace, so your student’s counselor can see their conversations. That visibility is deliberate, and it is what makes each session more useful. Your family should understand that before sharing anything sensitive.' },
]

export default function FamiliesPage() {
  const [form, setForm] = useState({
    name: '', email: '', role: '', grad_year: '', counselor_name: '', counselor_email: '', message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please enter your name and email.')
      return
    }
    setError('')
    setSubmitting(true)
    const message = [
      '[FAMILY REFERRAL]',
      `Graduation year: ${form.grad_year.trim() || '—'}`,
      `Counselor: ${form.counselor_name.trim() || '—'} (${form.counselor_email.trim() || '—'})`,
      '',
      form.message.trim(),
    ].join('\n').trim()
    try {
      const res = await fetch(`${API_BASE}/invite-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          user_type: form.role || 'family',
          message,
        }),
      })
      if (!res.ok) throw new Error('failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or email help@withsoar.ai.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(FORWARD_NOTE)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — no-op
    }
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400'

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900 tracking-tight">
            Soar
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            For counselors →
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section style={{ background: '#0c1b33' }}>
          <div className="mx-auto max-w-3xl px-6 pt-14 pb-12 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-5" style={{ color: '#fff' }}>
              Soar gives your student a college and career planning partner that actually knows them.
            </h1>
            <p className="text-lg leading-relaxed mb-4 max-w-2xl mx-auto" style={{ color: '#cbd5e1' }}>
              Soar is an AI college and career planning platform that your IEC or school counselor
              sets up and invites you into. Your student gets a knowledgeable research partner, you
              get a window into the whole process, and everyone works from one shared record.
            </p>
            <p className="text-sm max-w-2xl mx-auto" style={{ color: '#93c5fd' }}>
              Families join Soar through their counselor, so there is nothing to buy or sign up for
              here. Here is what it does, and how to get it.
            </p>
          </div>
        </section>

        {/* Learning to use AI */}
        <section className="bg-gray-50 border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Learning to use AI, the right way</h2>
            <p className="text-gray-600 leading-relaxed">
              Your student will use AI for the rest of their life, in college, in work, everywhere.
              What matters is whether they learn to use it well. Soar gives them a place to do that
              with their counselor guiding the way, and with answers grounded in real data rather
              than a chatbot&rsquo;s confident guess. That&rsquo;s a habit your student carries far
              beyond the college search.
            </p>
          </div>
        </section>

        {/* What your student gets */}
        <section className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">What your student gets</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Soar is built for the whole college and career journey, and it knows your student while
              it helps:
            </p>
            <ul className="space-y-2">
              {STUDENT_GETS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                  <span aria-hidden="true" className="mt-0.5 font-bold" style={{ color: '#0c1b33' }}>→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What you get as a parent */}
        <section className="bg-gray-50 border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">What you get as a parent</h2>
            <ul className="space-y-2">
              {PARENT_GETS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                  <span aria-hidden="true" className="mt-0.5 font-bold" style={{ color: '#0c1b33' }}>→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works for families */}
        <section className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-5">How it works for families</h2>
            <ol className="space-y-4">
              {[
                { h: 'Your counselor invites you.', b: 'Students and parents join by invitation from their IEC or school counselor. There is no direct family sign-up, which keeps a professional guiding the process for every student.' },
                { h: 'Starting costs nothing.', b: 'Soar has a free tier for up to three students, so a counselor can get your family set up at no cost.' },
                { h: 'You share one record.', b: 'You, your student, and your counselor all work from the same research record, so everyone stays on the same page between meetings.' },
              ].map(({ h, b }, i) => (
                <li key={h} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full text-white flex items-center justify-center text-sm font-bold" style={{ background: '#0c1b33' }}>
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong className="text-gray-900">{h}</strong> {b}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Safety and privacy */}
        <section className="bg-gray-50 border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Safety and privacy, for parents</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We built Soar for high school students, and we want you to know exactly how it protects
              them.
            </p>
            <ul className="space-y-3">
              {SAFETY.map(({ h, b }) => (
                <li key={h} className="text-sm text-gray-700 leading-relaxed">
                  <strong className="text-gray-900">{h}</strong> {b}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Referral form */}
        <section className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-xl px-6 py-14">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
              Interested? Let us help you connect with your counselor.
            </h2>
            <p className="text-gray-500 text-center mb-8 text-sm">
              Tell us a little about you, and we&rsquo;ll follow up to help your family get set up
              with Soar through your counselor.
            </p>

            {submitted ? (
              <div className="rounded-lg bg-green-50 border border-green-200 px-6 py-8 text-center">
                <p className="text-green-800 font-medium text-lg mb-1">Thanks, we&rsquo;ve got it.</p>
                <p className="text-green-700 text-sm">
                  We&rsquo;ll follow up with you by email to help you get connected with Soar through
                  your counselor. We won&rsquo;t cold-email your counselor. That introduction is
                  yours to make, and we&rsquo;re glad to help you make it. Questions in the meantime?
                  Reach us at{' '}
                  <a href="mailto:help@withsoar.ai" className="underline">help@withsoar.ai</a>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
                      Your name <span className="text-red-500">*</span>
                    </label>
                    <input id="name" name="name" type="text" value={form.name} onChange={handleChange} required className={inputClass} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                      Your email <span className="text-red-500">*</span>
                    </label>
                    <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required className={inputClass} placeholder="you@example.com" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">I am a…</label>
                    <select id="role" name="role" value={form.role} onChange={handleChange} className={`${inputClass} bg-white`}>
                      <option value="">Select one (optional)</option>
                      <option value="parent">Parent</option>
                      <option value="student">Student</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="grad_year">
                      Student&rsquo;s graduation year <span className="text-gray-400">(optional)</span>
                    </label>
                    <input id="grad_year" name="grad_year" type="text" value={form.grad_year} onChange={handleChange} className={inputClass} placeholder="e.g. 2028" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="counselor_name">
                      Your counselor&rsquo;s name <span className="text-gray-400">(optional)</span>
                    </label>
                    <input id="counselor_name" name="counselor_name" type="text" value={form.counselor_name} onChange={handleChange} className={inputClass} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="counselor_email">
                      Your counselor&rsquo;s email <span className="text-gray-400">(optional)</span>
                    </label>
                    <input id="counselor_email" name="counselor_email" type="email" value={form.counselor_email} onChange={handleChange} className={inputClass} placeholder="Optional" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="message">
                    Anything you&rsquo;d like us to know? <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea id="message" name="message" value={form.message} onChange={handleChange} rows={3} className={`${inputClass} resize-none`} placeholder="Optional" />
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <button type="submit" disabled={submitting} className="w-full rounded-md text-white py-2.5 text-sm font-medium transition-opacity disabled:opacity-60" style={{ background: '#0c1b33' }}>
                  {submitting ? 'Sending…' : 'Send my interest'}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  We use what you share only to follow up with you. We won&rsquo;t contact your
                  counselor without your go-ahead, and we never sell your information.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Closing CTA + forwardable note */}
        <section className="bg-gray-50">
          <div className="mx-auto max-w-2xl px-6 py-14">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
              Ask your counselor about Soar
            </h2>
            <p className="text-gray-600 leading-relaxed text-center mb-6">
              The best next step is a quick note to your IEC or school counselor asking them to set
              up Soar and invite you. There&rsquo;s a free tier for up to three students, so they can
              start at no cost. You can send us your interest above, or forward the note below to
              your counselor directly.
            </p>

            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-medium text-gray-500">
                  Subject: Would you set up Soar for me?
                </span>
                <button
                  onClick={copyNote}
                  className="text-xs font-medium rounded px-2.5 py-1 transition-colors"
                  style={{ background: copied ? '#dcfce7' : '#0c1b33', color: copied ? '#166534' : '#fff' }}
                >
                  {copied ? 'Copied ✓' : 'Copy note'}
                </button>
              </div>
              <pre className="px-4 py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{FORWARD_NOTE}</pre>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Questions? Email us at{' '}
              <a href="mailto:help@withsoar.ai" className="text-blue-600 hover:underline">help@withsoar.ai</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
