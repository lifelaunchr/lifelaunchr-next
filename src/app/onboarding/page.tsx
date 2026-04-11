'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const ACCOUNT_TYPES = [
  { value: 'student', label: 'Student', emoji: '🎓', desc: 'I\'m a high school student' },
  { value: 'school_counselor', label: 'School counselor', emoji: '🏫', desc: 'I work at a high school' },
  { value: 'iec', label: 'Independent educational consultant', emoji: '💼', desc: 'I run an independent practice' },
  { value: 'admissions_coach', label: 'College admissions coach', emoji: '🧭', desc: 'I coach students individually' },
  { value: 'parent', label: 'Parent / guardian', emoji: '👪', desc: 'I\'m supporting a student' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const CURRENT_YEAR = new Date().getFullYear()
const GRAD_YEARS = Array.from({ length: 13 }, (_, i) => CURRENT_YEAR - 5 + i)

interface School {
  ncessch: string
  name: string
  district: string
  city: string
  state: string
}

interface College {
  id: string
  name: string
  city: string
  state_code: string
  website?: string
}

interface Tenant {
  id: number | null   // null = new practice to be created on submit
  display_name: string
}

// ── "Make the most of Soar" card content ──────────────────────────────────────
const SOAR_CARDS: Record<string, { tagline: string; cards: { emoji: string; title: string; desc: string }[] }> = {
  student: {
    tagline: "Soar is your conversation partner for the college journey — not just a more verbose Google.",
    cards: [
      { emoji: '🎯', title: 'Ask me anything about colleges', desc: 'I know about thousands of schools — admission stats, programs, campus life, costs, and more. Just name a school and I\'ll dive in.' },
      { emoji: '🧩', title: 'I\'ll help you find your fit', desc: 'Tell me your interests, goals, and what matters to you. I\'ll suggest schools that match — not just the famous ones.' },
      { emoji: '🔬', title: 'Explore majors and careers', desc: 'Not sure what to study? Let\'s explore together. I\'ll connect your interests to majors and career paths.' },
      { emoji: '✍️', title: 'Essay and application help', desc: 'I\'ll help you brainstorm topics, build structure, and refine your approach. (I won\'t write it for you — that\'s your voice!)' },
    ],
  },
  counselor: {
    tagline: "Soar is a research partner that knows what you know about colleges — and never forgets.",
    cards: [
      { emoji: '🔍', title: 'Research any college instantly', desc: 'I have data on thousands of schools — admissions, outcomes, programs, costs. Ask about any school for any student.' },
      { emoji: '👤', title: 'Explore fit for your students', desc: 'Select a student from the sidebar and I\'ll tailor my research to their profile, interests, and goals.' },
      { emoji: '📋', title: 'Build and compare lists', desc: 'I can add schools to a student\'s research list as we discuss them. Review and reorganize on the Lists page.' },
      { emoji: '📝', title: 'Draft session reports', desc: 'After a session, I can draft a summary report you can review and send to families.' },
    ],
  },
  parent: {
    tagline: "Soar helps you stay informed without stepping on your student's process.",
    cards: [
      { emoji: '🎓', title: 'Ask me anything about colleges', desc: 'I know about thousands of schools — admissions, programs, costs, and more. Ask me anything and I\'ll share what I know.' },
      { emoji: '📅', title: 'Understand the process', desc: 'Financial aid, deadlines, test requirements, application types — I\'ll help you make sense of it all.' },
      { emoji: '💡', title: 'Support without taking over', desc: 'I\'ll give you the facts so you can have informed conversations with your student. This is their journey — you\'re the support crew.' },
      { emoji: '🔒', title: 'Your conversations are private', desc: 'Your chats are separate from your student\'s. You can ask the awkward questions here.' },
    ],
  },
}

// Step dots indicator for the 3-step student profile flow (steps 1–3)
function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`rounded-full transition-all ${
            s === step
              ? 'w-6 h-2 bg-indigo-500'
              : s < step
              ? 'w-2 h-2 bg-indigo-300'
              : 'w-2 h-2 bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Steps: 1=role, 2=student profile, 3=college wishlist, 4=Make the most of Soar, 5=invite family (counselor), 6=question picker
  const [step, setStep] = useState<number>(1)

  // Role / org
  const [accountType, setAccountType] = useState<string>('')
  const [state, setState] = useState('')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [schoolResults, setSchoolResults] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [freeTextSchool, setFreeTextSchool] = useState('')
  const [showFreeText, setShowFreeText] = useState(false)
  const [searching, setSearching] = useState(false)
  const [tenantQuery, setTenantQuery] = useState('')
  const [tenantResults, setTenantResults] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [searchingTenant, setSearchingTenant] = useState(false)
  const tenantSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Student profile (step 2)
  const [gradYear, setGradYear] = useState('')
  const [homeState, setHomeState] = useState('')
  const [gpaWeighted, setGpaWeighted] = useState('')
  const [satTotal, setSatTotal] = useState('')
  const [actComposite, setActComposite] = useState('')
  const [intendedMajors, setIntendedMajors] = useState('')

  // College wishlist (step 3)
  const [collegeQuery, setCollegeQuery] = useState('')
  const [collegeResults, setCollegeResults] = useState<College[]>([])
  const [selectedColleges, setSelectedColleges] = useState<College[]>([])
  const [searchingCollege, setSearchingCollege] = useState(false)
  const collegeSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [migrationLinking, setMigrationLinking] = useState(false)

  // Invite family (step 5 — counselors only)
  const [invStudentName, setInvStudentName] = useState('')
  const [invStudentEmail, setInvStudentEmail] = useState('')
  const [invParentName, setInvParentName] = useState('')
  const [invParentEmail, setInvParentEmail] = useState('')
  const [invSubmitting, setInvSubmitting] = useState(false)
  const [invError, setInvError] = useState('')
  const [invitedStudentId, setInvitedStudentId] = useState<number | null>(null)
  const [invitedStudentName, setInvitedStudentName] = useState('')

  // Question picker (step 6)
  const [customQuestion, setCustomQuestion] = useState('')

  const isCounselor = ['school_counselor', 'iec', 'admissions_coach'].includes(accountType)
  const isSchoolCounselor = accountType === 'school_counselor'
  const needsOrg = accountType === 'iec' || accountType === 'admissions_coach'
  const isStudent = accountType === 'student'
  const isParent = accountType === 'parent'

  // ── Migration / family invite: skip role picker if account type is known ─────
  useEffect(() => {
    const token = sessionStorage.getItem('migration_invite_token')
    if (!token || !clerkUser) return

    setMigrationLinking(true)
    ;(async () => {
      try {
        const authToken = await getToken()
        const email = clerkUser.emailAddresses[0]?.emailAddress || ''
        const fullName = clerkUser.fullName || clerkUser.firstName || ''

        const syncRes = await fetch(`${apiUrl}/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            clerk_user_id: clerkUser.id,
            email,
            full_name: fullName,
            account_type: 'student',
          }),
        })

        await fetch(`${apiUrl}/accept-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, clerk_user_id: clerkUser.id, email }),
        })

        // Students already have a known role — skip role picker and go to profile step
        if (syncRes.ok) {
          const syncData = await syncRes.json()
          if (syncData.account_type === 'student') {
            setAccountType('student')
            setStep(2)
            return
          }
          if (syncData.account_type === 'parent') {
            // Parents skip profile steps but still see Soar intro + question picker
            setAccountType('parent')
            setStep(4)
            return
          }
          // Counselors: fall through to show step 1 normally
        }
      } catch {
        // Non-fatal — email-match in /auth/sync is what actually links the account
      } finally {
        sessionStorage.removeItem('migration_invite_token')
        setMigrationLinking(false)
      }
    })()
  }, [clerkUser, getToken, apiUrl, router])

  // ── Tenant autocomplete ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!needsOrg || tenantQuery.length < 2 || selectedTenant) return
    if (tenantSearchRef.current) clearTimeout(tenantSearchRef.current)
    tenantSearchRef.current = setTimeout(async () => {
      setSearchingTenant(true)
      try {
        const res = await fetch(`${apiUrl}/tenants/search?q=${encodeURIComponent(tenantQuery)}`)
        if (res.ok) setTenantResults(await res.json())
      } catch { /* ignore */ } finally { setSearchingTenant(false) }
    }, 300)
    return () => { if (tenantSearchRef.current) clearTimeout(tenantSearchRef.current) }
  }, [tenantQuery, needsOrg, selectedTenant, apiUrl])

  // ── School autocomplete ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSchoolCounselor || schoolQuery.length < 2 || selectedSchool) return
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ q: schoolQuery, limit: '8' })
        if (state) params.set('state', state)
        const res = await fetch(`${apiUrl}/schools?${params}`)
        if (res.ok) setSchoolResults(await res.json())
      } catch { /* ignore */ } finally { setSearching(false) }
    }, 300)
    return () => { if (searchRef.current) clearTimeout(searchRef.current) }
  }, [schoolQuery, state, isSchoolCounselor, selectedSchool, apiUrl])

  // ── College autocomplete (step 3) ───────────────────────────────────────────
  useEffect(() => {
    if (step !== 3 || collegeQuery.length < 2) {
      setCollegeResults([])
      return
    }
    if (collegeSearchRef.current) clearTimeout(collegeSearchRef.current)
    collegeSearchRef.current = setTimeout(async () => {
      setSearchingCollege(true)
      try {
        const res = await fetch(`${apiUrl}/college-lookup?name=${encodeURIComponent(collegeQuery)}`)
        if (res.ok) {
          const json = await res.json()
          const data: College[] = json.results ?? json
          setCollegeResults(data.filter((c) => !selectedColleges.find((s) => s.id === c.id)))
        }
      } catch { /* ignore */ } finally { setSearchingCollege(false) }
    }, 300)
    return () => { if (collegeSearchRef.current) clearTimeout(collegeSearchRef.current) }
  }, [collegeQuery, step, selectedColleges, apiUrl])

  // ── Step 1 → 2 (role confirmed) ────────────────────────────────────────────
  const handleRoleNext = () => {
    setError('')
    if (!accountType) { setError('Please select your role.'); return }
    if (isSchoolCounselor && !selectedSchool && !freeTextSchool.trim()) {
      setError('Please select or enter your school name.'); return
    }
    if (needsOrg && !selectedTenant) {
      setError('Please select your practice from the list.'); return
    }
    if (isStudent) {
      setStep(2)
    } else {
      handleSaveData()
    }
  }

  // ── Step 2 → 3 ─────────────────────────────────────────────────────────────
  const handleProfileNext = () => {
    setError('')
    setStep(3)
  }

  // ── Save account data, then advance to step 4 ─────────────────────────────
  const handleSaveData = async () => {
    setSubmitting(true)
    setError('')
    try {
      const token = await getToken()
      if (!clerkUser) throw new Error('Not signed in')

      const backendAccountType = isCounselor ? 'counselor' : accountType === 'parent' ? 'parent' : 'student'
      const counselorType = isSchoolCounselor ? 'school_counselor'
        : accountType === 'iec' ? 'iec'
        : accountType === 'admissions_coach' ? 'admissions_coach'
        : undefined

      const body: Record<string, unknown> = {
        clerk_user_id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        full_name: clerkUser.fullName || clerkUser.firstName || '',
        account_type: backendAccountType,
        ...(selectedTenant?.id != null
        ? { tenant_id: selectedTenant.id, organization: selectedTenant.display_name }
        : selectedTenant?.id === null
        ? { organization: selectedTenant.display_name }   // new practice — backend will create tenant
        : {}),
      }
      if (counselorType) body.counselor_type = counselorType
      if (selectedSchool) {
        body.school_ncessch = selectedSchool.ncessch
        body.organization = selectedSchool.name
      } else if (freeTextSchool.trim()) {
        body.organization = freeTextSchool.trim()
      }

      const syncRes = await fetch(`${apiUrl}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

      // For students: save profile + college wishlist if provided
      if (isStudent && syncRes.ok) {
        const syncData = await syncRes.json()
        const userId = syncData.user_id

        if (userId) {
          // Build profile payload from whatever was filled in
          const profile: Record<string, unknown> = {}
          if (gradYear)        profile.graduation_year  = parseInt(gradYear)
          if (homeState)       profile.home_state        = homeState
          if (gpaWeighted)     profile.gpa_weighted      = parseFloat(gpaWeighted)
          if (satTotal)        profile.sat_total         = parseInt(satTotal)
          if (actComposite)    profile.act_composite     = parseInt(actComposite)
          if (intendedMajors)  profile.intended_majors   = intendedMajors

          if (Object.keys(profile).length > 0) {
            await fetch(`${apiUrl}/profile/${userId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(profile),
            })
          }

          // Add colleges to research list
          for (const college of selectedColleges) {
            await fetch(`${apiUrl}/lists/${userId}/colleges`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                college_name: college.name,
                in_mcp_db: true,
                ...(college.website ? { website: college.website } : {}),
              }),
            }).catch(() => { /* non-fatal */ })
          }
        }
      }

      // Advance to "Make the most of Soar" cards
      setStep(4)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Invite family submit (step 5) ──────────────────────────────────────────
  const handleInviteSubmit = async () => {
    setInvError('')
    if (!invStudentName.trim()) { setInvError('Student name is required.'); return }
    if (!invStudentEmail.trim()) { setInvError('Student email is required.'); return }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(invStudentEmail.trim())) { setInvError('Please enter a valid email address.'); return }
    if (invParentEmail.trim() && !re.test(invParentEmail.trim())) { setInvError('Please enter a valid parent email.'); return }
    if (invParentEmail.trim() && !invParentName.trim()) { setInvError('Parent name is required when email is provided.'); return }

    setInvSubmitting(true)
    try {
      const token = await getToken()
      const parents = invParentName.trim() && invParentEmail.trim()
        ? [{ full_name: invParentName.trim(), email: invParentEmail.trim() }]
        : []

      const res = await fetch(`${apiUrl}/counselors/me/families`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: { full_name: invStudentName.trim(), email: invStudentEmail.trim() },
          parents,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        if (d.detail === 'COUNSELOR_AT_CAPACITY') {
          throw new Error("You've reached your student limit. You can add students later from your dashboard.")
        }
        throw new Error(d.detail || 'Something went wrong.')
      }

      const data = await res.json()
      setInvitedStudentId(data.student.id)
      setInvitedStudentName(invStudentName.trim())
      setStep(6)
    } catch (e: unknown) {
      setInvError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setInvSubmitting(false)
    }
  }

  // ── Start chat with selected question (step 6) ────────────────────────────
  const handleStartChat = (question: string) => {
    if (!question.trim()) return
    sessionStorage.setItem('onboarding_first_question', question.trim())

    // If counselor invited a student, auto-select them in chat
    if (invitedStudentId) {
      sessionStorage.setItem('onboarding_for_student_id', String(invitedStudentId))
    }

    // If the user arrived via an invite link before signing up, process it now
    const pendingInviteCode = sessionStorage.getItem('pending_invite_code')
    if (pendingInviteCode) {
      sessionStorage.removeItem('pending_invite_code')
      router.push(`/join?code=${pendingInviteCode}`)
    } else {
      router.push('/chat')
    }
  }

  // ── Generate starter questions based on role and collected data ────────────
  const getStarterQuestions = (): string[] => {
    if (isStudent) {
      const hasColleges = selectedColleges.length > 0
      const hasMajor = intendedMajors.trim() && !intendedMajors.toLowerCase().includes('help me figure')
      const hasProfile = !!(gradYear || homeState || gpaWeighted || satTotal || actComposite)

      if (hasProfile && hasColleges) {
        const college = selectedColleges[0].name
        const qs = [
          `What can you tell me about ${college}?`,
          `Am I a good fit for ${college}? What are my chances?`,
          'What other schools should I look at based on my profile?',
        ]
        if (hasMajor) qs.push(`I'm interested in ${intendedMajors} — what should I know about that field?`)
        qs.push('Help me start thinking about my college essay')
        return qs
      }

      if (hasProfile) {
        const qs = ['What colleges should I be looking at with my GPA and scores?']
        if (hasMajor) qs.push(`I'm interested in ${intendedMajors} — what schools are strong in that?`)
        qs.push(
          "What's the difference between Early Decision and Early Action?",
          'Help me figure out what I want in a college',
        )
        if (!hasMajor) qs.push("I don't know what I want to study — can you help me explore?")
        return qs
      }

      return [
        "I'm just starting my college search — where do I begin?",
        'How do I figure out what I want to study?',
        'What are the different types of colleges?',
        'Help me understand financial aid and scholarships',
      ]
    }

    if (isCounselor) {
      if (invitedStudentName) {
        return [
          `What can you tell me about ${invitedStudentName}'s profile so far?`,
          `What colleges might be a good fit for ${invitedStudentName}?`,
          `Help me prepare for my first meeting with ${invitedStudentName}`,
          `What should I research before my next session with ${invitedStudentName}?`,
        ]
      }
      return [
        'Tell me about a college — I want to see what you know',
        'How can I use Soar most effectively with my students?',
        'Walk me through how the student research flow works',
      ]
    }

    // Parent
    return [
      'How does financial aid work?',
      "What's the difference between need-based and merit-based aid?",
      'How can I support my student without adding stress?',
      'What questions should I be asking about colleges?',
    ]
  }

  // ── Get role key for card content ──────────────────────────────────────────
  const roleKey = isCounselor ? 'counselor' : isParent ? 'parent' : 'student'
  const soarContent = SOAR_CARDS[roleKey]

  // ── Migration linking screen ─────────────────────────────────────────────────
  if (migrationLinking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400 text-sm">Linking your account…</p>
      </main>
    )
  }

  // ── Header text varies by step ──────────────────────────────────────────────
  const headerTitle = step <= 3 ? 'Welcome to Soar'
    : step === 4 ? 'Make the most of Soar'
    : step === 5 ? 'Invite your first student'
    : 'What would you like to explore first?'

  const headerSubtitle = step === 1 ? 'Tell us a bit about yourself so we can personalize your experience.'
    : step === 2 ? 'Give us a little info so we can help you better — no worries if you\'re not sure yet.'
    : step === 3 ? 'Any colleges already on your radar? We\'ll add them to your research list.'
    : step === 4 ? soarContent.tagline
    : step === 5 ? 'Add a student so you can start researching together. You can always do this later from your dashboard.'
    : 'Pick a question to get started, or type your own.'

  // ── Shared card wrapper ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
              <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{headerTitle}</h1>
          <p className="text-slate-400 text-sm">{headerSubtitle}</p>
        </div>

        {/* ── STEP 1: Role picker ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">I am a…</p>
              <div className="flex flex-col gap-2">
                {ACCOUNT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setAccountType(t.value)
                      setSelectedSchool(null)
                      setSchoolQuery('')
                      setShowFreeText(false)
                      setSelectedTenant(null)
                      setTenantQuery('')
                      setError('')
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      accountType === t.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <p className={`text-sm font-medium ${accountType === t.value ? 'text-indigo-700' : 'text-gray-800'}`}>{t.label}</p>
                      <p className="text-xs text-gray-400">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* School counselor: state + school lookup */}
            {isSchoolCounselor && (
              <div className="mb-6 border-t border-gray-100 pt-5">
                <p className="text-sm font-semibold text-gray-700 mb-3">Your school</p>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                  <select
                    value={state}
                    onChange={(e) => { setState(e.target.value); setSelectedSchool(null); setSchoolQuery(''); setSchoolResults([]) }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">— Select state —</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {!showFreeText ? (
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-500 mb-1">School name</label>
                    {selectedSchool ? (
                      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-indigo-800">{selectedSchool.name}</p>
                          <p className="text-xs text-indigo-500">{selectedSchool.city}, {selectedSchool.state}</p>
                        </div>
                        <button onClick={() => { setSelectedSchool(null); setSchoolQuery('') }} className="text-xs text-indigo-400 hover:text-indigo-600">Change</button>
                      </div>
                    ) : (
                      <>
                        <input
                          value={schoolQuery}
                          onChange={(e) => setSchoolQuery(e.target.value)}
                          placeholder={state ? `Search schools in ${state}…` : 'Search by school name…'}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                        />
                        {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
                        {schoolResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                            {schoolResults.map((s) => (
                              <button
                                key={s.ncessch}
                                onClick={() => { setSelectedSchool(s); setSchoolResults([]); setSchoolQuery('') }}
                                className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                              >
                                <p className="text-sm font-medium text-gray-800">{s.name}</p>
                                <p className="text-xs text-gray-400">{s.district} · {s.city}, {s.state}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    <button onClick={() => setShowFreeText(true)} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 underline">
                      Can&apos;t find your school? Enter it manually
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">School name</label>
                    <input
                      value={freeTextSchool}
                      onChange={(e) => setFreeTextSchool(e.target.value)}
                      placeholder="Enter your school name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    />
                    <button onClick={() => setShowFreeText(false)} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 underline">
                      Search the database instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* IEC / coach: practice autocomplete */}
            {needsOrg && (
              <div className="mb-6 border-t border-gray-100 pt-5">
                <p className="text-sm font-semibold text-gray-700 mb-3">Your practice</p>
                {selectedTenant ? (
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-indigo-800">{selectedTenant.display_name}</p>
                      {selectedTenant.id === null && (
                        <p className="text-xs text-indigo-400">New practice — will be created on sign-up</p>
                      )}
                    </div>
                    <button onClick={() => { setSelectedTenant(null); setTenantQuery(''); setTenantResults([]) }} className="text-xs text-indigo-400 hover:text-indigo-600">Change</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      value={tenantQuery}
                      onChange={(e) => { setTenantQuery(e.target.value); setTenantResults([]) }}
                      placeholder="Search for your practice…"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    />
                    {searchingTenant && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
                    {(tenantResults.length > 0 || tenantQuery.length >= 2) && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {tenantResults.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => { setSelectedTenant(t); setTenantResults([]); setTenantQuery('') }}
                            className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                          >
                            <p className="text-sm font-medium text-gray-800">{t.display_name}</p>
                          </button>
                        ))}
                        {!searchingTenant && tenantQuery.length >= 2 && (
                          <button
                            onClick={() => { setSelectedTenant({ id: null, display_name: tenantQuery.trim() }); setTenantResults([]); setTenantQuery('') }}
                            className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 text-indigo-600"
                          >
                            <p className="text-sm font-medium">➕ Add &ldquo;{tenantQuery.trim()}&rdquo; as a new practice</p>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

            <button
              onClick={handleRoleNext}
              disabled={submitting || !accountType}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm disabled:cursor-not-allowed"
            >
              {submitting ? 'Setting up your account…' : 'Next →'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              You can update this any time from your profile.
            </p>
          </div>
        )}

        {/* ── STEP 2: Student profile ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <StepDots step={2} />

            <div className="mb-1">
              <h2 className="text-base font-bold text-gray-800">A little about you</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                No worries if you don&apos;t know everything yet — you can skip anything and we&apos;ll help you figure it out.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {/* Graduation year */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Graduation year</label>
                <select
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option value="">— Select year —</option>
                  {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Home state */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Home state</label>
                <select
                  value={homeState}
                  onChange={(e) => setHomeState(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option value="">— Select state —</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* GPA */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Weighted GPA <span className="font-normal text-gray-400">(0.0 – 5.0)</span></label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.01"
                  value={gpaWeighted}
                  onChange={(e) => setGpaWeighted(e.target.value)}
                  placeholder="e.g. 3.85"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Test scores side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SAT Total <span className="font-normal text-gray-400">(400 – 1600)</span></label>
                  <input
                    type="number"
                    min="400"
                    max="1600"
                    step="10"
                    value={satTotal}
                    onChange={(e) => setSatTotal(e.target.value)}
                    placeholder="e.g. 1320"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ACT Composite <span className="font-normal text-gray-400">(1 – 36)</span></label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    step="1"
                    value={actComposite}
                    onChange={(e) => setActComposite(e.target.value)}
                    placeholder="e.g. 29"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Intended major */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Intended major(s) <span className="font-normal text-gray-400">— or areas of interest</span></label>
                <input
                  value={intendedMajors}
                  onChange={(e) => setIntendedMajors(e.target.value)}
                  placeholder="e.g. Computer Science, Pre-Med, Business…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                <button
                  onClick={() => setIntendedMajors("I'd like Soar to help me figure this out")}
                  className="mt-1.5 text-xs text-indigo-500 hover:text-indigo-700"
                >
                  I don&apos;t know yet — I&apos;d like Soar to help me figure this out
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs mt-4">{error}</p>}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleProfileNext}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                Next →
              </button>
            </div>
            <div className="text-center mt-3">
              <button
                onClick={handleProfileNext}
                className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
              >
                Skip this step
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: College wishlist ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <StepDots step={3} />

            <div className="mb-1">
              <h2 className="text-base font-bold text-gray-800">Any colleges on your list?</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Start typing a name and we&apos;ll find it. Totally fine to skip — Soar can help you build your list.
              </p>
            </div>

            {/* College search */}
            <div className="mt-5 relative">
              <input
                value={collegeQuery}
                onChange={(e) => { setCollegeQuery(e.target.value); setCollegeResults([]) }}
                placeholder="Type a college name, e.g. &quot;michigan&quot;, &quot;yale&quot;, &quot;berkeley&quot;…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
              {searchingCollege && <p className="text-xs text-gray-400 mt-1">Searching…</p>}

              {/* Dropdown results */}
              {collegeResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {collegeResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedColleges((prev) => [...prev, c])
                        setCollegeQuery('')
                        setCollegeResults([])
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.city}, {c.state_code}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected college chips */}
            {selectedColleges.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedColleges.map((c) => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full"
                  >
                    {c.name}
                    <button
                      onClick={() => setSelectedColleges((prev) => prev.filter((s) => s.id !== c.id))}
                      className="text-indigo-400 hover:text-indigo-700 leading-none"
                      aria-label={`Remove ${c.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {selectedColleges.length === 0 && (
              <p className="mt-3 text-xs text-gray-400 italic">
                No colleges added yet — that&apos;s totally okay! Soar can help you build your list from scratch.
              </p>
            )}

            {error && <p className="text-red-500 text-xs mt-4">{error}</p>}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleSaveData}
                disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm disabled:cursor-not-allowed"
              >
                {submitting ? 'Setting up your account…' : 'Next →'}
              </button>
            </div>

            {!submitting && (
              <div className="text-center mt-3">
                <button
                  onClick={handleSaveData}
                  className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
                >
                  Skip — Soar can help me build my list
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Make the most of Soar ───────────────────────────────── */}
        {step === 4 && (
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {soarContent.cards.map((card, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                >
                  <span className="text-2xl block mb-2">{card.emoji}</span>
                  <p className="text-sm font-semibold text-gray-800 mb-1">{card.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(isCounselor ? 5 : 6)}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── STEP 5: Invite a family (counselors only) ───────────────────── */}
        {step === 5 && isCounselor && (
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            {invError && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{invError}</div>
            )}

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Student</label>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  value={invStudentName}
                  onChange={(e) => setInvStudentName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={invStudentEmail}
                  onChange={(e) => setInvStudentEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Parent / Guardian <span className="font-normal normal-case">(optional)</span>
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  value={invParentName}
                  onChange={(e) => setInvParentName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={invParentEmail}
                  onChange={(e) => setInvParentEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleInviteSubmit}
              disabled={invSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm disabled:cursor-not-allowed"
            >
              {invSubmitting ? 'Adding…' : 'Add student & continue →'}
            </button>

            <div className="text-center mt-3">
              <button
                onClick={() => setStep(6)}
                className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
              >
                Skip for now — I&apos;ll do this from my dashboard
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: Question picker ─────────────────────────────────────── */}
        {step === 6 && (
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col gap-2 mb-4">
              {getStarterQuestions().map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleStartChat(q)}
                  className="text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-sm text-gray-700"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-2">Or type your own question…</p>
              <div className="flex gap-2">
                <input
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && customQuestion.trim()) handleStartChat(customQuestion) }}
                  placeholder="Ask anything…"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                <button
                  onClick={() => handleStartChat(customQuestion)}
                  disabled={!customQuestion.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-medium rounded-lg text-sm transition-colors disabled:cursor-not-allowed"
                >
                  Go →
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
