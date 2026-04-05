import Link from 'next/link'

export const metadata = {
  title: 'How We Keep Students Safe — Soar by LifeLaunchr',
}

const layers = [
  {
    num: 1,
    title: 'Crisis pre-screen — before Soar responds',
    desc: 'Every message is scanned for crisis language before it reaches our AI. If a message contains self-harm or suicidal language, Soar immediately responds with the 988 Suicide & Crisis Lifeline and does not process the message further. The student\'s counselor is notified.',
  },
  {
    num: 2,
    title: 'Built-in AI guardrails',
    desc: "Soar is powered by Claude, Anthropic's AI. Claude is built to decline requests for violent, pornographic, or otherwise harmful content — regardless of how a message is phrased. This protection is enforced at the model level and cannot be bypassed.",
  },
  {
    num: 3,
    title: 'Response monitoring — after Soar responds',
    desc: 'After every response, Soar checks whether it provided crisis resources or declined a request. If so, a safety event is logged and the student\'s counselor is flagged so they can follow up.',
  },
]

const faqs = [
  {
    q: 'Does Soar monitor everything students type?',
    a: "Soar is not surveillance — it's a shared research workspace. Your linked counselor can view your conversations as part of the college planning process (similar to a shared notebook), but conversations are never shared with third parties or sold. Safety monitoring is separate: every message is scanned for crisis language, and counselors are notified immediately if a genuine safety concern is detected.",
  },
  {
    q: 'What happens if a student expresses thoughts of self-harm?',
    a: 'Soar immediately responds with the 988 Suicide & Crisis Lifeline and does not process the request further. At the same time, a safety alert is sent to the student\'s linked counselor so a trusted adult can follow up directly.',
    link: { href: 'https://988lifeline.org', text: '988 Suicide & Crisis Lifeline' },
  },
  {
    q: 'Will my counselor see my conversations?',
    a: "Yes. Soar is a shared workspace — your linked counselor or coach can view your conversations. This is intentional: it lets them understand your research, track your progress, and come fully prepared to every session. Think of it like a shared notebook, not a private journal. The more your counselor knows about where you are in the process, the more useful your time together becomes. Counselors are also notified immediately if Soar detects a safety concern.",
  },
  {
    q: 'I\'m working with a school counselor. Are they a mandated reporter?',
    a: 'It depends on their role. School counselors (those employed by a K–12 school or district) are typically mandated reporters under state law — meaning if they become aware of information suggesting you or someone else may be in danger, they may be legally required to report it to authorities, even if shared in confidence. Independent college counselors and educational consultants (IECs) are generally not mandated reporters, though their specific obligations vary. Soar itself never makes mandatory reports — but because your counselor can see your conversations, their legal obligations may require them to act on something they read. If you\'re unsure about your counselor\'s reporting obligations, ask them directly before sharing sensitive information.',
  },
  {
    q: "What kinds of questions is Soar not able to help with?",
    a: "Soar is designed for college and career research. It won't help with requests involving violence, explicit content, or anything harmful. If a student asks something outside Soar's scope, it will say so clearly and, where appropriate, point to better resources.",
  },
  {
    q: 'What if a student asks about sensitive topics like domestic violence or sexual assault prevention programs at colleges?',
    a: 'These are legitimate and important college research questions. Soar will answer them helpfully — for example, explaining Title IX offices, campus wellness resources, or student advocacy programs. These topics do not trigger safety flags.',
  },
  {
    q: 'How is student data protected?',
    a: "Conversations are stored securely and are never sold or shared with third parties. Anthropic's API does not retain or train on your conversations. You can read our full privacy policy for details.",
  },
  {
    q: "I'm a counselor. How do I get notified about safety events?",
    a: 'When a student linked to your account triggers a safety event, their name will appear with a 🚩 flag in your "Research for" picker the next time you log in. Click their name to see details and mark the event as reviewed once you\'ve followed up.',
  },
]

export default function SafetyPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f5f6fa', color: '#0c1b33', minHeight: '100dvh' }}>

      {/* Header */}
      <header style={{ background: '#0c1b33', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }} className="px-4 sm:px-6 py-3">
        <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
        </Link>
        <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
          ← Back to Soar
        </Link>
      </header>

      {/* Hero */}
      <div style={{ background: '#0c1b33', color: '#fff', padding: '40px 16px 32px', textAlign: 'center' }} className="sm:py-12 sm:px-6">
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛡️</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 10 }}>How We Keep Students Safe</h1>
        <p style={{ fontSize: '1rem', color: '#a0aec0', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
          Soar is designed for high school students. Here&apos;s how we protect them — and what we do when something serious comes up.
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto' }} className="px-4 sm:px-6 pt-8 sm:pt-10 pb-20">

        {/* Crisis banner */}
        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '18px 20px', marginBottom: 36, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }}>🆘</span>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>If you&apos;re in crisis right now</h3>
            <p style={{ fontSize: '0.88rem', color: '#7f1d1d', lineHeight: 1.55 }}>
              Please reach out to the <a href="https://988lifeline.org" target="_blank" rel="noopener noreferrer" style={{ color: '#991b1b', fontWeight: 600 }}>988 Suicide &amp; Crisis Lifeline</a> — call or text <strong>988</strong>, available 24/7. You can also text HOME to <strong>741741</strong> (Crisis Text Line). You don&apos;t have to go through this alone.
            </p>
          </div>
        </div>

        {/* Safety layers */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            How Soar&apos;s safety system works
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            {layers.map((layer) => (
              <div key={layer.num} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ background: '#0369a1', color: '#fff', fontSize: '0.78rem', fontWeight: 700, width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {layer.num}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0c1b33', marginBottom: 4 }}>{layer.title}</h4>
                  <p style={{ fontSize: '0.87rem', color: '#374151', lineHeight: 1.55 }}>{layer.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            Frequently asked questions
          </h2>
          {faqs.map((faq) => (
            <div key={faq.q} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0369a1', marginBottom: 6 }}>{faq.q}</div>
              <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.65 }}>{faq.a}</div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
            Questions or concerns?
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.65 }}>
            If you have a question about student safety on Soar that isn&apos;t answered here, please reach out to us at{' '}
            <a href="mailto:help@lifelaunchr.com" style={{ color: '#0369a1' }}>help@lifelaunchr.com</a>.
            We take student wellbeing seriously and will respond promptly.
          </p>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: 24, fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0' }}>
        <p>Soar by <a href="https://lifelaunchr.com" target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1', textDecoration: 'none' }}>LifeLaunchr</a> · <Link href="/chat" style={{ color: '#0369a1', textDecoration: 'none' }}>Back to Soar</Link></p>
      </footer>

    </div>
  )
}
