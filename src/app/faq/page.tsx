import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about Soar by LifeLaunchr.',
}

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What is Soar?',
    a: (
      <>
        Soar is an AI-powered college planning platform built by a counselor. It helps students,
        counselors, and families research colleges, explore scholarships and enrichment programs,
        and organize the entire college planning process in one place. Unlike general-purpose AI
        tools, Soar knows your student&rsquo;s profile, remembers what you&rsquo;ve already
        researched, and gets more useful over time.
      </>
    ),
  },
  {
    q: 'Who is Soar for?',
    a: (
      <>
        Soar is designed for three groups:
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>Independent educational consultants (IECs)</strong> who want a smarter research tool for their practice and a better way to stay organized across their caseload.</li>
          <li><strong>Students</strong> who want a knowledgeable thinking partner to help them navigate the college search, understand their options, and stay on track.</li>
          <li><strong>Parents</strong> who want to understand what their student is doing, follow along, and ask their own questions — without being in the way.</li>
        </ul>
      </>
    ),
  },
  {
    q: 'How do I get access?',
    a: (
      <>
        Soar is currently available by invitation. You can request access from the{' '}
        <Link href="/" className="text-blue-600 hover:underline">
          home page
        </Link>
        . If you&rsquo;re a student or parent working with a LifeLaunchr counselor, your counselor
        will send you an invite link directly. If you have any questions, email us at{' '}
        <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
          help@lifelaunchr.com
        </a>
        .
      </>
    ),
  },
  {
    q: 'How much does Soar cost?',
    a: (
      <>
        Soar offers a free tier for counselors, students, and parents with limited features and
        monthly usage. Paid plans are available for higher usage and additional capabilities.
        Detailed pricing is available in your account settings. For questions about pricing or
        institutional plans, contact{' '}
        <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
          help@lifelaunchr.com
        </a>
        .
      </>
    ),
  },
  {
    q: 'What can Soar help with?',
    a: (
      <>
        Soar can help with a wide range of college planning tasks, including:
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Researching colleges by major, size, location, cost, culture, and more</li>
          <li>Understanding admissions likelihood based on a student&rsquo;s academic profile</li>
          <li>Searching for scholarships and enrichment programs</li>
          <li>Exploring majors and career pathways</li>
          <li>Reviewing financial aid options and understanding net price calculators</li>
          <li>Organizing college lists, tracking deadlines, and managing activities</li>
          <li>Drafting counselor session reports and meeting prep briefs</li>
        </ul>
        Soar is a research and planning tool — it is not a substitute for professional college
        counseling, and all important decisions should be reviewed with a qualified counselor.
      </>
    ),
  },
  {
    q: 'Can Soar write my college essays?',
    a: (
      <>
        No. Soar is not designed to write college essays, personal statements, or supplemental
        essays. Using AI-generated content in college applications may violate the academic
        integrity policies of colleges and universities and could constitute misrepresentation.
        Soar can help you brainstorm, research, and plan — but your application materials should
        be your own work.
      </>
    ),
  },
  {
    q: 'Is my data private? Does Soar use my conversations to train AI?',
    a: (
      <>
        Your data is yours — we do not sell it, and we do not use your conversations to train AI
        models. Soar is powered by Anthropic&rsquo;s Claude API, and under Anthropic&rsquo;s API
        terms, inputs submitted via the API are not used to train Anthropic&rsquo;s models by
        default. For full details, see our{' '}
        <Link href="/privacy" className="text-blue-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Is Soar secure? Who can see my student\'s data?',
    a: (
      <>
        Soar uses industry-standard security practices to protect your data. Access controls
        ensure that counselors can only see their own connected students&rsquo; information, and
        students and parents can only see their own data. LifeLaunchr staff may access underlying
        platform data where necessary for operational support, security, or legal compliance — but
        this is limited to personnel with a need to know and subject to confidentiality
        obligations. See our{' '}
        <Link href="/privacy" className="text-blue-600 hover:underline">
          Privacy Policy
        </Link>{' '}
        for details.
      </>
    ),
  },
  {
    q: 'How accurate is Soar\'s college information?',
    a: (
      <>
        Soar pulls data from a combination of Peterson&rsquo;s, College Scorecard, and live web
        research to provide college information including acceptance rates, GPA and test score
        benchmarks, financial aid data, and admissions factors. Soar&rsquo;s AI-generated
        responses may occasionally contain inaccuracies or outdated information. We recommend
        verifying important details directly with the college or a qualified counselor before
        making decisions.
      </>
    ),
  },
  {
    q: 'How do I get help or report a problem?',
    a: (
      <>
        Email us at{' '}
        <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
          help@lifelaunchr.com
        </a>{' '}
        — we&rsquo;re a small team and we respond personally. You can also use the &ldquo;Give
        feedback&rdquo; link in the footer of any page in the app.
      </>
    ),
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900 tracking-tight">
            Soar <span className="text-sm font-normal text-gray-400">by LifeLaunchr</span>
          </Link>
          <Link href="/chat" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Go to app →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-500 mb-10">
          Still have questions?{' '}
          <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
            Email us
          </a>
          .
        </p>

        <div className="divide-y divide-gray-100">
          {faqs.map(({ q, a }) => (
            <div key={q} className="py-7">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{q}</h2>
              <div className="text-gray-600 leading-relaxed text-sm">{a}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
