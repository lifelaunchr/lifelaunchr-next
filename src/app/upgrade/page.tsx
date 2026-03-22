import Link from 'next/link'

export const metadata = {
  title: 'Upgrade Soar — LifeLaunchr',
}

const SUPPORT_EMAIL = 'help@lifelaunchr.com'
const CONSULT_URL = 'https://www.lifelaunchr.com/free-initial-consultation/'

const benefits = [
  {
    icon: '✉️',
    title: 'Higher message limits',
    desc: 'More conversations per month for you and your students — so nobody hits a wall mid-research.',
  },
  {
    icon: '🤖',
    title: 'More advanced AI models',
    desc: 'Access to Claude Opus for deeper, more nuanced responses on complex college research questions.',
  },
  {
    icon: '👥',
    title: 'More students',
    desc: 'Grow your practice beyond the free tier student limit — built for counselors and schools managing larger caseloads.',
  },
  {
    icon: '🎨',
    title: 'Custom branding',
    desc: 'Add your logo, name, and tagline so the tool feels like yours — not a generic AI product.',
  },
  {
    icon: '📋',
    title: 'Custom instructions',
    desc: 'Teach Soar your philosophy, deadlines, and approach so every student gets consistent guidance aligned with your practice.',
  },
  {
    icon: '📅',
    title: 'Longer history retention',
    desc: 'Keep student conversation history for up to 2 years or more — so nothing gets lost between junior and senior year.',
  },
  {
    icon: '📊',
    title: 'Analytics',
    desc: 'See how students are using the tool and what they\'re researching — so you can guide them more effectively.',
  },
  {
    icon: '🧩',
    title: 'Additional modules',
    desc: 'Unlock career planning, financial aid deep-dives, essay strategy, and more as new modules become available.',
  },
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
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 10 }}>Upgrade Soar</h1>
        <p style={{ fontSize: '1rem', color: '#a0aec0', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
          You&apos;re currently on the free tier. Upgrading unlocks more of what Soar can do for you.
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Benefits */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            What you unlock when you upgrade
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            {benefits.map((b) => (
              <div key={b.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 1 }}>{b.icon}</span>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0c1b33', marginBottom: 4 }}>{b.title}</h4>
                  <p style={{ fontSize: '0.87rem', color: '#374151', lineHeight: 1.55 }}>{b.desc}</p>
                </div>
              </div>
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
