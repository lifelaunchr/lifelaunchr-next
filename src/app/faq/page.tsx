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
        Soar is an AI-powered college and career planning research assistant built by a counselor.
        It helps students, counselors, and families do in-depth research on colleges, scholarships,
        majors, and enrichment programs — and stay organized and connected throughout the process.
        Unlike general-purpose AI tools, Soar knows each student&rsquo;s profile, remembers what
        you&rsquo;ve already researched, and gets more useful over time.
      </>
    ),
  },
  {
    q: 'Who is Soar for?',
    a: (
      <>
        Soar is designed for four groups:
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>Independent educational consultants (IECs)</strong> who want a research assistant that knows their students, keeps them better prepared for every meeting, and helps students make real progress between sessions.</li>
          <li><strong>School counselors</strong> who need to support a large caseload with accurate, personalized information and a structured process — not just a search engine.</li>
          <li><strong>Students</strong> who want a knowledgeable thinking partner to guide them through the college and career research process, understand their options, and stay on track.</li>
          <li><strong>Parents</strong> who want to understand what their student is doing, follow along, and ask their own questions — without getting in the way.</li>
        </ul>
      </>
    ),
  },
  {
    q: 'How is Soar different from ChatGPT or Claude?',
    a: (
      <>
        <p>
          General-purpose AI tools like ChatGPT and Claude are powerful search and writing
          assistants. Soar is different in ways that matter for college and career planning:
        </p>
        <ul className="mt-3 list-disc pl-5 space-y-2">
          <li>
            <strong>Soar doesn&rsquo;t just answer questions — it guides you through a process</strong>{' '}
            built over many years of successful college and career counseling. It asks follow-up
            questions, surfaces what students and families often overlook, and moves the
            conversation toward real decisions — not just information.
          </li>
          <li>
            <strong>It knows the student.</strong> Soar is built around each student&rsquo;s real
            profile — GPA, test scores, interests, activities, home state, budget. When you ask
            &ldquo;Is this school a good fit?&rdquo;, Soar actually knows the answer. A general
            AI doesn&rsquo;t.
          </li>
          <li>
            <strong>It remembers everything.</strong> Every conversation builds on the last.
            Research from October is still there in March. You&rsquo;re never starting over.
          </li>
          <li>
            <strong>It&rsquo;s grounded in authoritative data.</strong> General AI tools can and
            do hallucinate about acceptance rates, financial aid policies, and program details.
            Soar uses a curated, regularly updated dataset — see{' '}
            <Link href="/faq#data" className="text-blue-600 hover:underline">
              How accurate is Soar&rsquo;s information?
            </Link>
          </li>
          <li>
            <strong>It&rsquo;s built for this specific process.</strong> College and career
            planning has a specific rhythm, vocabulary, and set of common traps. Soar is designed
            around all of it — not general knowledge.
          </li>
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
        <p>
          Soar is free to get started — you can do real work on the free tier. Paid plans are
          available for higher usage and additional features.
        </p>
        <p className="mt-3">
          Plans are structured around three things:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>Research sessions</strong> — how many research sessions are available per month (see <em>What is a research session?</em> below)</li>
          <li><strong>Student connections</strong> — how many students a counselor can connect with</li>
          <li><strong>Features</strong> — things like custom branding, longer data retention, and team reporting</li>
        </ul>
        <p className="mt-3">
          Contact us at{' '}
          <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
            help@lifelaunchr.com
          </a>{' '}
          to discuss the right plan for your practice or school.
        </p>
      </>
    ),
  },
  {
    q: 'What is a research session?',
    a: (
      <>
        A research session is how Soar measures usage — not by the number of messages, but by the
        amount of focused research time. A session begins when you start a conversation and remains
        active as long as you&rsquo;re actively working in it. After 60 minutes of inactivity, the
        session ends automatically.
        <p className="mt-3">
          This means you can have a long, in-depth conversation about a student&rsquo;s college
          list — asking many questions, refining results, comparing schools — and it counts as one
          session. Research sessions reset monthly.
        </p>
        <p className="mt-3">
          When a counselor researches on behalf of a student, the session counts against the
          student&rsquo;s shared pool — not the counselor&rsquo;s own limit.
        </p>
      </>
    ),
  },
  {
    q: 'What can Soar help with?',
    a: (
      <>
        Soar can help with a wide range of college and career planning tasks, including:
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Researching colleges by major, size, location, cost, culture, and fit</li>
          <li>Understanding admissions likelihood based on a student&rsquo;s academic profile</li>
          <li>Searching for scholarships and enrichment and summer programs</li>
          <li>Exploring majors, career pathways, and industries</li>
          <li>Reviewing financial aid options and understanding net price calculators</li>
          <li>Organizing college lists, tracking deadlines, and managing activities</li>
          <li>Drafting counselor session reports and meeting prep briefs</li>
        </ul>
        <p className="mt-3">
          Soar is a research and planning tool — it is not a substitute for professional college
          counseling, and important decisions should be reviewed with a qualified counselor.
        </p>
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
    q: 'How accurate is Soar\'s college information?',
    a: (
      <>
        <p>
          Soar draws from several authoritative sources to provide college information:
        </p>
        <ul className="mt-3 list-disc pl-5 space-y-1">
          <li><strong>Peterson&rsquo;s</strong> — Common Data Set information and scholarship data for thousands of colleges and universities</li>
          <li><strong>IPEDS</strong> — the U.S. Department of Education&rsquo;s Integrated Postsecondary Education Data System</li>
          <li><strong>College Scorecard</strong> — federal data on enrollment, outcomes, and financial aid</li>
          <li><strong>Curated enrichment programs</strong> — a maintained list of high-quality paid and free summer and enrichment programs</li>
          <li><strong>Live web research</strong> — for acceptance rates, test score benchmarks, financial aid, admissions factors, scholarships, and program details that change frequently</li>
        </ul>
        <p className="mt-3">
          AI-generated responses may occasionally contain inaccuracies or outdated information.
          We recommend verifying important details directly with the college or a qualified
          counselor before making decisions.
        </p>
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
