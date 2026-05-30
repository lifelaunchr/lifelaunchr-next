'use client'
import { useState } from 'react'

export default function SessionsInfoButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'none', border: 'none', padding: 0, color: '#0369a1', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
      >
        How sessions work →
      </button>
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, maxWidth: 480, width: '100%', padding: 24, color: '#e2e8f0' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', margin: 0 }}>How research sessions work</h2>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem', lineHeight: 1.65 }}>
              <section>
                <p style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>What counts as a session?</p>
                <p>A <em>research session</em> is a continuous block of work: your first message in a new chat opens a session, and any follow-up questions in the next <strong>60 minutes</strong> are included. After 60 minutes of inactivity, your next message opens a new session.</p>
                <p style={{ marginTop: 8, color: '#94a3b8' }}>This means you&apos;re billed for research depth, not message count. Ask as many follow-ups as you need within the hour.</p>
              </section>
              <section>
                <p style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>How the student pool works</p>
                <p>Each student has a shared monthly pool. Sessions used by the student, a parent, or a counselor on the student&apos;s behalf all draw from the same pool. The total equals contributions from each connected account:</p>
                <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, color: '#94a3b8' }}>
                  <li>Free counselor plan: student gets 5 sessions/month</li>
                  <li>Paid counselor plan: student gets up to 25/month (5 student + 5 parent + 15 counselor)</li>
                </ul>
              </section>
              <section style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', color: '#64748b' }}>
                Limits reset at 8 AM UTC on the 1st of each month.
              </section>
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setOpen(false)}
                style={{ padding: '8px 18px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
