'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UsageData {
  account_type?: string
  writing_self_discovery_module?: boolean
  writing_practice_module?: boolean
}

interface Course {
  id: number
  key: string
  title: string
  description: string | null
  sort_order: number
  enrolled: boolean
  assignments: Assignment[]
}

interface Assignment {
  id: number
  sort_order: number
  title: string
  description: string | null
  word_count_min: number | null
  word_count_max: number | null
}

interface AssessmentResult {
  domains: Record<string, DomainResult>
  facets: Record<string, FacetResult>
  norms_used: string
}

interface DomainResult {
  name: string
  raw: number
  t_score: number
  percentile: number
}

interface FacetResult {
  name: string
  domain: string
  raw: number
  t_score: number
  percentile: number
}

// ── API base ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'

// ── Domain descriptions ────────────────────────────────────────────────────────

const DOMAIN_DESCRIPTIONS: Record<string, { emoji: string; high: string; low: string }> = {
  N: { emoji: '🌊', high: 'You tend to experience emotions strongly and may feel stress or worry more acutely. This sensitivity can fuel deep empathy and creative expression.', low: 'You remain calm under pressure and tend not to dwell on negative emotions. Stressful situations are less likely to destabilize you.' },
  E: { emoji: '🌟', high: 'You draw energy from people and social situations. You are outgoing, enthusiastic, and comfortable in the spotlight.', low: 'You prefer quieter environments and recharge through solitude. You may be thoughtful and deliberate rather than impulsive.' },
  O: { emoji: '🔭', high: 'You are imaginative, curious, and open to new ideas and experiences. You enjoy exploring abstract concepts and unconventional perspectives.', low: 'You prefer the tried-and-true. Concrete, practical approaches resonate more than abstract theories.' },
  A: { emoji: '🤝', high: 'You are warm, cooperative, and considerate of others. Trust and collaboration come naturally to you.', low: 'You are direct, skeptical, and comfortable with competition. You may prioritize logic over social harmony.' },
  C: { emoji: '🎯', high: 'You are organized, disciplined, and goal-oriented. You plan ahead and follow through on commitments.', low: 'You are flexible and spontaneous. You may prefer to keep options open rather than following rigid schedules.' },
}

const DOMAIN_NAMES: Record<string, string> = {
  N: 'Neuroticism',
  E: 'Extraversion',
  O: 'Openness',
  A: 'Agreeableness',
  C: 'Conscientiousness',
}

// ── Percentile bar ─────────────────────────────────────────────────────────────

function PercentileBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-700 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-12 text-right">{value}th %ile</span>
    </div>
  )
}

// ── Assessment results display ─────────────────────────────────────────────────

