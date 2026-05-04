'use client'

import { useEffect, useRef } from 'react'
import { showcaseItems, tourMeta, type TourRole } from '@/lib/tourContent'

interface TourShowcaseModalProps {
  role: TourRole
  onClose: () => void
}

export default function TourShowcaseModal({ role, onClose }: TourShowcaseModalProps) {
  const items = showcaseItems[role]
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(4,8,20,0.72)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header — dark navy band */}
        <div className="px-6 py-5 flex-shrink-0" style={{ background: '#0c1b33' }}>
          <h2 className="text-base font-bold" style={{ color: '#7dd3fc' }}>{tourMeta.showcaseTitle}</h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{tourMeta.showcaseSubtitle}</p>
        </div>

        {/* Feature list */}
        <div className="px-5 py-4 space-y-1 overflow-y-auto flex-1">
          {items.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="flex items-start gap-4 p-3 rounded-xl hover:bg-indigo-50 transition-colors group"
            >
              <span className="text-2xl leading-none mt-0.5 flex-shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{item.description}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 mt-1 ml-auto transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            style={{ background: '#4f46e5' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#4338ca')}
            onMouseLeave={e => (e.currentTarget.style.background = '#4f46e5')}
          >
            {tourMeta.showcaseDone}
          </button>
        </div>
      </div>
    </div>
  )
}
