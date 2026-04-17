import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Plans & Pricing — Soar by LifeLaunchr',
  description:
    'Soar connects counselors, students, and parents around a shared research record. Free to start. Beta pricing locked in forever when you upgrade now.',
}

const SUPPORT_EMAIL = 'help@lifelaunchr.com'

const FEATURES = [
  {
    icon: '👥',
    title: "Finally, you're in the loop",
    body: "Your student spends two hours with ChatGPT on a Tuesday night, researching colleges, second-guessing their major, worrying about financial aid. On Thursday you meet. With ChatGPT, you have no idea what happened Tuesday. With Soar, you do. Every conversation builds a shared research record, visible to you, updated in real time, and waiting for you before every session. No more flying blind. No more shrugs.",
  },
  {
    icon: '🕐',
    title: "Guides students when you're not there",
    body: "Students have questions at 10pm on a Sunday. Soar is there, answering with the accuracy of a trained counselor, not the noise of a Google search or a Reddit thread. It asks the right follow-up questions, keeps the conversation on track, and captures everything so you can see it later. Your students make real progress between sessions. You show up knowing exactly where to pick up and where to correct course.",
  },
  {
    icon: '📊',
    title: 'Real data. Not guesses.',
    body: "Soar is grounded in data on 1,800+ colleges, 6,700+ scholarships, and 250+ enrichment programs, including acceptance rates, net price, financial aid, and admissions factors. It doesn't hallucinate a school's acceptance rate or invent scholarship eligibility criteria. When it doesn't know something, it says so. That matters when your students are making real decisions about their futures.",
  },
  {
    icon: '🧭',
    title: "Guides the process. Doesn't just answer questions.",
    body: "ChatGPT answers the question in front of it. Soar asks the questions your students don't know they need to answer: What should I really look for in a college? What does this major actually lead to? What financial aid is realistic for my family? What kind of essay makes sense for who I am? Students don't know what they don't know. That's the whole reason you exist. Soar is built the same way: it guides them step by step through major exploration, career thinking, financial aid strategy, essay planning, and scholarship research, with structure and follow-up at every stage. Not something you have to configure. Built in.",
  },
  {
    icon: '📈',
    title: 'Gets smarter about each student over time',
    body: "Every session adds to the record. Over months, Soar builds a detailed picture of each student: their college list, their scholarship search, their thinking about majors and careers, the questions they've asked, the decisions they've made. That record is visible to you before every meeting, shareable with parents, and exportable when you need it. The longer you use Soar, the less time you spend reconstructing context.",
  },
  {
    icon: '🔒',
    title: 'Student privacy, by design',
    body: "Soar uses the Anthropic API, which means your students' conversations are never used to train AI models. That's different from using Claude.ai or ChatGPT directly, where data handling depends on your account settings. For counselors working with minors and handling sensitive family information, that distinction matters. Your students' data stays in your practice.",
  },
]

const STUDENT_FEATURES = [
  { label: 'Research sessions/month', free: '5', plus: '20', pro: '50' },
  { label: 'College and career research', free: '✓', plus: '✓', pro: '✓' },
  { label: 'Scholarship and financial aid research', free: '✓', plus: '✓', pro: '✓' },
  { label: 'Student profile and college list', free: '✓', plus: '✓', pro: '✓' },
  { label: 'Counselor and parent integration', free: '✓', plus: '✓', pro: '✓' },
  { label: 'Research history', free: '90 days', plus: '1 year', pro: '2 years' },
  { label: 'Essay prompts', free: '', plus: '', pro: '✓' },
]

