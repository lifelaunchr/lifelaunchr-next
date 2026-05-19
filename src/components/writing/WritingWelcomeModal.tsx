'use client'

import { useEffect, useRef } from 'react'

type WritingRole = 'student' | 'counselor' | 'parent'

interface WritingWelcomeModalProps {
  role: WritingRole
  onClose: () => void
}

const STORAGE_KEY = (role: WritingRole) => `soar_writing_welcome_seen_${role}`

export function useWritingWelcomeSeen(role: WritingRole) {
  if (typeof window === 'undefined') return true
  return !!localStorage.getItem(STORAGE_KEY(role))
}

// ── Content ──────────────────────────────────────────────────────────────────

const content: Record<WritingRole, { title: string; sections: { heading?: string; body: string }[] }> = {
  student: {
    title: 'Welcome to Your Writing Hub',
    sections: [
      {
        body: "The Writing Hub is built around a process we've honed over years of working with students. Your coach assigns exercises, you respond, and your coach gives feedback. The work is yours — every word, every idea, every story. Soar structures the process; your coach guides it; you do the writing.",
      },
      {
        heading: 'To get started',
        body: "Begin with the personality assessment in Self-Discovery, then follow the assignments your coach has set for you. Work through them in order — each one builds on the last.",
      },
      {
        heading: 'One thing Soar won\'t do',
        body: "Write your essays or tell you what to say. That's the point. Admissions readers can spot AI-generated writing, and more importantly, your voice is what makes an essay work. This is your process to own.",
      },
    ],
  },
  counselor: {
    title: 'Welcome to the Writing Hub',
    sections: [
      {
        body: "The Writing Hub is a structured essay coaching process built around the work counselors actually do — assigning exercises, reading student responses, and providing feedback at every stage. Soar doesn't write essays or coach students directly. It organizes the process so your expertise has a clear track to run on.",
      },
      {
        heading: 'How to use it',
        body: "If Self-Discovery is enabled, start students there before any essay work — the personality assessment and reflection exercises produce the raw material every essay draws from. When students are ready for essays, assign sections based on where they're applying.",
      },
      {
        heading: 'Assignments flow in both directions',
        body: "You assign, students respond, you observe. The platform surfaces suggested next steps, but you decide the pace and the path.",
      },
    ],
  },
  parent: {
    title: 'Welcome to the Writing Hub',
    sections: [
      {
        body: "The Writing Hub is where your teen works through their essays with their coach or mentor — a structured process built around their voice, their stories, and their coach's guidance.",
      },
      {
        heading: "What you can see",
        body: "Your teen's personality profile and self-discovery results, their progress through assignments, and whether they're keeping pace.",
      },
      {
        heading: "What you can't see — and why",
        body: "Essay drafts are private to your teen and their coach. This is intentional. Students write more honestly and more authentically when they know their parents aren't reading every draft in real time. The goal is an essay that sounds like your teen — not a version shaped by family feedback at every step. When drafts are ready to share, your teen and coach will share them.",
      },
    ],
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WritingWelcomeModal({ role, onClose }: WritingWelcomeModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const { title, sections } = content[role]

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    localStorage.setItem(STORAGE_KEY(role), '1')
    onClose()
  }

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) handleClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(4,8,20,0.78)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-[#0c1b33] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">✍️</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Writing Hub</span>
          </div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {sections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-1.5">
                  {section.heading}
                </p>
              )}
              <p className="text-sm text-slate-300 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-700/50 flex-shrink-0">
          <button
            onClick={handleClose}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Got it — let me explore
          </button>
        </div>
      </div>
    </div>
  )
}
