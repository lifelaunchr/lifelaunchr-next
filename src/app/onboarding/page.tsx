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

interface School {
  ncessch: string
  name: string
  district: string
  city: string
  state: string
}

export default function OnboardingPage() {
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const [accountType, setAccountType] = useState<string>('')
  const [state, setState] = useState('')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [schoolResults, setSchoolResults] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [orgName, setOrgName] = useState('')
  const [freeTextSchool, setFreeTextSchool] = useState('')
  const [showFreeText, setShowFreeText] = useState(false)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isCounselor = ['school_counselor', 'iec', 'admissions_coach'].includes(accountType)
  const isSchoolCounselor = accountType === 'school_counselor'
  const needsOrg = accountType === 'iec' || accountType === 'admissions_coach'

  // Debounced school autocomplete
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

  const handleSubmit = async () => {
    if (!accountType) { setError('Please select your role.'); return }
    if (isSchoolCounselor && !selectedSchool && !freeTextSchool.trim()) {
      setError('Please select or enter your school name.'); return
    }
    if (needsOrg && !orgName.trim()) {
      setError('Please enter your practice or company name.'); return
    }

    setSubmitting(true)
    setError('')
    try {
      const token = await getToken()
      if (!clerkUser) throw new Error('Not signed in')

      // Map account type to backend values
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
      }
      if (counselorType) body.counselor_type = counselorType
      if (selectedSchool) {
        body.school_ncessch = selectedSchool.ncessch
        body.organization = selectedSchool.name
      } else if (freeTextSchool.trim()) {
        body.organization = freeTextSchool.trim()
      }
      if (needsOrg && orgName.trim()) {
        body.organization = orgName.trim()
      }

      await fetch(`${apiUrl}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

      router.push('/chat')
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-white mb-1">Welcome to Soar</h1>
          <p className="text-slate-400 text-sm">Tell us a bit about yourself so we can personalize your experience.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {/* Role selector */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">I am a…</p>
            <div className="flex flex-col gap-2">
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setAccountType(t.value); setSelectedSchool(null); setSchoolQuery(''); setOrgName(''); setShowFreeText(false) }}
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

              {/* State picker first (narrows search results) */}
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

              {/* School name autocomplete */}
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
                  <button
                    onClick={() => setShowFreeText(true)}
                    className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 underline"
                  >
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
                  <button
                    onClick={() => setShowFreeText(false)}
                    className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 underline"
                  >
                    Search the database instead
                  </button>
                </div>
              )}
            </div>
          )}

          {/* IEC / coach: practice name */}
          {needsOrg && (
            <div className="mb-6 border-t border-gray-100 pt-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Practice or company name</label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Smith College Consulting"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || !accountType}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm disabled:cursor-not-allowed"
          >
            {submitting ? 'Setting up your account…' : 'Get started →'}
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            You can update this any time from your profile.
          </p>
        </div>
      </div>
    </div>
  )
}
