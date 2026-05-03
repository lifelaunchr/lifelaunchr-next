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
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{tourMeta.showcaseTitle}</h2>
          <p className="text-sm text-gray-500 mt-1">{tourMeta.showcaseSubtitle}</p>
        </div>

        {/* Feature grid */}
        <div className="px-6 py-4 space-y-3">
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
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            {tourMeta.showcaseDone}
          </button>
        </div>
      </div>
    </div>
  )
}
