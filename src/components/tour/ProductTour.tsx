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
          textColor: '#111827',
          zIndex: 9999,
          arrowColor: '#fff',
          buttons: ['back', 'primary', 'skip'],
          showProgress: true,
          overlayClickAction: false,
        }}
        styles={{
          tooltip: {
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '340px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          },
          tooltipTitle: {
            fontSize: '15px',
            fontWeight: '700',
            marginBottom: '8px',
          },
          buttonPrimary: {
            borderRadius: '8px',
            fontSize: '13px',
            padding: '8px 16px',
          },
          buttonBack: {
            borderRadius: '8px',
            fontSize: '13px',
            color: '#6b7280',
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
