'use client'

import { useState, useEffect } from 'react'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface SafetyEvent {
  id: number
  trigger_type: string
  message_snippet: string | null
  created_at: string
  acknowledged_by_viewer: boolean
  viewer_acknowledged_at: string | null
}

export interface SafetyStudent {
  id: number
  full_name: string
}

export default function SafetyEventModal({
  student,
  onClose,
  onAllAcknowledged,
  getToken,
}: {
  student: SafetyStudent
  onClose: () => void
  onAllAcknowledged: (studentId: number) => void
  getToken: () => Promise<string | null>
}) {
  const [events, setEvents] = useState<SafetyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [acknowledging, setAcknowledging] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const res = await fetch(`${apiUrl}/safety-events/${student.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [student.id, getToken])

  const acknowledge = async (eventId: number) => {
    setAcknowledging(prev => new Set(prev).add(eventId))
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/safety-events/${eventId}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setEvents(prev => prev.map(e =>
          e.id === eventId
            ? { ...e, acknowledged_by_viewer: true, viewer_acknowledged_at: new Date().toISOString() }
            : e
        ))
      }
    } finally {
      setAcknowledging(prev => { const n = new Set(prev); n.delete(eventId); return n })
    }
  }

  // Notify caller when all events are acknowledged
  useEffect(() => {
    if (!loading && events.length > 0 && events.every(e => e.acknowledged_by_viewer)) {
      onAllAcknowledged(student.id)
    }
  }, [events, loading, student.id, onAllAcknowledged])

  const unacknowledged = events.filter(e => !e.acknowledged_by_viewer)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-white text-lg">⚠️</span>
              <h2 className="font-semibold text-white text-base">Safety Alert</h2>
            </div>
            <p className="text-red-100 text-sm">{student.full_name}</p>
          </div>
          <button onClick={onClose} className="text-red-200 hover:text-white text-xl leading-none mt-0.5">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading events…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No safety events found.</p>
          ) : (
            <div className="space-y-4">
              {unacknowledged.length === 0 && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
                  <span className="text-green-600 text-base">✓</span>
                  <p className="text-sm text-green-700 font-medium">All events reviewed by you.</p>
                </div>
              )}
              {events.map(event => (
                <div
                  key={event.id}
                  className={`border rounded-lg p-4 ${
                    event.acknowledged_by_viewer
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      event.acknowledged_by_viewer
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-red-200 text-red-700'
                    }`}>
                      {event.trigger_type === 'crisis' ? 'Crisis detected' : event.trigger_type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(event.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {event.message_snippet && (
                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                      &ldquo;{event.message_snippet}&rdquo;
                    </p>
                  )}
                  {event.acknowledged_by_viewer ? (
                    <p className="text-xs text-gray-400">
                      Reviewed by you {event.viewer_acknowledged_at
                        ? new Date(event.viewer_acknowledged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : ''}
                    </p>
                  ) : (
                    <button
                      onClick={() => acknowledge(event.id)}
                      disabled={acknowledging.has(event.id)}
                      className="text-xs font-medium px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {acknowledging.has(event.id) ? 'Saving…' : 'Mark as reviewed'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">
            Marking as reviewed records that you have seen this event and taken appropriate action.
            Other connected counselors and parents must review independently.
          </p>
        </div>
      </div>
    </div>
  )
}