const COUNSELOR_FEATURES = [
  { label: 'Your research sessions/month', starter: '5', paid: '15', enterprise: 'Custom' },
  { label: 'Student sessions/month (per student)', starter: '5', paid: '15', enterprise: 'Custom' },
  { label: 'Active students', starter: 'Up to 3', paid: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Student profiles and college lists', starter: '✓', paid: '✓', enterprise: '✓' },
  { label: 'Session reports and meeting briefs', starter: '✓', paid: '✓', enterprise: '✓' },
  { label: 'Research history', starter: '90 days', paid: '1 year', enterprise: 'Custom' },
  { label: 'Practice branding', starter: '', paid: '✓', enterprise: '✓' },
  { label: 'Team access', starter: '', paid: '✓', enterprise: '✓' },
  { label: 'Priority support', starter: '', paid: '', enterprise: '✓' },
]

const TOOLS = [
  {
    name: 'Scoir, Naviance, Maia Learning, College Planner Pro',
    body: "These platforms are excellent for what they do: managing lists, tracking tasks, running reports. The challenge, as every counselor knows, is getting students to actually use them. Most students find form-based platforms feel like homework. Soar's conversational approach meets students where they already are. They're already talking to ChatGPT. The difference is that with Soar, you can see the conversation. And because your students actually engage with it, their profiles grow richer over time, which means more context for you going into every session.",
  },
  {
    name: 'NerdApply',
    body: "Keep using it. NerdApply is built for application strategy analysis: the data-driven work you share with families to help them understand a student's college chances. Soar handles what happens earlier in the process: exploring colleges and majors, finding scholarships, thinking through careers, planning essays. They're designed for different stages of the same journey.",
  },
  {
    name: 'Claude, ChatGPT, and other AI tools',
    body: "Soar isn't a replacement for general-purpose AI. Many counselors use Claude or ChatGPT for marketing copy, client communications, building reminder workflows, and tasks that have nothing to do with college and career planning. Keep doing that. What Soar adds is what those tools don't have: persistent student profiles, real college and scholarship data, and counseling methodology baked into every conversation. And because Soar uses the Anthropic API, your students' private information is never stored on those platforms or used to train their models.",
  },
]

const FAQS = [
  {
    q: 'I already use Claude or ChatGPT. Would I use Soar instead, or in addition?',
    a: "In addition, and for different jobs. Claude and ChatGPT are excellent for writing your newsletter, drafting client emails, or doing general research. Soar is specifically built for college and career planning: it knows your students, has real data on colleges and scholarships, connects you to your students and their parents, and applies counseling methodology to every conversation. The two aren't in competition. Most counselors use general-purpose AI for their practice operations and Soar for the work that involves their students directly.",
  },
  {
    q: 'I use Scoir, Naviance, College Planner Pro, or Maia Learning. How does Soar fit in?',
    a: "Those platforms help you run your practice: list management, task tracking, reporting. Soar is where the actual research and exploration happens. The bigger difference is that your students will actually use Soar. The conversational format removes the friction that makes form-based platforms feel like homework to a teenager. When your students use Soar between sessions, you benefit: you see everything they explored, and their profile gets richer with every conversation.",
  },
  {
    q: 'I use NerdApply. Should I switch?',
    a: "No. Keep using it. NerdApply is designed to help you run application strategy analysis, the kind of data-driven work you share with families to help them understand college chances. Soar handles the research and planning that happens earlier: building the list, exploring majors and careers, finding scholarships, preparing for essays. Most counselors find them complementary.",
  },
  {
    q: 'How is student data protected?',
    a: "Soar uses the Anthropic API to power its AI. Under Anthropic's API terms, your conversations are not used to train AI models. That's meaningfully different from using Claude.ai or ChatGPT directly, where data handling depends on your account settings. Your students' information stays in Soar. It's not shared, sold, or used to improve AI models for anyone else.",
  },
  {
    q: 'What is a research session?',
    a: "A research session is one focused block of work. It starts when you begin a conversation and stays active while you're working. After 60 minutes of inactivity it ends automatically and a summary is generated. You can also generate a summary at any time. Plans include a set number of sessions per month. Typically one session covers a full topic area: a college deep-dive, a scholarship search, a major and career exploration, an essay strategy conversation. Most students use 4 to 8 sessions per month. Most counselors use 10 to 20.",
  },
  {
    q: 'What happens if I hit my session limit?',
    a: "You'll see a clear message when you've reached your monthly limit. You can upgrade at any time, or wait for your sessions to reset at the start of your next billing cycle. If you're a student connected to a counselor, your counselor's plan also contributes sessions to your pool, so your effective limit is often higher than your own plan alone.",
  },
  {
    q: 'What does "beta pricing locked in forever" actually mean?',
    a: "If you upgrade during the beta period, your monthly rate is guaranteed for as long as you remain subscribed, even after we raise prices at public launch. If you cancel and resubscribe later, the rate in effect at that time applies. No tricks, no surprise increases, no fine print.",
  },
  {
    q: "What happens to my data if I downgrade or cancel?",
    a: "Your student profiles, college lists, and research history are always yours. If you need an export of your data, reach out to us at help@lifelaunchr.com and we'll make it happen.",
  },
  {
    q: "Can I use Soar if I'm not working with a counselor?",
    a: "Absolutely. Soar is built to be genuinely useful to students and families working independently. The counselor integration is an add-on, not a requirement. If you add a counselor later, everything you've already researched is there waiting for them.",
  },
]

const cell: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '0.85rem',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'middle',
}