function AssessmentResults({ result }: { result: AssessmentResult }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const domainColors: Record<string, string> = {
    N: 'bg-purple-500',
    E: 'bg-yellow-500',
    O: 'bg-blue-500',
    A: 'bg-green-500',
    C: 'bg-orange-500',
  }

  const facetsByDomain = Object.entries(result.facets).reduce<Record<string, [string, FacetResult][]>>(
    (acc, [key, facet]) => {
      if (!acc[facet.domain]) acc[facet.domain] = []
      acc[facet.domain].push([key, facet])
      return acc
    },
    {}
  )

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <p className="text-xs text-slate-500 mb-4">
          Norm group: {result.norms_used} · Big Five (IPIP-NEO 120 · Prof. John Johnson, Penn State DuBois · Public Domain)
        </p>
        <div className="space-y-5">
          {Object.entries(result.domains).map(([key, domain]) => {
            const desc = DOMAIN_DESCRIPTIONS[key]
            const isExpanded = expanded === key
            return (
              <div key={key} className="space-y-2">
                <button
                  className="w-full text-left"
                  onClick={() => setExpanded(isExpanded ? null : key)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{desc?.emoji}</span>
                      <span className="text-sm font-semibold text-white">{domain.name}</span>
                      <span className="text-xs text-slate-500">T={domain.t_score}</span>
                    </div>
                    <span className="text-xs text-slate-400">{isExpanded ? '▲ hide' : '▼ facets'}</span>
                  </div>
                  <PercentileBar value={domain.percentile} color={domainColors[key] || 'bg-slate-500'} />
                </button>

                {/* Domain description */}
                <p className="text-xs text-slate-400 pl-6">
                  {domain.percentile >= 50 ? desc?.high : desc?.low}
                </p>

                {/* Facets */}
                {isExpanded && facetsByDomain[key] && (
                  <div className="mt-3 pl-6 space-y-2 border-l border-slate-700">
                    {facetsByDomain[key].map(([fkey, facet]) => (
                      <div key={fkey}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-300">{facet.name}</span>
                          <span className="text-xs text-slate-500">T={facet.t_score}</span>
                        </div>
                        <PercentileBar value={facet.percentile} color="bg-slate-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center">
        Results reflect your personality traits — not judgments. Every profile supports meaningful college essays.
      </p>
    </div>
  )
}

// ── Personality assessment form ────────────────────────────────────────────────

const LIKERT = [
  { value: 1, label: 'Very Inaccurate' },
  { value: 2, label: 'Moderately Inaccurate' },
  { value: 3, label: 'Neither' },
  { value: 4, label: 'Moderately Accurate' },
  { value: 5, label: 'Very Accurate' },
]

interface IpipQuestion {
  number: number
  text: string
  reverse: boolean
}

function PersonalityAssessmentForm({
  token,
  studentId,
  onComplete,
}: {
  token: string
  studentId?: string | null
  onComplete: (result: AssessmentResult) => void
}) {
  const [questions, setQuestions] = useState<IpipQuestion[]>([])
  const [responses, setResponses] = useState<Record<number, number>>({})
  const [sex, setSex] = useState<'M' | 'F'>('M')
  const [age, setAge] = useState<string>('17')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

  const PAGE_SIZE = 20

  useEffect(() => {
    fetch(`${API}/writing/questions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setQuestions(data.questions || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load questions. Please refresh and try again.')
        setLoading(false)
      })
  }, [token])

  const totalPages = Math.ceil(questions.length / PAGE_SIZE)
  const pageQuestions = questions.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const answeredOnPage = pageQuestions.filter(q => responses[q.number] !== undefined).length
  const pageComplete = answeredOnPage === pageQuestions.length
  const totalAnswered = Object.keys(responses).length
  const allAnswered = questions.length > 0 && totalAnswered === questions.length

  function setResponse(num: number, val: number) {
    setResponses(prev => ({ ...prev, [num]: val }))
  }

  async function handleSubmit() {
    if (!allAnswered) return
    setSubmitting(true)
    setError(null)
    try {
      const url = studentId
        ? `${API}/writing/personality-assessment?student_id=${studentId}`
        : `${API}/writing/personality-assessment`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responses, sex, age: parseInt(age) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Submission failed')
      }
      const data = await res.json()
      onComplete(data.result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading questions…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Demographics — only on first page */}
      {currentPage === 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">About You</h3>
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Sex (for norms)</label>
              <div className="flex gap-2">
                {[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSex(opt.value as 'M' | 'F')}
                    className={`px-4 py-1.5 rounded-lg text-sm border transition-all ${
                      sex === opt.value
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Age</label>
              <input
                type="number"
                min={13}
                max={99}
                value={age}
                onChange={e => setAge(e.target.value)}
                className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white text-center"
              />
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Page {currentPage + 1} of {totalPages} · {totalAnswered}/{questions.length} answered
        </span>
        <div className="w-40 bg-slate-700 rounded-full h-1.5">
          <div
            className="bg-violet-500 h-1.5 rounded-full transition-all"
            style={{ width: `${(totalAnswered / Math.max(questions.length, 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Instructions */}
      {currentPage === 0 && (
        <p className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-3">
          Rate how accurately each statement describes you. There are no right or wrong answers — answer honestly based on how you actually are, not how you wish you were.
        </p>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {pageQuestions.map(q => (
          <div key={q.number} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <p className="text-sm text-white mb-3">
              <span className="text-slate-500 text-xs mr-2">#{q.number}</span>
              {q.text}
            </p>
            <div className="flex flex-wrap gap-2">
              {LIKERT.map(opt => {
                const selected = responses[q.number] === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setResponse(q.number, opt.value)}
                    className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg text-xs border transition-all ${
                      selected
                        ? 'bg-violet-600 border-violet-500 text-white font-medium'
                        : 'border-slate-600 text-slate-400 hover:border-violet-500/50 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="px-4 py-2 rounded-lg text-sm border border-slate-600 text-slate-400 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        {currentPage < totalPages - 1 ? (
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={!pageComplete}
            className="px-4 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="px-6 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {submitting ? 'Scoring…' : 'Submit Assessment'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Self-Discovery tab ─────────────────────────────────────────────────────────

function SelfDiscoveryTab({
  token,
  studentId,
  courses,
}: {
  token: string
  studentId?: string | null
  courses: Course[]
}) {
  const [existingResult, setExistingResult] = useState<AssessmentResult | null>(null)
  const [resultLoaded, setResultLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [result, setResult] = useState<AssessmentResult | null>(null)

  useEffect(() => {
    const url = studentId
      ? `${API}/writing/personality-assessment?student_id=${studentId}`
      : `${API}/writing/personality-assessment`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.result) setExistingResult(data.result)
        setResultLoaded(true)
      })
      .catch(() => setResultLoaded(true))
  }, [token, studentId])

  const sdCourse = courses.find(c => c.key === 'self_discovery')

  if (!resultLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayResult = result || existingResult

  return (
    <div className="space-y-6">
      {/* Assessment card */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-base font-semibold text-white">Personality Assessment</h3>
            <p className="text-xs text-slate-400 mt-1">
              120-item Big Five inventory that reveals your natural strengths — the raw material for authentic college essays.
            </p>
          </div>
          {displayResult && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-xs text-violet-400 hover:text-violet-300 whitespace-nowrap"
            >
              {showForm ? 'Hide form' : 'Retake'}
            </button>
          )}
        </div>

        {(!displayResult || showForm) ? (
          <PersonalityAssessmentForm
            token={token}
            studentId={studentId}
            onComplete={r => {
              setResult(r)
              setShowForm(false)
            }}
          />
        ) : (
          <AssessmentResults result={displayResult} />
        )}
      </div>

      {/* Writing assignments */}
      {sdCourse && sdCourse.assignments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Writing Assignments</h3>
          {sdCourse.assignments.map(a => (
            <Link
              key={a.id}
              href={`/writing/assignment/${a.id}${studentId ? `?for=${studentId}` : ''}`}
              className="block bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-violet-500/40 hover:bg-slate-800 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{a.title}</span>
                <span className="text-xs text-slate-500">
                  {a.word_count_min && a.word_count_max
                    ? `${a.word_count_min}–${a.word_count_max} words`
                    : a.word_count_max
                    ? `Up to ${a.word_count_max} words`
                    : ''}
                </span>
              </div>
              {a.description && (
                <p className="text-xs text-slate-400 mt-1">{a.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Writing Practice tab ───────────────────────────────────────────────────────

function WritingPracticeTab({
  courses,
  studentId,
}: {
  courses: Course[]
  studentId?: string | null
}) {
  const wpCourse = courses.find(c => c.key === 'writing_practice')

  if (!wpCourse) {
    return (
      <div className="text-center py-16 text-slate-500 text-sm">
        Writing Practice course not available.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-base font-semibold text-white mb-2">Writing Practice</h3>
        <p className="text-xs text-slate-400">
          Structured exercises to sharpen your voice and storytelling skills before diving into application essays.
        </p>
      </div>

      {wpCourse.assignments.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Exercises</h3>
          {wpCourse.assignments.map(a => (
            <Link
              key={a.id}
              href={`/writing/assignment/${a.id}${studentId ? `?for=${studentId}` : ''}`}
              className="block bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-violet-500/40 hover:bg-slate-800 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{a.title}</span>
                <span className="text-xs text-slate-500">
                  {a.word_count_min && a.word_count_max
                    ? `${a.word_count_min}–${a.word_count_max} words`
                    : a.word_count_max
                    ? `Up to ${a.word_count_max} words`
                    : ''}
                </span>
              </div>
              {a.description && (
                <p className="text-xs text-slate-400 mt-1">{a.description}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-sm">
          No exercises available yet.
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function WritingPageInner() {
  const { getToken, isLoaded } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  const forParam = searchParams.get('for')
  const tabParam = searchParams.get('tab') || 'self-discovery'

  const [token, setToken] = useState<string | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [activeTab, setActiveTab] = useState<'self-discovery' | 'writing-practice'>(
    tabParam === 'writing-practice' ? 'writing-practice' : 'self-discovery'
  )

  // Load token + usage
  useEffect(() => {
    if (!isLoaded) return
    getToken()
      .then(async tok => {
        if (!tok) return
        setToken(tok)
        const res = await fetch(
          `${API}/my-usage${forParam ? `?for_student_id=${forParam}` : ''}`,
          { headers: { Authorization: `Bearer ${tok}` } }
        )
        if (res.ok) setUsageData(await res.json())
      })
      .catch(() => {})
  }, [isLoaded, getToken, forParam])

  // Load courses
  useEffect(() => {
    if (!token) return
    const url = `${API}/writing/courses${forParam ? `?student_id=${forParam}` : ''}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setCourses(data.courses || [])
        setLoadingCourses(false)
      })
      .catch(() => setLoadingCourses(false))
  }, [token, forParam])

  const isCounselor = usageData?.account_type === 'counselor'
  const isParent = usageData?.account_type === 'parent'
  const showSelfDiscovery = usageData?.writing_self_discovery_module !== false
  const showWritingPractice = usageData?.writing_practice_module !== false

  const tabs = [
    ...(showSelfDiscovery ? [{ key: 'self-discovery' as const, label: '🔍 Self-Discovery' }] : []),
    ...(showWritingPractice ? [{ key: 'writing-practice' as const, label: '✍️ Writing Practice' }] : []),
  ]

  function setTab(t: 'self-discovery' | 'writing-practice') {
    setActiveTab(t)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', t)
    router.replace(`/writing?${params.toString()}`)
  }

  if (!isLoaded || !token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/chat" className="text-slate-400 hover:text-white text-sm">← Chat</Link>
          <span className="text-slate-700">|</span>
          <h1 className="text-lg font-semibold">Writing</h1>
          {(isCounselor || isParent) && forParam && (
            <span className="text-xs bg-violet-900/40 text-violet-300 px-2 py-0.5 rounded-full border border-violet-700/50 ml-auto">
              Viewing student
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tab bar */}
        {tabs.length > 1 && (
          <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 mb-6">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.key
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        {loadingCourses ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'self-discovery' && showSelfDiscovery && token && (
              <SelfDiscoveryTab token={token} studentId={forParam} courses={courses} />
            )}
            {activeTab === 'writing-practice' && showWritingPractice && (
              <WritingPracticeTab courses={courses} studentId={forParam} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function WritingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WritingPageInner />
    </Suspense>
  )
}
