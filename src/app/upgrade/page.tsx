import Link from 'next/link'

export const metadata = {
  title: 'Get More from Soar — LifeLaunchr',
}

const SUPPORT_EMAIL = 'help@lifelaunchr.com'
const CONSULT_URL = 'https://www.lifelaunchr.com/free-initial-consultation/'

const WHY_NOT_AI = [
  {
    title: 'It knows you.',
    desc: 'Soar is built around your real profile — GPA, interests, home state, budget, activities. When you ask "Is this school a good fit for me?", Soar actually knows the answer. A general AI doesn\'t.',
  },
  {
    title: 'It remembers everything.',
    desc: 'Every conversation builds on the last. Research from October is still here in March. You\'re never starting over.',
  },
  {
    title: 'It\'s grounded in real data.',
    desc: 'General AI tools can and do hallucinate about specific programs, acceptance rates, and financial aid policies. Soar uses a curated, regularly updated dataset of 1,500+ colleges — designed to be accurate about the things that matter most.',
  },
  {
    title: 'It carries real coaching expertise.',
    desc: 'Soar isn\'t just an AI that knows facts about colleges. It\'s built on more than a decade of college admissions coaching experience — the same philosophy and process that LifeLaunchr counselors have refined with thousands of students. That perspective is baked into every answer.',
  },
  {
    title: 'It\'s built for this process.',
    desc: 'College and career planning has a specific rhythm, vocabulary, and set of common traps. Soar is designed around all of it — not general knowledge.',
  },
]

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
      <header style={{ background: '#0c1b33', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
        </Link>
        <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
          ← Back to Soar
        </Link>
      </header>

      {/* Hero */}
      <div style={{ background: '#0c1b33', color: '#fff', padding: '48px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚀</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 10 }}>Get more from Soar</h1>
        <p style={{ fontSize: '1rem', color: '#a0aec0', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          Soar is the college and career planning assistant that knows you, remembers everything, and gets smarter the more you use it. Upgrading means more of that — for everyone navigating this process.
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Why not ChatGPT */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            Can&apos;t I just use ChatGPT?
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: 16, lineHeight: 1.65 }}>
            ChatGPT, Claude, and Perplexity are powerful general-purpose tools. Soar is different in ways that matter for college planning:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {WHY_NOT_AI.map((item) => (
              <div key={item.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0c1b33' }}>{item.title}</span>{' '}
                <span style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6 }}>{item.desc}</span>
              </div>
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
            The college process is full of noise — what schools &ldquo;really&rdquo; want, what GPA is &ldquo;good enough,&rdquo; what essay topics work. Most of it is based on someone else&apos;s situation, or just wrong.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>
            Soar gives you accurate, personalized answers based on your actual profile and real college data — shaped by more than a decade of college admissions coaching experience with thousands of students. Ask the hard questions. Research the schools nobody&apos;s heard of. Figure out exactly where you fit, and why.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>
            Even if you&apos;re not working with a counselor, Soar can guide you through every step. If you are, Soar makes those sessions count — you arrive with real research and real questions, not vague anxieties.
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
            Every parent has heard it. &ldquo;My neighbor&apos;s kid got into Penn with a 3.4.&rdquo; &ldquo;Schools don&apos;t care about X anymore.&rdquo; &ldquo;You have to visit to get in.&rdquo; Most of it is noise — specific to someone else&apos;s situation, years out of date, or simply wrong.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>
            Soar gives your student accurate, personalized answers grounded in their real profile and up-to-date college data — shaped by more than a decade of admissions coaching experience with thousands of families. What schools are a realistic fit? What financial aid can your family expect? What does this particular college actually value?
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7 }}>
            Soar is valuable on its own — and even more powerful if your student is working with a college counselor or coach. Soar handles the research and brings the expertise; the counselor brings the human judgment and personal relationships that make the process really work. Together, they&apos;re a powerful combination.
          </p>
        </div>

        {/* For Counselors */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            🏫 For Counselors &amp; Schools
          </h2>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0369a1', marginBottom: 10 }}>
            &ldquo;Know every student. Guide every student well.&rdquo;
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>
            Soar isn&apos;t just a research tool for your students — it&apos;s a resource for you. Need to look up the specifics of a niche program before a parent call? Researching a school you don&apos;t know well? Want a second opinion on whether a student&apos;s list is realistic? Soar gives you high-quality, accurate answers at any hour — backed by real data and a coaching philosophy built over more than a decade with thousands of students.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>
            For your students, Soar is a 24/7 research partner that knows their profile and builds on every conversation. You can see what they&apos;re researching. You walk into every session with context. The result: students who arrive prepared, conversations that go deeper, and guidance that&apos;s consistent and grounded in real data — not what they heard from a friend&apos;s older sibling.
          </p>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 18px' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0369a1', marginBottom: 8 }}>For example, you or your students can ask:</p>
            {COUNSELOR_EXAMPLES.map((ex) => (
              <p key={ex} style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid #7dd3fc' }}>{ex}</p>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            Ready to upgrade?
          </h2>
          <div style={{ background: '#fff', border: '1.5px solid #bae6fd', borderRadius: 12, padding: '28px 28px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14, fontSize: '0.95rem', color: '#0c1b33', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Contact us:</span>
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#0369a1', textDecoration: 'none', fontWeight: 500 }}>{SUPPORT_EMAIL}</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: '0.95rem', color: '#0c1b33', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Or book a free 30-minute consultation:</span>
              <a href={CONSULT_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1', textDecoration: 'none', fontWeight: 500 }}>Book a free consult →</a>
            </div>
            <p style={{ marginTop: 20, fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.55 }}>
              Soar is currently in beta. We&apos;re happy to work with you on the right plan.
            </p>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: 24, fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0' }}>
        <p>Soar by <a href="https://lifelaunchr.com" target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1', textDecoration: 'none' }}>LifeLaunchr</a> · <Link href="/chat" style={{ color: '#0369a1', textDecoration: 'none' }}>Back to Soar</Link></p>
      </footer>

    </div>
  )
}
