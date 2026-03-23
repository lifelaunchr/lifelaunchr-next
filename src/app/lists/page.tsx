'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
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

function ListsContent() {
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const searchParams = useSearchParams()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // ?for=<studentId> — set when a counselor/parent navigates from the sidebar
  const forParam = searchParams.get('for')
  const forStudentId = forParam ? parseInt(forParam, 10) : null
  const isViewingStudent = forStudentId !== null

  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [canWrite, setCanWrite] = useState(true)   // from API; false for parents (read-only)
  const [entries, setEntries] = useState<CollegeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [activeTab, setActiveTab] = useState<'research' | 'applications'>('research')

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken()
        if (!token) { setError('Not signed in.'); setLoading(false); return }

        // Ensure user exists in DB (needed if navigating here without loading chat first)
        if (clerkUser) {
          await fetch(`${apiUrl}/auth/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              clerk_user_id: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              full_name: clerkUser.fullName || clerkUser.firstName || '',
              account_type: 'student',
            }),
          })
        }

        const usageRes = await fetch(`${apiUrl}/my-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!usageRes.ok) { setError('Not signed in.'); setLoading(false); return }
        const usage = await usageRes.json()
        setMyUserId(usage.user_id)

        const targetId = forStudentId ?? usage.user_id

        // Resolve student name if viewing another user
        if (forStudentId) {
          const studentsRes = await fetch(`${apiUrl}/my-students`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (studentsRes.ok) {
            const students: Array<{ id: number; full_name: string; email: string }> = await studentsRes.json()
            const match = students.find((s) => s.id === forStudentId)
            if (match) setStudentName(match.full_name || match.email)
          }
        }

        const listRes = await fetch(`${apiUrl}/lists/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (listRes.ok) {
          const data = await listRes.json()
          setEntries(data.research || [])
          // Backend tells us whether the viewer can edit (counselors yes, parents no)
          if (typeof data.can_write === 'boolean') setCanWrite(data.can_write)
        }
      } catch { setError('Failed to load lists.') } finally { setLoading(false) }
    }
    load()
  }, [getToken, apiUrl, forStudentId])

  const targetId = forStudentId ?? myUserId

  const addCollege = async () => {
    if (!targetId || !canWrite || !addName.trim()) return
    setAdding(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/lists/${targetId}/colleges`, {
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
    if (!canWrite) return
    const token = await getToken()
    await fetch(`${apiUrl}/lists/colleges/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, status } : e))
  }

  const removeCollege = async (entryId: number) => {
    if (!canWrite) return
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

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af' }}>Loading...</div>
  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <p style={{ color: '#6b7280' }}>{error}</p>
      <Link href="/sign-in" style={{ color: '#4f46e5', textDecoration: 'underline' }}>Sign in</Link>
    </div>
  )

  const pageTitle = isViewingStudent
    ? `${studentName ? `${studentName}'s` : 'Student'} College Lists`
    : 'My College Lists'

  const pageSubtitle = isViewingStudent
    ? `Viewing ${studentName ? `${studentName}'s` : 'this student\'s'} research list and applications.`
    : 'Soar adds colleges here as you research them. You can also add and update them manually.'

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
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c1b33', marginBottom: 8 }}>{pageTitle}</h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: isViewingStudent ? 16 : 24 }}>{pageSubtitle}</p>

        {/* Viewing-student banner */}
        {isViewingStudent && (
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: '0.875rem', color: '#4338ca' }}>
            {canWrite
              ? `✏️ You're viewing ${studentName ? `${studentName}'s` : 'this student\'s'} lists. You can add and remove colleges on their behalf.`
              : `👁 You're viewing ${studentName ? `${studentName}'s` : 'this student\'s'} lists. Changes are disabled.`}
          </div>
        )}

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

        {/* Add college — own list or counselor viewing student */}
        {canWrite && activeTab === 'research' && (
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
              ? (isViewingStudent ? 'No colleges on this student\'s list yet.' : 'No colleges yet. Ask Soar about colleges to build your list, or add one above.')
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
                  {canWrite ? (
                    <>
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
                    </>
                  ) : (
                    /* Read-only status badge for parents */
                    <span style={{
                      border: `1.5px solid ${STATUS_COLORS[e.status] || '#e5e7eb'}`,
                      borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem',
                      fontWeight: 600, color: STATUS_COLORS[e.status] || '#374151',
                      background: '#fff',
                    }}>
                      {STATUS_LABELS[e.status] || e.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ListsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af' }}>Loading...</div>}>
      <ListsContent />
    </Suspense>
  )
}
