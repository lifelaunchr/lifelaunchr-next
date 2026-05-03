'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface HelpMenuProps {
  onShowSessionsHelp: () => void
  onStartTour: () => void
  /** Whether the user is signed in — tour only offered to signed-in users */
  isSignedIn: boolean
}

export default function HelpMenu({ onShowSessionsHelp, onStartTour, isSignedIn }: HelpMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Help"
        title="Help"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 text-xs leading-none transition-colors"
      >
        ?
      </button>

      {open && (
        <div
          className="absolute right-0 top-7 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 text-sm"
          role="menu"
        >
          {isSignedIn && (
            <button
              role="menuitem"
              onClick={() => { setOpen(false); onStartTour() }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
            >
              <span>🗺️</span>
              <span>Take a tour</span>
            </button>
          )}

          <button
            role="menuitem"
            onClick={() => { setOpen(false); onShowSessionsHelp() }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
          >
            <span>🔢</span>
            <span>How are sessions counted?</span>
          </button>

          <Link
            href="/faq"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            <span>❓</span>
            <span>FAQ</span>
          </Link>
        </div>
      )}
    </div>
  )
}
