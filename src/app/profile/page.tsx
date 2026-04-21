'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  gpa_weighted?: number | null
  gpa_unweighted?: number | null
  gpa_scale?: number | null
  sat_total?: number | null
  sat_math?: number | null
  sat_reading?: number | null
  act_composite?: number | null
  act_english?: number | null
  act_math?: number | null
  act_reading?: number | null
  act_science?: number | null
  class_rank?: number | null
  class_size?: number | null
  graduation_year?: number | null
  home_state?: string
  citizenship?: string
  country_of_residence?: string
  high_school_name?: string
  high_school_city?: string
  high_school_state?: string
  high_school_ncessch?: string
  school_profile_url?: string
  college_interests?: string[]
  intended_majors?: string
  college_preferences?: string
  family_income_tier?: string
  student_aid_index?: string
  budget_max?: number
  personal_statement_draft?: string
  testing_status?: string
  next_test_date?: string
  // Counselor-only
  ec_rating?: string
  athletic_rating?: string
  academic_rigor_rating?: string
  coach_notes?: string
}

interface HsSuggestion {
  ncessch: string
  name: string
  city: string
  state: string
}

const INCOME_TIERS = [
  { value: '0_30k', label: 'Under $30,000' },
  { value: '30_48k', label: '$30,000 – $48,000' },
  { value: '48_75k', label: '$48,000 – $75,000' },
  { value: '75_110k', label: '$75,000 – $110,000' },
  { value: '110k_plus', label: 'Over $110,000' },
]

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' }, { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'outside_us', label: 'Outside the U.S.' },
]

const COLLEGE_INTERESTS = [
  { value: 'super_selective', label: 'Super-Selective Universities' },
  { value: 'liberal_arts', label: 'Liberal Arts Colleges' },
  { value: 'social_sciences_humanities', label: 'Social Sciences or Humanities Programs' },
  { value: 'engineering_cs', label: 'Engineering or Computer Science' },
  { value: 'stem', label: 'STEM Fields' },
  { value: 'pre_med', label: 'Pre-Med, Pre-Vet, and Other Pre-Health Programs' },
  { value: 'nursing', label: 'Direct-Admit and Other Nursing Programs' },
  { value: 'performing_arts', label: 'Music, Theater, and Other Performing Arts Programs' },
  { value: 'design_visual_arts', label: 'Design and Visual Arts Programs' },
  { value: 'uk_canada', label: 'Universities in the UK and Canada' },
]

const EC_RATINGS = [
  { value: 'exceptional_unusual', label: 'Exceptional Accomplishment or Unusual Strengths' },
  { value: 'strong_school_district', label: 'Strong Accomplishments at School or District Level' },
  { value: 'solid_participation', label: 'Solid Participation' },
  { value: 'minimal', label: 'Minimal: Not Very Active' },
  { value: 'family_commitments', label: 'Substantial Family or Other Commitments' },
  { value: 'special_circumstances', label: 'Special Circumstances Limit Participation' },
]

const ATHLETIC_RATINGS = [
  { value: 'exceptional_state_national', label: 'Exceptional: State or National Recognition' },
  { value: 'very_good_school_district', label: 'Very Good: Stands Out in School, District, or Region' },
  { value: 'moderate_solid', label: 'Moderate: Solid Achievements' },
  { value: 'minimal', label: 'Minimal: Not Very Active' },
  { value: 'family_commitments', label: 'Substantial Family or Other Commitments' },
  { value: 'special_circumstances', label: 'Special Circumstances Limit Participation' },
]

const ACADEMIC_RIGOR_RATINGS = [
  { value: 'exceptionally_rigorous', label: 'Exceptionally Rigorous Curriculum Based on Offerings' },
  { value: 'very_good_rigorous', label: 'Very Good: Took Several Rigorous Courses' },
  { value: 'moderate_rigor', label: 'Moderate Rigor' },
  { value: 'minimal_rigor', label: 'Minimal Rigor in Curriculum' },
  { value: 'family_commitments', label: 'Substantial Family or Other Commitments' },
  { value: 'special_circumstances', label: 'Special Circumstances Limit Participation' },
]

