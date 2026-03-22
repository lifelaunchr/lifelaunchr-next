'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  gpa_weighted?: number
  gpa_unweighted?: number
  sat_total?: number
  sat_math?: number
  sat_reading?: number
  act_composite?: number
  graduation_year?: number
  high_school_name?: string
  high_school_city?: string
  high_school_state?: string
  home_state?: string
  intended_majors?: string
  college_preferences?: string
  family_income_tier?: string
  budget_max?: number
}

interface Activity {
  id: number
  category: string
  role: string
  organization: string
  description?: string
  grade_levels?: string
  hours_per_week?: number
  weeks_per_year?: number
  is_current: boolean
}

const INCOME_TIERS = [
  { value: '0_30k', label: 'Under $30,000' },
  { value: '30_48k', label: '$30,000 – $48,000' },
  { value: '48_75k', label: '$48,000 – $75,000' },
  { value: '75_110k', label: '$75,000 – $110,000' },
  { value: '110k_plus', label: 'Over $110,000' },
]

function ProfileContent() {
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const searchParams = useSearchParams()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // ?for=<studentId> — set when a counselor/parent navigates from the sidebar
  const forParam = searchParams.get('for')
  const forStudentId = forParam ? parseInt(forParam, 10) : null

  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [accountType, setAccountType] = useState<string>('student')
  const [canWrite, setCanWrite] = useState(true)   // from API; false for parents
  const [profile, setProfile] = useState<Profile>({})
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)
  // Counselor-specific fields
  const [counselorOrg, setCounselorOrg] = useState('')
  const [counselorType, setCounselorType] = useState('')
  const [savingCounselor, setSavingCounselor] = useState(false)

  // New activity form
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [newActivity, setNewActivity] = useState({ category: '', role: '', organization: '', description: '', hours_per_week: '', weeks_per_year: '', is_current: true })

  // True when we're viewing someone else's profile
  const isViewingStudent = forStudentId !== null

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken()

        // Always fetch our own usage first (for account_type + myUserId)
        const usageRes = await fetch(`${apiUrl}/my-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!usageRes.ok) { setError('Not signed in.'); setLoading(false); return }
        const usage = await usageRes.json()
        setMyUserId(usage.user_id)
        setAccountType(usage.account_type || 'student')

        // Determine which user's profile to load
        const targetId = forStudentId ?? usage.user_id

        // If viewing a student, resolve their name from /my-students
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

        // Load profile
        const profRes = await fetch(`${apiUrl}/profile/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (profRes.ok) {
          const data = await profRes.json()
          setProfile(data.profile || {})
          setActivities(data.activities || [])
          if (typeof data.can_write === 'boolean') setCanWrite(data.can_write)
          if (data.counselor_info) {
            setCounselorOrg(data.counselor_info.organization || '')
            setCounselorType(data.counselor_info.counselor_type || '')
          }
        }
      } catch {
        setError('Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getToken, apiUrl, forStudentId])

  const targetId = forStudentId ?? myUserId

  const saveProfile = async () => {
    if (!targetId || !canWrite) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/profile/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const deleteActivity = async (activityId: number) => {
    if (!canWrite) return
    const token = await getToken()
    await fetch(`${apiUrl}/profile/activities/${activityId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setActivities((prev) => prev.filter((a) => a.id !== activityId))
  }

  const addActivity = async () => {
    if (!targetId || !canWrite || !newActivity.category || !newActivity.role || !newActivity.organization) return
    const token = await getToken()
    const res = await fetch(`${apiUrl}/profile/${targetId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...newActivity,
        hours_per_week: newActivity.hours_per_week ? Number(newActivity.hours_per_week) : null,
        weeks_per_year: newActivity.weeks_per_year ? Number(newActivity.weeks_per_year) : null,
      }),
    })
    if (res.ok) {
      const added = await res.json()
      setActivities((prev) => [...prev, added])
      setNewActivity({ category: '', role: '', organization: '', description: '', hours_per_week: '', weeks_per_year: '', is_current: true })
      setShowAddActivity(false)
    }
  }

  const inputStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
    background: !canWrite ? '#f9fafb' : '#fff',
    color: !canWrite ? '#6b7280' : '#111827',
    ...extra,
  })

  const field = (label: string, key: keyof Profile, type: string = 'text', placeholder: string = '') => (
    <div>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={(profile[key] as string | number) ?? ''}
        onChange={(e) => canWrite && setProfile((p) => ({ ...p, [key]: type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value }))}
        placeholder={placeholder}
        readOnly={!canWrite}
        style={inputStyle()}
      />
    </div>
  )

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af' }}>Loading...</div>
  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <p style={{ color: '#6b7280' }}>{error}</p>
      <Link href="/sign-in" style={{ color: '#4f46e5', textDecoration: 'underline' }}>Sign in</Link>
    </div>
  )

  const pageTitle = isViewingStudent
    ? `${studentName ? `${studentName}'s` : 'Student'} Profile`
    : accountType === 'counselor' ? 'My Info' : 'My Profile'

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f5f6fa', minHeight: '100dvh' }}>
      {/* Header */}
      <header style={{ background: '#0c1b33', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
        </Link>
        <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
          ← Back to Soar
        </Link>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c1b33', marginBottom: isViewingStudent ? 12 : 24 }}>
          {pageTitle}
        </h1>

        {/* Viewing-student banner */}
        {isViewingStudent && (
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: '0.875rem', color: '#4338ca' }}>
            {canWrite
              ? `✏️ You're viewing ${studentName ? `${studentName}'s` : 'this student\'s'} profile. You can edit on their behalf.`
              : `👁 You're viewing ${studentName ? `${studentName}'s` : 'this student\'s'} profile. Fields are read-only.`}
          </div>
        )}

        {/* Counselor info section — only when viewing own profile as counselor */}
        {!isViewingStudent && accountType === 'counselor' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16 }}>Professional Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>Role</label>
                <select
                  value={counselorType}
                  onChange={(e) => setCounselorType(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                >
                  <option value="">— Select —</option>
                  <option value="school_counselor">School counselor</option>
                  <option value="iec">Independent educational consultant (IEC)</option>
                  <option value="admissions_coach">College admissions coach</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>
                  {counselorType === 'school_counselor' ? 'School name' : 'Practice / company name'}
                </label>
                <input
                  value={counselorOrg}
                  onChange={(e) => setCounselorOrg(e.target.value)}
                  placeholder={counselorType === 'school_counselor' ? 'Lincoln High School' : 'Smith College Consulting'}
                  style={inputStyle()}
                />
              </div>
            </div>
            <button
              onClick={async () => {
                if (!myUserId || !clerkUser) return
                setSavingCounselor(true)
                try {
                  const token = await getToken()
                  await fetch(`${apiUrl}/auth/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      clerk_user_id: clerkUser.id,
                      email: clerkUser.emailAddresses[0]?.emailAddress || '',
                      full_name: clerkUser.fullName || clerkUser.firstName || '',
                      account_type: 'counselor',
                      counselor_type: counselorType || undefined,
                      organization: counselorOrg || undefined,
                    }),
                  })
                  setSaved(true); setTimeout(() => setSaved(false), 2000)
                } catch { /* ignore */ } finally { setSavingCounselor(false) }
              }}
              disabled={savingCounselor}
              style={{ marginTop: 16, background: savingCounselor ? '#818cf8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {saved ? '✓ Saved' : savingCounselor ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}

        {/* Academic info + student sections */}
        {(accountType !== 'counselor' || isViewingStudent) && (<>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16 }}>Academic Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {field('GPA (Weighted)', 'gpa_weighted', 'number', '4.0')}
            {field('GPA (Unweighted)', 'gpa_unweighted', 'number', '3.8')}
            {field('SAT Total', 'sat_total', 'number', '1400')}
            {field('SAT Math', 'sat_math', 'number', '720')}
            {field('SAT Reading/Writing', 'sat_reading', 'number', '680')}
            {field('ACT Composite', 'act_composite', 'number', '32')}
            {field('Graduation Year', 'graduation_year', 'number', '2026')}
            {field('Home State', 'home_state', 'text', 'CA')}
          </div>
        </div>

        {/* High school */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16 }}>High School</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {field('School Name', 'high_school_name', 'text', 'Lincoln High School')}
            {field('City', 'high_school_city', 'text', 'San Francisco')}
            {field('State', 'high_school_state', 'text', 'CA')}
          </div>
        </div>

        {/* Preferences */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16 }}>Preferences &amp; Goals</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>Intended Major(s)</label>
              <input
                value={profile.intended_majors ?? ''}
                onChange={(e) => canWrite && setProfile((p) => ({ ...p, intended_majors: e.target.value }))}
                placeholder="Computer Science, Economics"
                readOnly={!canWrite}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>College Preferences</label>
              <textarea
                value={profile.college_preferences ?? ''}
                onChange={(e) => canWrite && setProfile((p) => ({ ...p, college_preferences: e.target.value }))}
                placeholder="Small liberal arts, urban setting, strong research opportunities..."
                rows={3}
                readOnly={!canWrite}
                style={{ ...inputStyle(), resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>Family Income Tier</label>
              <select
                value={profile.family_income_tier ?? ''}
                onChange={(e) => canWrite && setProfile((p) => ({ ...p, family_income_tier: e.target.value }))}
                disabled={!canWrite}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: '0.875rem', outline: 'none', background: !canWrite ? '#f9fafb' : '#fff', color: !canWrite ? '#6b7280' : '#111827' }}
              >
                <option value="">— Select —</option>
                {INCOME_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>Max Annual Budget (net price, $)</label>
              <input
                type="number"
                value={profile.budget_max ?? ''}
                onChange={(e) => canWrite && setProfile((p) => ({ ...p, budget_max: e.target.value === '' ? undefined : Number(e.target.value) }))}
                placeholder="30000"
                readOnly={!canWrite}
                style={inputStyle()}
              />
            </div>
          </div>
        </div>

        {/* Save button — editable profiles only */}
        {canWrite && (
          <button
            onClick={saveProfile}
            disabled={saving}
            style={{ background: saving ? '#818cf8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: '0.9rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 32 }}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Profile'}
          </button>
        )}
        </>)}

        {/* Activities */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33' }}>Activities &amp; Awards</h2>
            {canWrite && (
              <button
                onClick={() => setShowAddActivity((v) => !v)}
                style={{ fontSize: '0.8rem', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 6, padding: '4px 12px', background: '#eef2ff', cursor: 'pointer' }}
              >
                + Add
              </button>
            )}
          </div>

          {canWrite && showAddActivity && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Category*</label>
                  <input value={newActivity.category} onChange={(e) => setNewActivity((p) => ({ ...p, category: e.target.value }))} placeholder="Sports, Arts, Leadership…" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Role / Position*</label>
                  <input value={newActivity.role} onChange={(e) => setNewActivity((p) => ({ ...p, role: e.target.value }))} placeholder="Captain, President…" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Organization*</label>
                  <input value={newActivity.organization} onChange={(e) => setNewActivity((p) => ({ ...p, organization: e.target.value }))} placeholder="School name, club name…" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Hrs/week · Weeks/year</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" value={newActivity.hours_per_week} onChange={(e) => setNewActivity((p) => ({ ...p, hours_per_week: e.target.value }))} placeholder="10" style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: '0.85rem' }} />
                    <input type="number" value={newActivity.weeks_per_year} onChange={(e) => setNewActivity((p) => ({ ...p, weeks_per_year: e.target.value }))} placeholder="36" style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Description</label>
                <textarea value={newActivity.description} onChange={(e) => setNewActivity((p) => ({ ...p, description: e.target.value }))} rows={2} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addActivity} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: '0.85rem', cursor: 'pointer' }}>Save Activity</button>
                <button onClick={() => setShowAddActivity(false)} style={{ background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 16px', fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {activities.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No activities added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.map((a) => (
                <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2937' }}>{a.role} — {a.organization}</p>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{a.category}{a.hours_per_week ? ` · ${a.hours_per_week} hrs/wk` : ''}{a.weeks_per_year ? ` · ${a.weeks_per_year} wks/yr` : ''}</p>
                    {a.description && <p style={{ fontSize: '0.8rem', color: '#374151', marginTop: 4 }}>{a.description}</p>}
                  </div>
                  {canWrite && (
                    <button onClick={() => deleteActivity(a.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0, marginLeft: 12 }}>Remove</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af' }}>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  )
}
