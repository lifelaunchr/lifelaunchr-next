import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about Soar, the AI college and career planning platform for counselors.',
}

const faqs: { q: string; a: React.ReactNode; id?: string }[] = [
  {
    q: 'What is Soar?',
    a: (
      <>
        Soar is the AI-powered college and career planning platform built for IECs and school
        counselors, and its defining feature is that it is an AI that actually knows each student.
        It spans the whole process: researching colleges, scholarships, majors, and careers;
        organizing college lists, deadlines, and activities; guiding essays and self-discovery in
        the Writing Hub; and preparing counselors for every session, all held in one shared record
        that the student, parent, and counselor work from together. Unlike general-purpose AI tools,
        Soar remembers what has already been researched and gets more useful over time. Soar is a
        HECA Business Partner.
      </>
    ),
  },
  {
    q: 'Who is Soar for?',
    a: (
      <>
        Soar is built for and available to the professionals who guide students through college and
        career planning:
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>Independent educational consultants (IECs)</strong> who want a research assistant that knows their students, keeps them better prepared for every meeting, and helps students make real progress between sessions.</li>
          <li><strong>School counselors</strong> who need to support a large caseload with accurate, personalized information and a structured process, rather than just a search engine.</li>
        </ul>
        <p className="mt-3">
          Students and parents take part in Soar as members of their counselor&rsquo;s practice. A
          student gets a knowledgeable thinking partner to guide them through the research process
          and stay on track. A parent gets a window into what their student is doing and a place to
          ask their own questions. Both join Soar by invitation from their counselor, so every
          student using Soar is supported by a professional guiding the process.
        </p>
      </>
    ),
  },
  {
    q: 'Can students or parents sign up for Soar on their own?',
    a: (
      <>
        <p>
          No. Soar is offered to independent educational consultants and school counselors, and
          students and families join only through their counselor&rsquo;s invitation. This is by
          design. Every student on Soar is connected to a professional who is guiding their process,
          so the research a student does always has a counselor in the loop.
        </p>
        <p className="mt-3">
          If you are a parent or student interested in Soar, ask your counselor whether they use it.
          If you are not currently working with a counselor and would like to be, email us at{' '}
          <a href="mailto:help@withsoar.ai" className="text-blue-600 hover:underline">help@withsoar.ai</a>{' '}
          and we can help point you in the right direction.
        </p>
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
          <li><strong>Soar doesn&rsquo;t just answer questions, it guides you through a process</strong> built over many years of successful college and career counseling. It asks follow-up questions, surfaces what students and families often overlook, and moves the conversation toward real decisions rather than just information.</li>
          <li><strong>It knows the student.</strong> Soar is built around each student&rsquo;s real profile: GPA, test scores, interests, activities, home state, budget. When you ask &ldquo;Is this school a good fit?&rdquo;, Soar actually knows the answer. A general AI does not.</li>
          <li><strong>It remembers everything.</strong> Every conversation builds on the last. Research from October is still there in March. You are never starting over.</li>
          <li>
            <strong>It&rsquo;s grounded in authoritative data.</strong> General AI tools can and do
            hallucinate about acceptance rates, financial aid policies, and program details. Soar
            uses a curated, regularly updated dataset. See{' '}
            <Link href="#accuracy" className="text-blue-600 hover:underline">How accurate is Soar&rsquo;s information?</Link>{' '}
            below.
          </li>
          <li><strong>It&rsquo;s built for this specific process.</strong> College and career planning has a specific rhythm, vocabulary, and set of common traps. Soar is designed around all of it, not general knowledge.</li>
        </ul>
      </>
    ),
  },
  {
    q: 'Families can use AI on their own now. How does Soar help me show my value?',
    a: (
      <>
        By putting you where the value has moved. General AI can answer a question, but it does not
        know your student the way you do, and it will not have the honest conversation about a reach
        school or a change of direction. Soar makes you the guide for how students use AI: you see
        what they research, you correct course, and you teach them to use these tools well, which is
        a skill they carry into college and their career. It also takes the research and prep off
        your plate, so your meetings go to strategy, judgment, and mentorship. Most tools for
        counselors are built to make you more efficient. Soar is built to make you more effective,
        which is what families still come to a professional for.
      </>
    ),
  },
  {
    q: 'Do I need to replace the tools I already use?',
    a: (
      <>
        No. Soar works alongside the systems you already trust, such as College Planner Pro, Scoir,
        Maia, and Google Docs. Those tools handle practice management: task lists, reporting, and
        administration. Soar is where the research and exploration happen, and where your students
        actually engage between sessions. It supplements your practice rather than replacing any
        part of it.
      </>
    ),
  },
  {
    q: 'How do I get access?',
    a: (
      <>
        <p>
          Soar is for IECs and school counselors. Counselors can get started free from the{' '}
          <Link href="/" className="text-blue-600 hover:underline">home page</Link>. Students and
          parents do not sign up here. Their counselor invites them directly with an invite link.
        </p>
        <p className="mt-3">
          If you are a student or parent working with a counselor who uses Soar, watch for that
          invite, or ask your counselor to send one. Questions? Email us at{' '}
          <a href="mailto:help@withsoar.ai" className="text-blue-600 hover:underline">help@withsoar.ai</a>.
        </p>
      </>
    ),
  },
  {
    q: 'How much does Soar cost?',
    a: (
      <>
        <p>Soar is free to get started, and you can do real work on the free tier from day one.</p>
        <ul className="mt-3 list-disc pl-5 space-y-1">
          <li><strong>Free:</strong> one counselor with up to three students and their parents, permanently free.</li>
          <li><strong>Paid:</strong> $29.99/month per counselor seat, plus a per-student rate that steps down as you add students: $6.99/month each for students 4 through 25, $5.99 for students 26 through 75, and $4.99 for students 76 and up.</li>
          <li><strong>Annual billing:</strong> twelve months for the price of ten.</li>
        </ul>
        <p className="mt-3">
          HECA members receive 15% off for as long as they maintain membership — email us for a
          discount code and enter it at checkout. For school or district pricing, or to talk through
          the right plan for your practice, email us at{' '}
          <a href="mailto:help@withsoar.ai" className="text-blue-600 hover:underline">help@withsoar.ai</a>.
        </p>
      </>
    ),
  },
  {
    q: 'What is a research session?',
    a: (
      <>
        <p>
          A research session is how Soar measures usage, not by the number of messages, but by the
          amount of focused research time. A session begins when you start a conversation and remains
          active as long as you are actively working in it. After 60 minutes of inactivity, the
          session ends automatically.
        </p>
        <p className="mt-3">
          This means you can have a long, in-depth conversation about a student&rsquo;s college list,
          asking many questions, refining results, comparing schools, and it counts as one session.
          Research sessions reset monthly.
        </p>
        <p className="mt-3">
          When a counselor researches on behalf of a student, the session counts against the
          student&rsquo;s shared pool, not the counselor&rsquo;s own limit.
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
          <li>Analyzing transcripts, including international transcripts and dual enrollment</li>
          <li>Organizing college lists, tracking deadlines, and managing activities</li>
          <li>Drafting counselor session reports and meeting prep briefs</li>
          <li>Coaching essays through the Writing Hub, where humans do the coaching and Soar never writes the essay</li>
        </ul>
        <p className="mt-3">
          Soar is a research and planning tool. It is not a substitute for professional college
          counseling, and important decisions should be reviewed with a qualified counselor.
        </p>
      </>
    ),
  },
  {
    q: 'Can I control what each student can access?',
    a: (
      <>
        Yes. The research side of Soar (colleges, scholarships, majors, careers, enrichment) is
        available to every connected student, because getting them started early is a good thing. The
        application-specific writing modules are yours to control: you decide when to unlock the
        Common App personal statement, the UC Personal Insight Questions, and the Why College and Why
        Major essays for each student, so a ninth grader is not shown work meant for a senior. You
        set end dates for each student too, and the connection archives automatically when your work
        together is done.
      </>
    ),
  },
  {
    q: 'Can Soar write my college essays?',
    a: (
      <>
        No. Soar is not designed to write college essays, personal statements, or supplemental
        essays. Using AI-generated content in college applications may violate the academic integrity
        policies of colleges and universities and could constitute misrepresentation. Soar can help
        you brainstorm, research, and plan, but your application materials should be your own work.
      </>
    ),
  },
  {
    q: 'How accurate is Soar’s college information?',
    id: 'accuracy',
    a: (
      <>
        <p>Soar draws from several authoritative sources to provide college information:</p>
        <ul className="mt-3 list-disc pl-5 space-y-1">
          <li><strong>Peterson&rsquo;s</strong> — Common Data Set information and scholarship data for thousands of colleges and universities</li>
          <li><strong>IPEDS</strong> — the U.S. Department of Education&rsquo;s Integrated Postsecondary Education Data System</li>
          <li><strong>College Scorecard</strong> — federal data on enrollment, outcomes, and financial aid</li>
          <li><strong>Curated enrichment programs</strong> — a maintained list of high-quality paid and free summer and enrichment programs</li>
          <li><strong>Live web research</strong> — for acceptance rates, test score benchmarks, financial aid, admissions factors, scholarships, and program details that change frequently</li>
        </ul>
        <p className="mt-3">
          AI-generated responses may occasionally contain inaccuracies or outdated information. We
          recommend verifying important details directly with the college or a qualified counselor
          before making decisions.
        </p>
      </>
    ),
  },
  {
    q: 'Data sources and credits',
    id: 'data',
    a: (
      <>
        <p>
          Soar&rsquo;s information comes from a mix of licensed and public data sources, and we
          credit the ones that ask for it or that inform our work:
        </p>
        <ul className="mt-3 list-disc pl-5 space-y-1">
          <li><strong>Peterson&rsquo;s</strong> — we license college and scholarship data, including Common Data Set information, from Peterson&rsquo;s.</li>
          <li><strong>IPEDS</strong> — the U.S. Department of Education&rsquo;s Integrated Postsecondary Education Data System, a public database.</li>
          <li><strong>College Scorecard</strong> — public outcome and financial data from the U.S. Department of Education.</li>
          <li><strong>Compass Education Group</strong> — current college test policies (test-required, test-optional, and test-free).</li>
          <li><strong>U.S. Bureau of Labor Statistics</strong> — career earnings and occupational data.</li>
        </ul>
        <p className="mt-3">
          <strong>Writing Hub:</strong> Some concepts in our Common App module are based on elements
          of the Wow Method, developed by{' '}
          <a href="https://wowwritingworkshop.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Wow Writing Workshop</a>,
          and are used with permission.
        </p>
        <p className="mt-3">
          <strong>Self-Discovery assessment:</strong> Soar&rsquo;s personality assessment is based on
          the IPIP-NEO, a Big Five personality measure developed by Dr. John A. Johnson of Penn State
          from the public-domain International Personality Item Pool (IPIP), and is used with his
          permission.
        </p>
      </>
    ),
  },
  {
    q: 'Is Soar safe for students to use?',
    a: (
      <>
        Yes. Safety is built in at multiple layers. Every message a student sends is scanned for
        crisis language before Soar processes it, and if anything is flagged, the student&rsquo;s
        counselor and parents are both notified immediately and Soar responds with the 988 Suicide
        and Crisis Lifeline.
        Soar is also built on Anthropic&rsquo;s Claude, which declines harmful content at the model
        level. Because Soar is a shared workspace connected to a counselor, there is always a
        professional in the loop. For the full picture, see our{' '}
        <Link href="/safety" className="text-blue-600 hover:underline">Safety page</Link>.
      </>
    ),
  },
  {
    q: 'Is my data private? Does Soar use my conversations to train AI?',
    a: (
      <>
        Your data is yours, and it is protected on two levels. First, Soar is powered by
        Anthropic&rsquo;s Claude API, and under Anthropic&rsquo;s API terms, inputs submitted via the
        API are not used to train Anthropic&rsquo;s models. Second, Soar itself does not use your
        data, or your students&rsquo; research and sessions, to train or improve Soar. We also never
        sell your data. And one counselor&rsquo;s data is never visible to another: each practice is
        isolated, so no other IEC or school can see your conversations or your students. For full
        details, see our{' '}
        <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
      </>
    ),
  },
  {
    q: 'Is Soar secure? Who can see my student’s data?',
    a: (
      <>
        Soar uses industry-standard security practices to protect your data. Access controls ensure
        that counselors can only see their own connected students&rsquo; information, and students
        and parents can only see their own data. Each practice or school is isolated from every
        other, so no counselor can see another practice&rsquo;s students. Sensitive data like
        transcripts is encrypted and never displayed to anyone, including counselors. LifeLaunchr
        staff may access underlying platform data where necessary for operational support, security,
        or legal compliance, limited to personnel with a need to know and subject to confidentiality
        obligations. See our{' '}
        <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> for
        details.
      </>
    ),
  },
  {
    q: 'How is Soar related to LifeLaunchr?',
    a: (
      <>
        Soar is a product of LifeLaunchr, Inc., and it is kept separate from LifeLaunchr&rsquo;s own
        college-counseling practice by design. LifeLaunchr the practice is one tenant on Soar,
        exactly like any other IEC practice, with no special access, advantage, or different
        treatment. Soar is open to any IEC or school counselor, has its own website at withsoar.ai,
        and has its own terms and privacy policy. You do not need LifeLaunchr to use Soar.
      </>
    ),
  },
  {
    q: 'How do I get help or report a problem?',
    a: (
      <>
        Email us at{' '}
        <a href="mailto:help@withsoar.ai" className="text-blue-600 hover:underline">help@withsoar.ai</a>.
        We are a small team and we respond personally. You can also use the &ldquo;Give
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
            Soar
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
          <a href="mailto:help@withsoar.ai" className="text-blue-600 hover:underline">
            Email us
          </a>
          .
        </p>

        <div className="divide-y divide-gray-100">
          {faqs.map(({ q, a, id }) => (
            <div key={q} id={id} className="py-7 scroll-mt-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{q}</h2>
              <div className="text-gray-600 leading-relaxed text-sm">{a}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