function ProfileContent() {
  const { getToken, isLoaded } = useAuth()
  const { user: clerkUser } = useUser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // ?for=<studentId> — set when a counselor/parent navigates from the sidebar
  const forParam = searchParams.get('for')
  const forStudentId = forParam ? parseInt(forParam, 10) : null

  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [accountType, setAccountType] = useState<string>('student')
  const [usageData, setUsageData] = useState<{
    user_id?: number
    messages_used: number
    effective_limit: number | null
    sessions_used?: number
    session_limit?: number | null
    display_plan?: string
    breakdown?: string
    can_use_essays?: boolean
    can_use_plans?: boolean
    history_retention_days?: number | null
    account_type?: string
    active_students?: number | null
    student_limit?: number | null
  } | null>(null)
  const [canWrite, setCanWrite] = useState(true)   // from API; false for parents
  const [profile, setProfile] = useState<Profile>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)
  // Counselor-specific fields
  const [counselorOrg, setCounselorOrg] = useState('')
  const [counselorType, setCounselorType] = useState('')
  const [savingCounselor, setSavingCounselor] = useState(false)

  // High school autocomplete state
  const [hsSearchState, setHsSearchState] = useState('')
  const [hsQuery, setHsQuery] = useState('')
  const [hsSuggestions, setHsSuggestions] = useState<HsSuggestion[]>([])
  const [hsShowManual, setHsShowManual] = useState(false)
  const [hsLoading, setHsLoading] = useState(false)
  const hsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // True when we're viewing someone else's profile
  const isViewingStudent = forStudentId !== null

  useEffect(() => {
    // Wait for Clerk to finish loading the session before proceeding.
    // clerkUser is null on first render; the effect re-runs once it's available.
    if (!isLoaded) return
    if (!clerkUser) { router.replace('/'); return }
    const load = async () => {
      try {
        const token = await getToken()
        if (!token) { setError('Not signed in.'); setLoading(false); return }

        // Ensure user exists in DB (needed if user navigates here without loading chat first)
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

        // Always fetch our own usage first (for account_type + myUserId)
        const usageRes = await fetch(`${apiUrl}/my-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!usageRes.ok) { setError('Not signed in.'); setLoading(false); return }
        const usage = await usageRes.json()
        setMyUserId(usage.user_id)
        setAccountType(usage.account_type || 'student')
        setUsageData(usage)

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
          const p = data.profile || {}
          setProfile(p)
          if (typeof data.can_write === 'boolean') setCanWrite(data.can_write)
          if (data.counselor_info) {
            setCounselorOrg(data.counselor_info.organization || '')
            setCounselorType(data.counselor_info.counselor_type || '')
          }
          // Sync HS state selector
          if (p.high_school_state) {
            setHsSearchState(p.high_school_state)
          }
          if (p.high_school_name) {
            setHsQuery(p.high_school_name)
          }
        }


      } catch {
        setError('Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getToken, apiUrl, forStudentId, clerkUser])

  const targetId = forStudentId ?? myUserId

  // HS autocomplete debounced fetch
  useEffect(() => {
    if (!hsQuery || hsSearchState === 'outside_us' || hsShowManual) {
      setHsSuggestions([])
      return
    }
    if (hsDebounceRef.current) clearTimeout(hsDebounceRef.current)
    hsDebounceRef.current = setTimeout(async () => {
      setHsLoading(true)
      try {
        const token = await getToken()
        const res = await fetch(
          `${apiUrl}/schools?q=${encodeURIComponent(hsQuery)}&state=${encodeURIComponent(hsSearchState)}&limit=8`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const suggestions: HsSuggestion[] = await res.json()
          setHsSuggestions(suggestions)
        }
      } catch { /* ignore */ } finally {
        setHsLoading(false)
      }
    }, 300)
    return () => { if (hsDebounceRef.current) clearTimeout(hsDebounceRef.current) }
  }, [hsQuery, hsSearchState, hsShowManual, apiUrl, getToken])

  const saveProfile = async () => {
    if (!targetId || !canWrite) return
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getToken()
      // Send null for empty college_interests array to avoid psycopg2 type inference issues
      const interests = profile.college_interests && profile.college_interests.length > 0
        ? profile.college_interests
        : null
      const res = await fetch(`${apiUrl}/profile/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...profile,
          college_interests: interests,
        }),
      })
      if (res.ok) {
        // Re-fetch the profile from the server to confirm what was actually persisted
        const token2 = await getToken()
        const fresh = await fetch(`${apiUrl}/profile/${targetId}`, {
          headers: { Authorization: `Bearer ${token2}` },
        })
        if (fresh.ok) {
          const freshData = await fresh.json()
          const p = freshData.profile || {}
          setProfile(p)
          if (p.high_school_state) setHsSearchState(p.high_school_state)
          if (p.high_school_name) setHsQuery(p.high_school_name)
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        const body = await res.json().catch(() => ({}))
        setSaveError(body.detail || `Save failed (${res.status})`)
      }
    } catch (e) {
      setSaveError('Network error — check your connection.')
    } finally {
      setSaving(false)
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

  const selectStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: '0.875rem',
    outline: 'none',
    background: !canWrite ? '#f9fafb' : '#fff',
    color: !canWrite ? '#6b7280' : '#111827',
    ...extra,
  })

  const field = (label: string, key: keyof Profile, type: string = 'text', placeholder: string = '', inputProps?: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={(profile[key] as string | number | null) ?? ''}
        onChange={(e) => canWrite && setProfile((p) => ({ ...p, [key]: type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value }))}
        placeholder={placeholder}
        readOnly={!canWrite}
        style={inputStyle()}
        {...inputProps}
      />
      {hint && <p style={{ fontSize: '0.65rem', color: '#9ca3af', margin: '3px 0 0', lineHeight: 1.3 }}>{hint}</p>}
    </div>
  )

  const counselorField = (label: string, key: keyof Profile, type: string = 'text', placeholder: string = '', inputProps?: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={(profile[key] as string | number | null) ?? ''}
        onChange={(e) => canWrite && setProfile((p) => ({ ...p, [key]: type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value }))}
        placeholder={placeholder}
        readOnly={!canWrite}
        style={inputStyle()}
        {...inputProps}
      />
      {hint && <p style={{ fontSize: '0.65rem', color: '#9ca3af', margin: '3px 0 0', lineHeight: 1.3 }}>{hint}</p>}
    </div>
  )

  const isCounselorViewing = isViewingStudent && accountType === 'counselor'

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
      <header style={{ background: '#0c1b33', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="px-4 sm:px-6 py-3">
        <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
        </Link>
        <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
          ← Back to Soar
        </Link>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto' }} className="px-4 sm:px-6 pt-6 sm:pt-8 pb-20">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c1b33', marginBottom: isViewingStudent ? 12 : 24 }}>
          {pageTitle}
        </h1>

        {/* Viewing-student banner */}
        {isViewingStudent && (
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: '0.875rem', color: '#4338ca' }}>
            {canWrite
              ? `You're viewing ${studentName ? `${studentName}'s` : 'this student\'s'} profile. You can edit on their behalf.`
              : `You're viewing ${studentName ? `${studentName}'s` : 'this student\'s'} profile. Fields are read-only.`}
          </div>
        )}

        {/* Plan & Usage */}
        {usageData && !forStudentId && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Your Plan &amp; Usage</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-8 text-gray-500 font-medium">Limit</th>
                    <th className="text-right py-2 pr-8 text-gray-500 font-medium">Used</th>
                    <th className="text-right py-2 pr-8 text-gray-500 font-medium">Total</th>
                    <th className="text-left py-2 text-gray-500 font-medium">How is this computed?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="py-3 pr-8 font-medium text-gray-800">Sessions this month</td>
                    <td className="py-3 pr-8 text-right text-gray-700">{usageData.sessions_used ?? 0}</td>
                    <td className="py-3 pr-8 text-right text-gray-700">
                      {usageData.session_limit === null || usageData.session_limit === undefined ? 'Unlimited' : usageData.session_limit}
                    </td>
                    <td className="py-3 text-gray-500 text-xs">{usageData.breakdown || usageData.display_plan}</td>
                  </tr>
                  {usageData.account_type === 'counselor' && (
                    <tr>
                      <td className="py-3 pr-8 font-medium text-gray-800">Active students</td>
                      <td className="py-3 pr-8 text-right text-gray-700">{usageData.active_students ?? 0}</td>
                      <td className="py-3 pr-8 text-right text-gray-700">
                        {usageData.student_limit === null || usageData.student_limit === undefined ? 'Unlimited' : usageData.student_limit}
                      </td>
                      <td className="py-3 text-gray-500 text-xs">Based on your plan</td>
                    </tr>
                  )}
                  {usageData.account_type !== 'counselor' && (
                    <>
                      <tr>
                        <td className="py-3 pr-8 font-medium text-gray-800">History retention</td>
                        <td className="py-3 pr-8 text-right text-gray-400">—</td>
                        <td className="py-3 pr-8 text-right text-gray-700">
                          {usageData.history_retention_days === null || usageData.history_retention_days === undefined
                            ? '∞ unlimited'
                            : `${usageData.history_retention_days} days`}
                        </td>
                        <td className="py-3 text-gray-500 text-xs">Based on your {usageData.display_plan || 'plan'}</td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-8 font-medium text-gray-800">Essay assistance</td>
                        <td className="py-3 pr-8 text-right text-gray-400">—</td>
                        <td className="py-3 pr-8 text-right text-gray-700">
                          {usageData.can_use_essays ? '✓ Included' : '✗ Not included'}
                        </td>
                        <td className="py-3 text-gray-500 text-xs">
                          {usageData.can_use_essays ? 'Available on your plan' : <a href="/upgrade" className="text-indigo-500 hover:underline">Upgrade to unlock →</a>}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Plan: <span className="font-medium text-gray-600">{usageData.display_plan || '—'}</span>
              {' · '}
              <a href="/upgrade" className="text-indigo-500 hover:underline">See all plans →</a>
            </p>
          </section>
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
              {saved ? 'Saved' : savingCounselor ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {/* Academic info + student sections */}
        {(accountType !== 'counselor' || isViewingStudent) && (<>

        {/* Academic Information */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16 }}>Academic Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Row 1: GPA, Class Rank/Size */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {field('GPA (Weighted)', 'gpa_weighted', 'number', '4.0', { min: 0.5, max: 100, step: 0.01 })}
              {field('GPA (Unweighted)', 'gpa_unweighted', 'number', '3.8', { min: 0.5, max: 100, step: 0.01 })}
              {field('GPA Scale', 'gpa_scale', 'number', '4.0', { min: 4, max: 100, step: 0.01 }, 'Highest possible unweighted GPA at your school (e.g. 4.0, even if AP/honors courses add extra weight)')}
              {field('Class Rank', 'class_rank', 'number', '12')}
              {field('Class Size', 'class_size', 'number', '350')}
            </div>
            {/* Row 2: SAT */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {field('SAT Total', 'sat_total', 'number', '1400')}
              {field('SAT Math', 'sat_math', 'number', '720')}
              {field('SAT Reading/Writing', 'sat_reading', 'number', '680')}
            </div>
            {/* Row 3: ACT */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {field('ACT Composite', 'act_composite', 'number', '32')}
              {field('ACT English', 'act_english', 'number', '34')}
              {field('ACT Math', 'act_math', 'number', '30')}
              {field('ACT Reading', 'act_reading', 'number', '33')}
              {field('ACT Science', 'act_science', 'number', '31')}
            </div>
            {/* Row 3b: Testing status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>Testing Status</label>
                <select
                  value={profile.testing_status ?? ''}
                  onChange={(e) => canWrite && setProfile((p) => ({ ...p, testing_status: e.target.value || undefined }))}
                  disabled={!canWrite}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: '0.875rem', background: canWrite ? '#fff' : '#f9fafb', color: '#111827' }}
                >
                  <option value="">— Select —</option>
                  <option value="plan_to_take_retake">Plans to Take / Retake</option>
                  <option value="testing_complete">Testing Complete</option>
                  <option value="no_plan">No Plan to Test</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>Next Test Date</label>
                <input
                  type="date"
                  value={profile.next_test_date ?? ''}
                  onChange={(e) => canWrite && setProfile((p) => ({ ...p, next_test_date: e.target.value || undefined }))}
                  disabled={!canWrite}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: '0.875rem', background: canWrite ? '#fff' : '#f9fafb', color: '#111827' }}
                />
              </div>
            </div>
            {/* Row 4: Grad year, home state */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {field('Graduation Year', 'graduation_year', 'number', '2026')}
              {field('Home State', 'home_state', 'text', 'CA')}
            </div>
          </div>
        </div>

        {/* Background */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16 }}>Background</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>Citizenship</label>
              <select
                value={profile.citizenship ?? ''}
                onChange={(e) => canWrite && setProfile((p) => ({ ...p, citizenship: e.target.value || undefined }))}
                disabled={!canWrite}
                style={selectStyle()}
              >
                <option value="">— Select —</option>
                <option value="us_citizen">U.S. Citizen</option>
                <option value="international_student">International Student</option>
                <option value="other">Other</option>
              </select>
            </div>
            {(profile.citizenship === 'international_student' || profile.citizenship === 'other') && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>Country of Residence</label>
                <input
                  type="text"
                  value={profile.country_of_residence ?? ''}
                  onChange={(e) => canWrite && setProfile((p) => ({ ...p, country_of_residence: e.target.value || undefined }))}
                  placeholder="e.g. Canada, India, South Korea"
                  readOnly={!canWrite}
                  style={inputStyle()}
                />
              </div>
            )}
          </div>
        </div>

        {/* High School */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16 }}>High School</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* State dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>State</label>
              <select
                value={hsSearchState}
                onChange={(e) => {
                  const val = e.target.value
                  setHsSearchState(val)
                  setProfile((p) => ({ ...p, high_school_state: val || undefined }))
                  setHsSuggestions([])
                }}
                disabled={!canWrite}
                style={selectStyle()}
              >
                <option value="">— Select —</option>
                {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* School name: autocomplete or manual */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>
                School Name
                {!hsShowManual && hsSearchState && hsSearchState !== 'outside_us' && canWrite && (
                  <button
                    type="button"
                    onClick={() => { setHsShowManual(true); setHsSuggestions([]) }}
                    style={{ marginLeft: 8, fontSize: '0.7rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Can&apos;t find it? Enter manually
                  </button>
                )}
              </label>

              {hsSearchState === 'outside_us' || hsShowManual ? (
                // Free text input
                <input
                  type="text"
                  value={profile.high_school_name ?? ''}
                  onChange={(e) => canWrite && setProfile((p) => ({ ...p, high_school_name: e.target.value }))}
                  placeholder="Enter school name"
                  readOnly={!canWrite}
                  style={inputStyle()}
                />
              ) : (
                // Autocomplete input
                <>
                  <input
                    type="text"
                    value={hsQuery}
                    onChange={(e) => {
                      if (!canWrite) return
                      setHsQuery(e.target.value)
                      setProfile((p) => ({ ...p, high_school_name: e.target.value, high_school_ncessch: undefined }))
                    }}
                    placeholder={hsSearchState ? 'Search for your school...' : 'Select a state first'}
                    readOnly={!canWrite || !hsSearchState}
                    style={inputStyle()}
                  />
                  {hsLoading && (
                    <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#9ca3af' }}>
                      Searching...
                    </div>
                  )}
                  {hsSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: 2, overflow: 'hidden',
                    }}>
                      {hsSuggestions.map((s) => (
                        <button
                          key={s.ncessch}
                          type="button"
                          onClick={() => {
                            setProfile((p) => ({
                              ...p,
                              high_school_name: s.name,
                              high_school_city: s.city,
                              high_school_state: s.state,
                              high_school_ncessch: s.ncessch,
                            }))
                            setHsQuery(s.name)
                            setHsSearchState(s.state)
                            setHsSuggestions([])
                          }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '8px 12px', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: '0.875rem', color: '#111827',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = '#f9fafb')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                          <span style={{ color: '#6b7280', marginLeft: 6, fontSize: '0.8rem' }}>{s.city}, {s.state}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* City */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>City</label>
              <input
                type="text"
                value={profile.high_school_city ?? ''}
                onChange={(e) => canWrite && setProfile((p) => ({ ...p, high_school_city: e.target.value }))}
                placeholder="San Francisco"
                readOnly={!canWrite}
                style={inputStyle()}
              />
            </div>

            {/* School Profile URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>School Profile URL</label>
              <input
                type="text"
                value={profile.school_profile_url ?? ''}
                onChange={(e) => canWrite && setProfile((p) => ({ ...p, school_profile_url: e.target.value }))}
                placeholder="https://..."
                readOnly={!canWrite}
                style={inputStyle()}
              />
            </div>
          </div>
        </div>

        {/* College Interests */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', marginBottom: 16 }}>College Interests</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {COLLEGE_INTERESTS.map((ci) => {
              const checked = (profile.college_interests || []).includes(ci.value)
              return (
                <label key={ci.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canWrite ? 'pointer' : 'default', fontSize: '0.875rem', color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canWrite}
                    onChange={(e) => {
                      if (!canWrite) return
                      const current = profile.college_interests || []
                      const updated = e.target.checked
                        ? [...current, ci.value]
                        : current.filter((v) => v !== ci.value)
                      setProfile((p) => ({ ...p, college_interests: updated }))
                    }}
                    style={{ width: 16, height: 16, accentColor: '#4f46e5' }}
                  />
                  {ci.label}
                </label>
              )
            })}
          </div>
        </div>

        {/* Preferences & Goals */}
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
                style={selectStyle()}
              >
                <option value="">— Select —</option>
                {INCOME_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>Student Aid Index (SAI / EFC)</label>
              <input
                type="text"
                value={profile.student_aid_index ?? ''}
                onChange={(e) => canWrite && setProfile((p) => ({ ...p, student_aid_index: e.target.value || undefined }))}
                placeholder="e.g. 12500 or -1500"
                readOnly={!canWrite}
                style={inputStyle()}
              />
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

        {/* Coach Assessment — counselor-only */}
        {isCounselorViewing && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Coach Assessment</h2>
            <p style={{ fontSize: '0.8rem', color: '#b45309', marginBottom: 16 }}>Only visible and editable by counselors</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Extracurricular Accomplishments</label>
                <select
                  value={profile.ec_rating ?? ''}
                  onChange={(e) => canWrite && setProfile((p) => ({ ...p, ec_rating: e.target.value || undefined }))}
                  disabled={!canWrite}
                  style={selectStyle({ background: !canWrite ? '#fef3c7' : '#fff' })}
                >
                  <option value="">— Select —</option>
                  {EC_RATINGS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Athletic Accomplishments</label>
                <select
                  value={profile.athletic_rating ?? ''}
                  onChange={(e) => canWrite && setProfile((p) => ({ ...p, athletic_rating: e.target.value || undefined }))}
                  disabled={!canWrite}
                  style={selectStyle({ background: !canWrite ? '#fef3c7' : '#fff' })}
                >
                  <option value="">— Select —</option>
                  {ATHLETIC_RATINGS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Academic Rigor</label>
                <select
                  value={profile.academic_rigor_rating ?? ''}
                  onChange={(e) => canWrite && setProfile((p) => ({ ...p, academic_rigor_rating: e.target.value || undefined }))}
                  disabled={!canWrite}
                  style={selectStyle({ background: !canWrite ? '#fef3c7' : '#fff' })}
                >
                  <option value="">— Select —</option>
                  {ACADEMIC_RIGOR_RATINGS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Coach Notes — counselor-only */}
        {isCounselorViewing && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Coach Notes</h2>
            <p style={{ fontSize: '0.8rem', color: '#b45309', marginBottom: 16 }}>Only visible and editable by counselors</p>
            <textarea
              value={profile.coach_notes ?? ''}
              onChange={(e) => canWrite && setProfile((p) => ({ ...p, coach_notes: e.target.value }))}
              placeholder="Internal notes about this student..."
              rows={5}
              readOnly={!canWrite}
              style={{ ...inputStyle({ background: !canWrite ? '#fef3c7' : '#fff' }), resize: 'vertical' }}
            />
          </div>
        )}


        {/* Save button — editable profiles only */}
        {canWrite && (
          <div style={{ marginBottom: 32 }}>
            <button
              onClick={saveProfile}
              disabled={saving}
              style={{ background: saved ? '#059669' : saving ? '#818cf8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: '0.9rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Profile'}
            </button>
            {saveError && (
              <p style={{ marginTop: 8, fontSize: '0.8rem', color: '#dc2626' }}>⚠ {saveError}</p>
            )}
          </div>
        )}
        </>)}

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
