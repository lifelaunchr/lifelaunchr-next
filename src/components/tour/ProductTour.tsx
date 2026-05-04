'use client'

import { useState, useCallback } from 'react'
import { Joyride, STATUS, EVENTS, type Step, type EventData } from 'react-joyride'
import TourShowcaseModal from './TourShowcaseModal'
import { tourSteps, tourMeta, type TourRole } from '@/lib/tourContent'

interface ProductTourProps {
  role: TourRole
  run: boolean
  onFinish: () => void
}

/** Convert our plain-data steps into react-joyride Step objects */
function buildJoyrideSteps(role: TourRole): Step[] {
  return tourSteps[role].map((s) => ({
    target: s.target,
    placement: s.placement ?? 'auto',
    skipBeacon: true,
    title: s.title,
    content: (
      <div className="text-left text-sm leading-relaxed">
        <p className="text-gray-700">{s.body}</p>
        {s.list && s.list.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {s.list.map((item, i) => (
              <li key={i} className="flex gap-2 text-gray-600">
                <span className="text-indigo-400 flex-shrink-0">•</span>
                <span className="italic">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    ),
  }))
}

export default function ProductTour({ role, run, onFinish }: ProductTourProps) {
  const [showShowcase, setShowShowcase] = useState(false)
  const steps = buildJoyrideSteps(role)

  const handleEvent = useCallback((data: EventData) => {
    const { status, type } = data

    // Tour finished (last step next'd)
    if (status === STATUS.FINISHED) {
      onFinish()
      setShowShowcase(true)
      return
    }

    // Tour skipped
    if (status === STATUS.SKIPPED) {
      onFinish()
      return
    }

    // Step target not found — joyride advances automatically in v3
    void type
  }, [onFinish])

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        continuous
        scrollToFirstStep
        onEvent={handleEvent}
        options={{
          primaryColor: '#4f46e5',
          backgroundColor: '#fff',
          textColor: '#374151',
          zIndex: 9999,
          arrowColor: '#0c1b33',
          buttons: ['back', 'primary', 'skip'],
          showProgress: true,
          overlayClickAction: false,
        }}
        styles={{
          tooltip: {
            borderRadius: '14px',
            padding: '0',
            maxWidth: '360px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            overflow: 'hidden',
          },
          tooltipTitle: {
            background: '#0c1b33',
            color: '#7dd3fc',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '0.01em',
            padding: '14px 20px',
            marginBottom: '0',
          },
          tooltipContent: {
            padding: '14px 20px 8px',
            fontSize: '13px',
            lineHeight: '1.55',
            color: '#374151',
          },
          tooltipFooter: {
            padding: '8px 20px 14px',
            borderTop: '1px solid #f3f4f6',
            marginTop: '4px',
          },
          buttonPrimary: {
            background: '#4f46e5',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            padding: '8px 18px',
            boxShadow: '0 1px 4px rgba(79,70,229,0.3)',
          },
          buttonBack: {
            borderRadius: '8px',
            fontSize: '13px',
            color: '#6b7280',
            marginRight: '4px',
          },
          buttonSkip: {
            color: '#9ca3af',
            fontSize: '12px',
          },
        }}
        locale={{
          next: tourMeta.next,
          back: tourMeta.back,
          skip: tourMeta.skip,
          last: tourMeta.last,
        }}
      />

      {showShowcase && (
        <TourShowcaseModal
          role={role}
          onClose={() => setShowShowcase(false)}
        />
      )}
    </>
  )
}
