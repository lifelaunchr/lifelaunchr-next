'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'

interface CollegeEntry {
  id: number
  college_name: string
  status: string
  student_note?: string
  ai_student_notes?: string
  programs_of_interest?: string
  app_id?: number
  application_type?: string
  app_status?: string
  decision?: string
}

const STATUS_LABELS: Record<string, string> = {
  considering: 'Considering',
  applying: 'Applying',
  applied: 'Applied',
  decided: 'Decided',
  not_applying: 'Not Applying',
}

const STATUS_COLORS: Record<string, string> = {
  considering: '#6366f1',
  applying: '#0369a1',
  applied: '#059669',
  decided: '#7c3aed',
  not_applying: '#9ca3af',
}

export default function ListsPage() {
  const { getToken } = useAuth()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const [userId, setUserId] = useState<number | null>(null)
  const [entries, setEntries] = useState<CollegeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [activeTab, setActiveTab] = useState<'research' | 'applications'>('research')

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken()
        const usageRes = await fetch(`${apiUrl}/my-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!usageRes.ok) { setError('Not signed in.'); setLoading(false); return }
        const usage = await usageRes.json()
        setUserId(usage.user_id)

        const listRes = await fetch(`${apiUrl}/lists/${usage.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (listRes.ok) {
          const data = await listRes.json()
          setEntries(data.research || [])
        }
      } catch { setError('Failed to load lists.') } finally { setLoading(false) }
    }
    load()
  }, [getToken, apiUrl])

  const addCollege = async () => {
    if (!userId || !addName.trim()) return
    setAdding(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/lists/${userId}/colleges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ college_name: addName.trim() }),
      })
      if (res.ok) {
        const added = await res.json()
        if (added.id) setEntries((prev) => [{ ...added, status: added.status || 'considering' }, ...prev])
        setAddName('')
      }
    } catch { /* ignore */ } finally { setAdding(false) }
  }

  const updateStatus = async (entryId: number, status: string) => {
    const token = await getToken()
    await fetch(`${apiUrl}/lists/colleges/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, status } : e))
  }

  const removeCollege = async (entryId: number) => {
    const token = await getToken()
    await fetch(`${apiUrl}/lists/colleges/${entryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
  }

  const applications = entries.filter((e) => e.status === 'applying' || e.status === 'applied' || e.status === 'decided')
  const researchList = entries

  const displayList = activeTab === 'applications' ? applications : researchList

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <p className="text-gray-500">{error}</p>
      <Link href="/sign-in" className="text-indigo-600 underline">Sign in</Link>
    </div>
  )

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f5f6fa', minHeight: '100dvh' }}>
      <header style={{ background: '#0c1b33', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
        </Link>
        <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
          ← Back to Soar
        </Link>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c1b33', marginBottom: 8 }}>My College Lists</h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 24 }}>Soar adds colleges here as you research them. You can also add and update them manually.</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
          {(['research', 'applications'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', border: 'none',
                background: activeTab === tab ? '#4f46e5' : '#fff',
                color: activeTab === tab ? '#fff' : '#374151',
              }}
            >
              {tab === 'research' ? `Research List (${researchList.length})` : `Applications (${applications.length})`}
            </button>
          ))}
        </div>

        {/* Add college */}
        {activeTab === 'research' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCollege()}
              placeholder="Add a college by name…"
              style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: '0.875rem', outline: 'none' }}
            />
            <button
              onClick={addCollege}
              disabled={adding || !addName.trim()}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', opacity: adding ? 0.7 : 1 }}
            >
              Add
            </button>
          </div>
        )}

        {/* List */}
        {displayList.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '40px 24px', textAlign: 'center', color: '#9ca3af' }}>
            {activeTab === 'research'
              ? 'No colleges yet. Ask Soar about colleges to build your list, or add one above.'
              : 'No applications yet. Update a college\'s status to "Applying" to see it here.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayList.map((e) => (
              <div key={e.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937', marginBottom: 4 }}>{e.college_name}</p>
                  {e.programs_of_interest && (
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>{e.programs_of_interest}</p>
                  )}
                  {e.ai_student_notes && (
                    <p style={{ fontSize: '0.8rem', color: '#374151', marginTop: 4, fontStyle: 'italic' }}>{e.ai_student_notes}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <select
                    value={e.status}
                    onChange={(ev) => updateStatus(e.id, ev.target.value)}
                    style={{
                      border: `1.5px solid ${STATUS_COLORS[e.status] || '#e5e7eb'}`,
                      borderRadius: 6, padding: '4px 8px', fontSize: '0.78rem',
                      fontWeight: 600, color: STATUS_COLORS[e.status] || '#374151',
                      background: '#fff', cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeCollege(e.id)}
                    style={{ color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                    title="Remove"
                  >×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