const headCell: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: '0.8rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '2px solid #e2e8f0',
}

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
      <div style={{ background: '#0c1b33', color: '#fff', padding: '48px 16px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 800, lineHeight: 1.25, marginBottom: 20, color: '#fff' }}>
            Your students are already using AI for college and career planning. Soar helps you guide them as they do.
          </h1>
          <p style={{ fontSize: '1rem', color: '#a0aec0', lineHeight: 1.7, marginBottom: 32, maxWidth: 580, margin: '0 auto 32px' }}>
            Soar connects counselors, students, and parents around a shared research record, built from real data on colleges, scholarships, majors, and careers, grounded in counseling methodology, and updated every time your student has a conversation. You see what they researched. They get accurate answers. Everyone arrives at your next session ready to do real work.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/chat"
              style={{ background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '0.95rem', padding: '11px 24px', borderRadius: 8, textDecoration: 'none', display: 'inline-block' }}
            >
              Start for free
            </Link>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Soar paid plan inquiry`}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem', padding: '11px 24px', borderRadius: 8, textDecoration: 'none', display: 'inline-block', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Talk to us about a paid plan
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto' }} className="px-4 sm:px-6 pt-10 pb-20">

        {/* Case for Soar */}
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.75, marginBottom: 16 }}>
            Every counselor knows the feeling. You sit down with a student and spend the first twenty minutes untangling something they read online: a wrong acceptance rate, a misunderstood financial aid rule, a major they've ruled out based on a Reddit thread. Or worse, you ask what they've been thinking about and get a shrug. They've been talking to ChatGPT for hours. You just can't see it.
          </p>
          <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.75, marginBottom: 32 }}>
            Soar changes that. It's a college and career planning assistant built specifically for this work, with real data, deep counseling methodology, and a shared research record that connects you to everything your students are exploring between your sessions. AI tools like Claude and ChatGPT are genuinely useful for many things in your practice: marketing, communications, general research. Soar is different in kind. It's what those tools would be if they'd spent a decade working in a college counseling office.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 22px' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{f.icon}</div>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0c1b33', marginBottom: 8 }}>{f.title}</p>
                <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.65 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tier cards — Students */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            🎓 For Students and Families
          </h2>
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ ...headCell, textAlign: 'left', color: '#6b7280', width: '40%' }}></th>
                  <th style={{ ...headCell, textAlign: 'center', color: '#0c1b33' }}>Free</th>
                  <th style={{ ...headCell, textAlign: 'center', color: '#0369a1', background: '#f0f9ff' }}>Plus</th>
                  <th style={{ ...headCell, textAlign: 'center', color: '#0c1b33' }}>Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...cell, fontWeight: 600, color: '#374151' }}>Price</td>
                  <td style={{ ...cell, textAlign: 'center', color: '#374151' }}>$0</td>
                  <td style={{ ...cell, textAlign: 'center', background: '#f0f9ff' }}>
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=Soar Plus beta pricing`} style={{ color: '#0369a1', fontWeight: 600, textDecoration: 'none', fontSize: '0.82rem' }}>Beta pricing — lock it in now</a>
                  </td>
                  <td style={{ ...cell, textAlign: 'center' }}>
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=Soar Pro beta pricing`} style={{ color: '#0369a1', fontWeight: 600, textDecoration: 'none', fontSize: '0.82rem' }}>Beta pricing — lock it in now</a>
                  </td>
                </tr>
                {STUDENT_FEATURES.map((row) => (
                  <tr key={row.label}>
                    <td style={{ ...cell, color: '#374151' }}>{row.label}</td>
                    <td style={{ ...cell, textAlign: 'center', color: row.free === '✓' ? '#16a34a' : '#374151' }}>{row.free || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                    <td style={{ ...cell, textAlign: 'center', background: '#f0f9ff', color: row.plus === '✓' ? '#16a34a' : '#374151' }}>{row.plus || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                    <td style={{ ...cell, textAlign: 'center', color: row.pro === '✓' ? '#16a34a' : '#374151' }}>{row.pro || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tier cards — Counselors */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            💼 For IECs and School Counselors
          </h2>
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ ...headCell, textAlign: 'left', color: '#6b7280', width: '40%' }}></th>
                  <th style={{ ...headCell, textAlign: 'center', color: '#0c1b33' }}>Starter</th>
                  <th style={{ ...headCell, textAlign: 'center', color: '#0369a1', background: '#f0f9ff' }}>Paid</th>
                  <th style={{ ...headCell, textAlign: 'center', color: '#0c1b33' }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...cell, fontWeight: 600, color: '#374151' }}>Price</td>
                  <td style={{ ...cell, textAlign: 'center', color: '#374151' }}>Free</td>
                  <td style={{ ...cell, textAlign: 'center', background: '#f0f9ff' }}>
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=Soar counselor paid plan`} style={{ color: '#0369a1', fontWeight: 600, textDecoration: 'none', fontSize: '0.82rem' }}>Beta pricing — lock it in now</a>
                  </td>
                  <td style={{ ...cell, textAlign: 'center' }}>
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=Soar Enterprise`} style={{ color: '#0369a1', fontWeight: 600, textDecoration: 'none', fontSize: '0.82rem' }}>Contact us</a>
                  </td>
                </tr>
                {COUNSELOR_FEATURES.map((row) => (
                  <tr key={row.label}>
                    <td style={{ ...cell, color: '#374151' }}>{row.label}</td>
                    <td style={{ ...cell, textAlign: 'center', color: row.starter === '✓' ? '#16a34a' : '#374151' }}>{row.starter || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                    <td style={{ ...cell, textAlign: 'center', background: '#f0f9ff', color: row.paid === '✓' ? '#16a34a' : '#374151' }}>{row.paid || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                    <td style={{ ...cell, textAlign: 'center', color: row.enterprise === '✓' ? '#16a34a' : '#374151' }}>{row.enterprise || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Beta pricing note */}
          <div style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', fontSize: '0.875rem', color: '#92400e', lineHeight: 1.65 }}>
            <strong>Beta pricing, locked in forever.</strong> Upgrade now and your rate is guaranteed for as long as you remain subscribed. When we raise prices at public launch, yours stays the same. Questions?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#92400e', fontWeight: 600 }}>{SUPPORT_EMAIL}</a>
          </div>
        </div>

        {/* Works with your tools */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            Works with your existing tools
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: 20, lineHeight: 1.65, marginTop: 12 }}>
            Soar isn't trying to replace your practice's tech stack. Here's how it fits alongside the tools you already use.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TOOLS.map((t) => (
              <div key={t.name} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6 }}>{t.name}</p>
                <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.65 }}>{t.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            Frequently asked questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 4 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid #e2e8f0', padding: '18px 0' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0c1b33', marginBottom: 8 }}>{faq.q}</p>
                <p style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.7 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ background: '#fff', border: '1.5px solid #bae6fd', borderRadius: 12, padding: '28px', textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', marginBottom: 8 }}>Ready to get started?</p>
          <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.65, marginBottom: 20 }}>
            The free tier is a great place to start. For counselors and practices interested in a paid plan, we're happy to walk you through the options.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/chat"
              style={{ background: '#0c1b33', color: '#fff', fontWeight: 600, fontSize: '0.9rem', padding: '10px 22px', borderRadius: 8, textDecoration: 'none', display: 'inline-block' }}
            >
              Start for free
            </Link>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Soar paid plan inquiry`}
              style={{ background: '#f0f9ff', color: '#0369a1', fontWeight: 600, fontSize: '0.9rem', padding: '10px 22px', borderRadius: 8, textDecoration: 'none', display: 'inline-block', border: '1px solid #bae6fd' }}
            >
              Talk to us
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
