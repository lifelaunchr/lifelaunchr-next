import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Plans & Pricing — Soar by LifeLaunchr',
}

const SUPPORT_EMAIL = 'help@lifelaunchr.com'

const STUDENT_EXAMPLES = [
  '"My parents really want me to apply to a BS/MD program, but I\'m not sure it\'s right for me. What are the pros and cons?"',
  '"I was accepted to the CAP program at UT Austin. How does that compare to general admittance, and should I take the offer?"',
  '"I don\'t have As in math. Are there paths other than CS that could still lead to CS jobs?"',
  '"How does a block schedule really work, and would it be right for me?"',
]

const COUNSELOR_EXAMPLES = [
  '"I want to help a student with a 3.9 GPA, exceptional ECs, and an interest in data science at a medium or large school on the West Coast or Midwest. Where should we be looking?"',
  '"What are the critical benefits of Georgetown\'s McDonough School for a student interested in business and analytics who is also a tennis player with community service experience?"',
  '"How would you compare the pre-med programs at UC San Diego, Case Western, and UC Irvine? Pros and cons of each?"',
]

export default function UpgradePage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f5f6fa', color: '#0c1b33', minHeight: '100dvh' }}>

      {/* Header */}
      <header style={{ background: '#0c1b33', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }} className="px-4 sm:px-6 py-3">
        <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
        </Link>
        <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
          Go to Soar →
        </Link>
      </header>

      {/* Hero */}
      <div style={{ background: '#0c1b33', color: '#fff', padding: '40px 16px 32px', textAlign: 'center' }} className="sm:py-12 sm:px-6">
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚀</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 10 }}>Plans &amp; Pricing</h1>
        <p style={{ fontSize: '1rem', color: '#a0aec0', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          Soar is free to get started — and you can do real work on the free tier. Paid plans unlock
          higher usage, more student connections, and additional features for practices and schools.
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto' }} className="px-4 sm:px-6 pt-8 sm:pt-10 pb-20">

        {/* How plans work */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            How plans work
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: 16, lineHeight: 1.65 }}>
            Soar plans are structured around three things:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                title: 'Research sessions',
                desc: 'A research session is a focused block of work — it begins when you start a conversation and stays active while you\'re working. After 60 minutes of inactivity it ends automatically. Plans include a set number of sessions per month. See the FAQ for more detail.',
              },
              {
                title: 'Student connections',
                desc: 'For counselors and IECs, plans include a set number of active student connections — the students whose profiles, lists, and research history you can access and work alongside.',
              },
              {
                title: 'Features',
                desc: 'Higher-tier plans add capabilities like custom branding for your practice, longer conversation history retention, team reporting, and priority support.',
              },
            ].map((item) => (
              <div key={item.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0c1b33' }}>{item.title}</span>{' '}
                <span style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6 }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* For Counselors & IECs */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            💼 For IECs &amp; School Counselors
          </h2>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0369a1', marginBottom: 10 }}>
            &ldquo;More effective — not just more efficient.&rdquo;
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>
            Soar isn&apos;t a smarter search engine for your students — it&apos;s a research assistant
            that knows them. It&apos;s built on more than a decade of college and career counseling
            experience, armed with authoritative data on thousands of colleges and scholarships,
            hundreds of majors and enrichment programs, and a guided process that asks the right
            follow-up questions and moves conversations toward real decisions.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>
            Soar keeps you connected with your students between sessions, helps them make real
            progress on their own, and prepares you for every meeting. You walk in with context.
            They arrive with research. The result: deeper conversations, better outcomes, and a
            practice that scales without losing the quality that defines your work.
          </p>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 18px' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0369a1', marginBottom: 8 }}>For example, you or your students can ask:</p>
            {COUNSELOR_EXAMPLES.map((ex) => (
              <p key={ex} style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid #7dd3fc' }}>{ex}</p>
            ))}
          </div>
        </div>

        {/* For Students */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            🎓 For Students
          </h2>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0369a1', marginBottom: 10 }}>
            &ldquo;Real answers. Real expertise. No rumors.&rdquo;
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>
            The college process is full of noise — what schools &ldquo;really&rdquo; want, what GPA
            is &ldquo;good enough,&rdquo; what essay topics work. Most of it is based on someone
            else&apos;s situation, or just wrong.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>
            Soar gives you accurate, personalized answers based on your actual profile and real
            college data — shaped by more than a decade of college admissions coaching experience.
            Ask the hard questions. Research the schools nobody&apos;s heard of. Figure out exactly
            where you fit, and why.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>
            Even if you&apos;re not working with a counselor, Soar can guide you through every step.
            If you are, Soar makes those sessions count — you arrive with real research and real
            questions, not vague anxieties.
          </p>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 18px' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0369a1', marginBottom: 8 }}>For example, you can ask:</p>
            {STUDENT_EXAMPLES.map((ex) => (
              <p key={ex} style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid #7dd3fc' }}>{ex}</p>
            ))}
          </div>
        </div>

        {/* For Families */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            👨‍👩‍👧 For Families
          </h2>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0369a1', marginBottom: 10 }}>
            &ldquo;A decade of expertise. Available whenever you need it.&rdquo;
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>
            Every parent has heard it. &ldquo;My neighbor&apos;s kid got into Penn with a 3.4.&rdquo;
            &ldquo;Schools don&apos;t care about X anymore.&rdquo; Most of it is noise — specific
            to someone else&apos;s situation, years out of date, or simply wrong.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>
            Soar gives your student accurate, personalized answers grounded in their real profile
            and up-to-date college data. What schools are a realistic fit? What financial aid can
            your family expect? What does this particular college actually value?
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7 }}>
            Soar is valuable on its own — and even more powerful when your student is working with
            a college counselor or coach. Soar handles the research and brings the expertise; the
            counselor brings the human judgment and personal relationships that make the process
            really work.
          </p>
        </div>

        {/* CTA */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            Get started or learn more
          </h2>
          <div style={{ background: '#fff', border: '1.5px solid #bae6fd', borderRadius: 12, padding: '28px 28px 24px' }}>
            <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.65, marginBottom: 16 }}>
              The free tier is a great place to start — no credit card required. For counselors and
              practices interested in a paid plan, we&apos;re happy to walk you through the options
              and find the right fit.
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: '0.95rem', color: '#0c1b33', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Contact us:</span>
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#0369a1', textDecoration: 'none', fontWeight: 500 }}>{SUPPORT_EMAIL}</a>
            </div>
            <p style={{ marginTop: 20, fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.55 }}>
              Soar is currently in beta. We&apos;re happy to work with you on the right plan.
            </p>
          </div>
        </div>

      </div>

    </div>
  )
}
