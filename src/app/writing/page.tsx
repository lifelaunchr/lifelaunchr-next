'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { WritingCoachView } from '@/components/writing/WritingCoachView'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UsageData {
  account_type?: string
  writing_self_discovery_module?: boolean
  writing_practice_module?: boolean
  essays_module?: boolean
  essay_list_module?: boolean
  editate_module?: boolean
  commonapp_module?: boolean
  uc_piqs_module?: boolean
  why_essays_module?: boolean
  editate_available?: boolean
  beneficiary?: {
    user_id: number
    full_name?: string | null
    email?: string | null
  }
}

interface WritingAssignment {
  id: number
  exercise_id: number
  status: 'assigned' | 'in_progress' | 'submitted' | 'reviewed'
  note_to_student: string | null
  due_date: string | null
  college_list_id: number | null
  assigned_at: string
  exercise_title: string
  prompt_text: string | null
  framing_content: string | null
  exercise_type: string
  word_limit: number | null
  time_limit_minutes: number | null
  is_timed: boolean
  response_schema: object | null
  unit_title: string
  section_key: string
  section_title: string
  latest_revision: number | null
  last_submitted_at: string | null
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
  N: 'Emotional Sensitivity',
  E: 'Extraversion',
  O: 'Openness',
  A: 'Agreeableness',
  C: 'Conscientiousness',
}

// ── Pentagon radar chart ───────────────────────────────────────────────────────

function RadarChart({ result }: { result: AssessmentResult }) {
  const W = 400, H = 300
  const cx = 200, cy = 150
  const maxR = 100
  const labelR = 126

  // Clockwise from top
  const axes = [
    { key: 'N', lines: ['Emotional', 'Sensitivity'], color: '#a78bfa' },
    { key: 'E', lines: ['Extraversion'],              color: '#fbbf24' },
    { key: 'O', lines: ['Openness'],                  color: '#60a5fa' },
    { key: 'A', lines: ['Agreeableness'],             color: '#34d399' },
    { key: 'C', lines: ['Conscien-', 'tiousness'],    color: '#fb923c' },
  ]
  const n = axes.length
  const angleOf = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const pt = (i: number, r: number) => ({
    x: cx + r * Math.cos(angleOf(i)),
    y: cy + r * Math.sin(angleOf(i)),
  })

  // Grid rings
  const GRID = [25, 50, 75, 100]
  const gridPaths = GRID.map(pct => {
    const pts = axes.map((_, i) => pt(i, (pct / 100) * maxR))
    return {
      pct,
      d: pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z',
    }
  })

  // Data polygon
  const dataPoints = axes.map((axis, i) => {
    const pct = result.domains[axis.key]?.percentile ?? 50
    return { ...pt(i, (pct / 100) * maxR), pct }
  })
  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grid pentagons */}
      {gridPaths.map(({ pct, d }) => (
        <path key={pct} d={d} fill="none"
          stroke={pct === 100 ? '#334155' : '#1e293b'}
          strokeWidth={pct === 100 ? 1.5 : 1}
        />
      ))}

      {/* Axis lines */}
      {axes.map((_, i) => {
        const outer = pt(i, maxR)
        return <line key={i} x1={cx} y1={cy}
          x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
          stroke="#334155" strokeWidth={1}
        />
      })}

      {/* 50% reference ring tick label on top axis */}
      {(() => { const p = pt(0, maxR * 0.5); return (
        <text x={p.x + 4} y={p.y} fontSize={7} fill="#475569" dominantBaseline="middle">50</text>
      )})()}

      {/* Data polygon */}
      <path d={dataPath}
        fill="rgba(124,58,237,0.18)" stroke="#7c3aed" strokeWidth={2} strokeLinejoin="round"
      />

      {/* Colored dots */}
      {dataPoints.map((p, i) => (
        <circle key={i}
          cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
          r={5} fill={axes[i].color} stroke="#0f172a" strokeWidth={2}
        />
      ))}

      {/* Axis labels */}
      {axes.map((axis, i) => {
        const angle = angleOf(i)
        const lp = { x: cx + labelR * Math.cos(angle), y: cy + labelR * Math.sin(angle) }
        const cosA = Math.cos(angle)
        const textAnchor = Math.abs(cosA) < 0.2 ? 'middle' : cosA > 0 ? 'start' : 'end'
        const lineH = 11
        const totalH = (axis.lines.length - 1) * lineH
        return (
          <text key={i} textAnchor={textAnchor} fill="#94a3b8" fontSize={9} fontWeight="500">
            {axis.lines.map((line, j) => (
              <tspan key={j}
                x={lp.x.toFixed(1)}
                y={(lp.y - totalH / 2 + j * lineH).toFixed(1)}
                dominantBaseline="middle"
              >{line}</tspan>
            ))}
          </text>
        )
      })}
    </svg>
  )
}

// ── Essay-prep interpretation card ────────────────────────────────────────────

function InterpretationCard({
  text,
  loading,
  error,
  onRegenerate,
  title = '✨ Your Essay Profile',
  emptyLabel = 'Generate Essay Profile →',
  emptyDescription = 'Get a personalized interpretation of your results — what they say about how you work, connect, and what essay stories might emerge.',
  generatingLabel = 'Analyzing your personality profile…',
}: {
  text: string
  loading: boolean
  error: string | null
  onRegenerate?: () => void
  title?: string
  emptyLabel?: string
  emptyDescription?: string
  generatingLabel?: string
}) {
  const isEmpty = !text && !loading && !error

  return (
    <div className="bg-slate-800/50 rounded-xl border border-violet-700/30 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          {title}
        </h3>
        {!loading && !isEmpty && onRegenerate && (
          <button
            onClick={onRegenerate}
            className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
          >
            Regenerate
          </button>
        )}
      </div>

      {loading && !text && (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
          {generatingLabel}
        </div>
      )}

      {/* Empty state — auto-trigger failed; give user a manual button */}
      {isEmpty && onRegenerate && (
        <div className="py-4 space-y-3">
          <p className="text-sm text-slate-400">
            {emptyDescription}
          </p>
          <button
            onClick={onRegenerate}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-all"
          >
            {emptyLabel}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/20 border border-red-700/40 px-4 py-3 space-y-2">
          <p className="text-sm text-red-300">{error}</p>
          {onRegenerate && (
            <button onClick={onRegenerate} className="text-xs text-red-400 hover:text-red-300 underline">
              Try again
            </button>
          )}
        </div>
      )}

      {text && (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({children}) => (
              <h2 className="text-violet-300 text-[11px] font-semibold uppercase tracking-widest mt-5 mb-2 first:mt-1">
                {children}
              </h2>
            ),
            p: ({children}) => (
              <p className="text-sm text-slate-200 leading-relaxed mb-3 last:mb-0">
                {children}
              </p>
            ),
            ul: ({children}) => (
              <ul className="mb-3 pl-5 list-disc list-outside last:mb-0">
                {children}
              </ul>
            ),
            ol: ({children}) => (
              <ol className="mb-3 pl-5 list-decimal list-outside last:mb-0">
                {children}
              </ol>
            ),
            li: ({children}) => (
              <li className="text-sm text-slate-200 leading-relaxed marker:text-violet-400 mb-2.5 last:mb-0">
                {children}
              </li>
            ),
            strong: ({children}) => (
              <strong className="text-white font-semibold">
                {children}
              </strong>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      )}

      {loading && text && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
          Writing…
        </div>
      )}
    </div>
  )
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
        <p className="text-xs text-slate-500 mb-3">
          Norm group: {result.norms_used} · Big Five (IPIP-NEO 120 · Prof. John Johnson, Penn State DuBois · Public Domain)
        </p>

        {/* Pentagon radar */}
        <RadarChart result={result} />

        <div className="space-y-5 mt-4">
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
  studentName,
  onComplete,
}: {
  token: string
  studentId?: string | null
  studentName?: string | null
  onComplete: (result: AssessmentResult) => void
}) {
  // getToken() always returns a fresh Clerk JWT — never use the stored token
  // prop for API calls that happen after page load (it will have expired).
  const { getToken } = useAuth()
  const topRef = useRef<HTMLDivElement>(null)

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
    // Always get a fresh token — the prop may have expired if the user spent
    // time on the page before entering test mode or returning to the form.
    getToken()
      .then(freshToken => {
        if (!freshToken) throw new Error('Not signed in')
        return fetch(`${API}/writing/questions`, {
          headers: { Authorization: `Bearer ${freshToken}` },
        })
      })
      .then(r => r.json())
      .then(data => {
        setQuestions(data.questions || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err?.message === 'Not signed in'
          ? 'Session expired — please refresh the page.'
          : 'Failed to load questions. Please refresh and try again.')
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll to the top of the form whenever the page changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [currentPage])

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
      // Always fetch a fresh token at submit time — the stored prop may be
      // expired after the 10-20 minutes it takes to complete 120 questions.
      const freshToken = await getToken()
      if (!freshToken) throw new Error('Session expired — please refresh the page and try again.')
      const url = studentId
        ? `${API}/writing/personality-assessment?student_id=${studentId}`
        : `${API}/writing/personality-assessment`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${freshToken}`,
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

  if (error && questions.length === 0) {
    return (
      <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm flex items-center justify-between gap-4">
        <span>{error}</span>
        <button
          onClick={() => {
            setError(null)
            setLoading(true)
            getToken().then(tok => {
              if (!tok) { setError('Session expired — please refresh.'); setLoading(false); return }
              fetch(`${API}/writing/questions`, { headers: { Authorization: `Bearer ${tok}` } })
                .then(r => r.json())
                .then(data => { setQuestions(data.questions || []); setLoading(false) })
                .catch(() => { setError('Still failing — please refresh the page.'); setLoading(false) })
            })
          }}
          className="text-xs px-3 py-1.5 rounded-lg border border-red-700 text-red-300 hover:bg-red-900/50 whitespace-nowrap"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scroll anchor — scrollIntoView targets this on page change */}
      <div ref={topRef} />

      {/* Demographics — only on first page */}
      {currentPage === 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            {studentName ? `About ${studentName.split(' ')[0]}` : studentId ? 'About the Student' : 'About You'}
          </h3>
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
              {`I ${q.text.charAt(0).toLowerCase()}${q.text.slice(1)}`}
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

// ── Big Five explainer ─────────────────────────────────────────────────────────

function BigFiveExplainer() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700/30 transition-all"
      >
        <span>What does this assessment measure?</span>
        <span className="text-slate-600">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 bg-slate-800/30">
          <p className="text-xs text-slate-400 leading-relaxed">
            This is the <strong className="text-slate-300">Big Five personality assessment</strong> (IPIP-NEO 120), a public-domain research instrument developed by Prof. John Johnson at Penn State. It is one of the most scientifically validated personality measures in psychology. It measures five broad dimensions — often called OCEAN:
          </p>
          <div className="space-y-1.5">
            {[
              { key: 'O', emoji: '🔭', name: 'Openness', desc: 'Curiosity, imagination, and appreciation for new experiences and ideas.' },
              { key: 'C', emoji: '🎯', name: 'Conscientiousness', desc: 'Organization, dependability, self-discipline, and goal-directedness.' },
              { key: 'E', emoji: '🌟', name: 'Extraversion', desc: 'Sociability, assertiveness, and the tendency to draw energy from others.' },
              { key: 'A', emoji: '🤝', name: 'Agreeableness', desc: 'Warmth, cooperation, empathy, and trust in others.' },
              { key: 'N', emoji: '🌊', name: 'Emotional Sensitivity', desc: 'How strongly you experience emotions, especially stress, worry, or self-consciousness. High scorers feel things deeply; low scorers stay calm under pressure.' },
            ].map(d => (
              <div key={d.key} className="flex gap-2 text-xs">
                <span>{d.emoji}</span>
                <span><strong className="text-slate-300">{d.name}:</strong> <span className="text-slate-500">{d.desc}</span></span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Each dimension also breaks down into six <em>facets</em> (30 total) for a richer picture. Results are normed by age and sex against a large representative sample, so scores show how someone compares to peers — not whether any trait is &quot;good&quot; or &quot;bad.&quot; In the context of college essays, this helps students identify authentic stories, values, and strengths they might not have articulated before.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Self-Discovery tab ─────────────────────────────────────────────────────────

function SelfDiscoveryTab({
  token,
  studentId,
  studentName,
  isReadOnly,
  canRegenerate = true,
}: {
  token: string
  studentId?: string | null
  studentName?: string | null
  isReadOnly?: boolean
  canRegenerate?: boolean
}) {
  const { getToken } = useAuth()

  // Student assessment state
  const [existingResult, setExistingResult] = useState<AssessmentResult | null>(null)
  const [existingInterpretation, setExistingInterpretation] = useState<string | null>(null)
  const [resultLoaded, setResultLoaded] = useState(false)
  const [resultLoadError, setResultLoadError] = useState(false)
  const [showRetakeForm, setShowRetakeForm] = useState(false)
  const [result, setResult] = useState<AssessmentResult | null>(null)

  // Counselor "test mode" — take for themselves, see their own saved result
  const [testMode, setTestMode] = useState(false)
  const [testResult, setTestResult] = useState<AssessmentResult | null>(null)
  const [myOwnResult, setMyOwnResult] = useState<AssessmentResult | null>(null)
  const [myOwnInterpretation, setMyOwnInterpretation] = useState<string | null>(null)

  // Interpretation streaming state
  const [interpretation, setInterpretation] = useState<string | null>(null)
  const [interpretingLoading, setInterpretingLoading] = useState(false)
  const [interpretingError, setInterpretingError] = useState<string | null>(null)
  const [myOwnInterpretationLoading, setMyOwnInterpretationLoading] = useState(false)

  // ── Load student (or own) assessment on mount ─────────────────────────────
  useEffect(() => {
    const url = studentId
      ? `${API}/writing/personality-assessment?student_id=${studentId}`
      : `${API}/writing/personality-assessment`
    // Always get a fresh token — the prop may be stale if Clerk has refreshed
    // in the background since the parent first fetched it.
    getToken()
      .then(freshToken => {
        if (!freshToken) throw new Error('not signed in')
        return fetch(url, { headers: { Authorization: `Bearer ${freshToken}` } })
      })
      .then(async r => {
        if (r.status === 404) {
          // No assessment on file — expected for new students
          setResultLoaded(true)
          return
        }
        if (!r.ok) {
          // Server/network error — surface it so user can retry
          throw new Error(`server error ${r.status}`)
        }
        const data = await r.json()
        if (data?.result) {
          setExistingResult(data.result)
          if (data.interpretation) {
            // Cached — set directly, no need to generate
            setInterpretation(data.interpretation)
          } else {
            // No cached interpretation yet — generate now
            fetchInterpretation(studentId)
          }
        }
        setResultLoaded(true)
      })
      .catch(() => {
        // Network/server error — show retry rather than silently showing the
        // "no data" state, which misleads users into thinking they need to
        // retake the assessment.
        setResultLoaded(true)
        setResultLoadError(true)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  // ── If counselor, also eagerly load their OWN assessment ─────────────────
  useEffect(() => {
    if (!isReadOnly) return
    getToken().then(freshToken => {
      if (!freshToken) return
      return fetch(`${API}/writing/personality-assessment`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data?.result) {
            setMyOwnResult(data.result)
            if (data.interpretation) {
              setMyOwnInterpretation(data.interpretation)
            } else {
              fetchInterpretation(null, false, true)
            }
          }
        })
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReadOnly])

  // ── Stream interpretation whenever a result becomes available ─────────────
  // forOwn=true → updates myOwnInterpretation (counselor test-mode path)
  // forOwn=false → updates interpretation (student / read-only counselor path)
  async function fetchInterpretation(forStudentId?: string | null, forceRegenerate = false, forOwn = false) {
    const _setLoading = forOwn ? setMyOwnInterpretationLoading : setInterpretingLoading
    const _setText = forOwn ? setMyOwnInterpretation : setInterpretation
    const _setError = forOwn ? (_: string | null) => {} : setInterpretingError

    _setLoading(true)
    _setError(null)
    if (forceRegenerate) _setText(null)

    const freshToken = await getToken()
    if (!freshToken) { _setLoading(false); return }

    const url = forStudentId
      ? `${API}/writing/personality-assessment/interpret?student_id=${forStudentId}`
      : `${API}/writing/personality-assessment/interpret`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { detail?: string }).detail || 'Failed to generate interpretation')
      }
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          // Parse JSON separately so parse errors don't hide event errors
          let ev: { type: string; text?: string; msg?: string }
          try {
            ev = JSON.parse(raw)
          } catch { continue }  // skip malformed lines
          if (ev.type === 'chunk' && ev.text) _setText(prev => (prev ?? '') + ev.text)
          else if (ev.type === 'text' && ev.text) _setText(ev.text)   // cached path
          else if (ev.type === 'error') throw new Error(ev.msg ?? 'Generation failed')
        }
      }
    } catch (e) {
      _setError(e instanceof Error ? e.message : 'Failed to generate essay profile')
    } finally {
      _setLoading(false)
    }
  }

  // sdCourse removed — enrollment gated at section level now

  if (!resultLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (resultLoadError) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center space-y-3">
        <p className="text-sm text-slate-400">Couldn&apos;t load assessment data — please try again.</p>
        <button
          onClick={() => {
            setResultLoadError(false)
            setResultLoaded(false)
            getToken().then(freshToken => {
              if (!freshToken) { setResultLoaded(true); setResultLoadError(true); return }
              const url = studentId
                ? `${API}/writing/personality-assessment?student_id=${studentId}`
                : `${API}/writing/personality-assessment`
              fetch(url, { headers: { Authorization: `Bearer ${freshToken}` } })
                .then(async r => {
                  if (r.status === 404) { setResultLoaded(true); return }
                  if (!r.ok) throw new Error(`${r.status}`)
                  const data = await r.json()
                  if (data?.result) {
                    setExistingResult(data.result)
                    if (data.interpretation) setInterpretation(data.interpretation)
                    else fetchInterpretation(studentId)
                  }
                  setResultLoaded(true)
                })
                .catch(() => { setResultLoaded(true); setResultLoadError(true) })
            })
          }}
          className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all"
        >
          Retry
        </button>
      </div>
    )
  }

  const displayResult = result || existingResult
  const firstName = studentName ? studentName.split(' ')[0] : null

  // Which interpretation to show in test mode
  const testInterpretation = myOwnInterpretation

  return (
    <div className="space-y-6">
      {/* Assessment card */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Personality Assessment</h3>
            <p className="text-xs text-slate-400 mt-1">
              {isReadOnly && !testMode
                ? `See ${firstName ? `${firstName}'s` : "the student's"} Big Five personality results — the foundation for authentic college essays.`
                : testMode
                ? "You're previewing the student experience. Results save to your own profile, not the student's."
                : 'Discover your Big Five personality traits — the foundation for authentic college essays.'}
            </p>
          </div>
          {/* Retake — students only */}
          {displayResult && !isReadOnly && !showRetakeForm && (
            <button
              onClick={() => setShowRetakeForm(true)}
              className="text-xs text-violet-400 hover:text-violet-300 whitespace-nowrap shrink-0"
            >
              Retake
            </button>
          )}
        </div>

        {/* What does this measure? */}
        <BigFiveExplainer />

        {/* Content */}
        {testMode ? (
          /* Counselor test mode — shows their own saved result if available */
          (testResult || myOwnResult) ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700/40 px-2 py-0.5 rounded-full">
                  Your personal result — not {firstName ?? "the student"}&apos;s
                </span>
                <div className="flex items-center gap-3">
                  {(testResult || myOwnResult) && (
                    <button
                      onClick={() => { setTestResult(null); setMyOwnResult(null); setMyOwnInterpretation(null) }}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      Retake
                    </button>
                  )}
                  <button onClick={() => { setTestMode(false); setTestResult(null) }} className="text-xs text-slate-500 hover:text-slate-300">
                    Exit test mode
                  </button>
                </div>
              </div>
              <AssessmentResults result={(testResult || myOwnResult)!} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700/40 px-2 py-0.5 rounded-full">
                  Test mode — answers save to your profile only
                </span>
                <button onClick={() => setTestMode(false)} className="text-xs text-slate-500 hover:text-slate-300">
                  Cancel
                </button>
              </div>
              <PersonalityAssessmentForm
                token={token}
                studentId={null}
                onComplete={r => {
                  setTestResult(r)
                  setMyOwnResult(r)
                  setMyOwnInterpretation(null)
                  fetchInterpretation(null, false, true)
                }}
              />
            </div>
          )
        ) : isReadOnly ? (
          /* Counselor / parent read-only view */
          displayResult ? (
            <AssessmentResults result={displayResult} />
          ) : (
            <div className="space-y-4">
              <div className="text-center py-6 space-y-1">
                <p className="text-slate-400 text-sm">
                  {`${firstName ?? 'This student'} hasn't completed the assessment yet.`}
                </p>
                <p className="text-xs text-slate-500">
                  They can complete it by signing in and visiting the Writing page.
                </p>
              </div>
              <div className="border-t border-slate-700/50 pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">Want to see what the assessment looks like?</span>
                <button
                  onClick={() => setTestMode(true)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:border-violet-500/50 hover:text-violet-300 transition-all"
                >
                  🧪 Try it yourself
                </button>
              </div>
            </div>
          )
        ) : (
          /* Student view — form or results */
          (!displayResult || showRetakeForm) ? (
            <PersonalityAssessmentForm
              token={token}
              studentId={studentId}
              studentName={studentName}
              onComplete={r => {
                setResult(r)
                setShowRetakeForm(false)
                // Clear old interpretation and generate a fresh one
                setInterpretation(null)
                setExistingInterpretation(null)
                fetchInterpretation(studentId)
              }}
            />
          ) : (
            <AssessmentResults result={displayResult} />
          )
        )}

        {/* Test mode entry point when student has results */}
        {isReadOnly && displayResult && !testMode && (
          <div className="border-t border-slate-700/50 pt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">Want to experience the assessment yourself?</span>
            <button
              onClick={() => setTestMode(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:border-violet-500/50 hover:text-violet-300 transition-all"
            >
              🧪 Try it yourself
            </button>
          </div>
        )}
      </div>

      {/* Essay profile interpretation — shown below results for student view and counselor read-only */}
      {!testMode && displayResult && (
        <InterpretationCard
          text={interpretation ?? ''}
          loading={interpretingLoading}
          error={interpretingError}
          onRegenerate={canRegenerate ? () => fetchInterpretation(studentId, true) : undefined}
        />
      )}

      {/* Test mode interpretation — counselor's own essay profile */}
      {testMode && (testResult || myOwnResult) && (
        <InterpretationCard
          text={testInterpretation ?? ''}
          loading={myOwnInterpretationLoading}
          error={null}
          onRegenerate={() => fetchInterpretation(null, true, true)}
        />
      )}

    </div>
  )
}

// ── Unit assignment list (Units 2–4 of Self-Discovery) ─────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  assigned:    { label: 'Not started',  className: 'text-slate-500' },
  in_progress: { label: 'In progress',  className: 'text-amber-400' },
  submitted:   { label: 'Submitted',    className: 'text-violet-400' },
  reviewed:    { label: 'Reviewed ✓',   className: 'text-green-400' },
}

// Content and milestone types show different status labels
const CONTENT_STATUS: Record<string, { label: string; className: string }> = {
  assigned:    { label: 'Unread',       className: 'text-slate-500' },
  in_progress: { label: 'In progress',  className: 'text-amber-400' },
  submitted:   { label: 'Complete ✓',   className: 'text-green-400' },
  reviewed:    { label: 'Complete ✓',   className: 'text-green-400' },
}

const MILESTONE_STATUS: Record<string, { label: string; className: string }> = {
  assigned:    { label: 'Schedule',     className: 'text-blue-400' },
  in_progress: { label: 'Schedule',     className: 'text-blue-400' },
  submitted:   { label: 'Scheduled ✓', className: 'text-green-400' },
  reviewed:    { label: 'Scheduled ✓', className: 'text-green-400' },
}

function AssignmentCard({ a, studentId }: { a: WritingAssignment; studentId?: string | null }) {
  const isContent = a.exercise_type === 'content'
  const isMilestone = a.exercise_type === 'milestone'
  const badgeMap = isMilestone ? MILESTONE_STATUS : isContent ? CONTENT_STATUS : STATUS_BADGE
  const badge = badgeMap[a.status] || badgeMap.assigned

  return (
    <Link
      href={`/writing/assignment/${a.id}${studentId ? `?for=${studentId}` : ''}`}
      className={[
        'block rounded-xl border p-4 transition-all',
        isMilestone
          ? 'bg-blue-900/10 border-blue-700/30 hover:border-blue-500/50 hover:bg-blue-900/20'
          : 'bg-slate-800/50 border-slate-700/50 hover:border-violet-500/40 hover:bg-slate-800',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isMilestone && <span className="text-base leading-none flex-shrink-0">📅</span>}
          {isContent && <span className="text-base leading-none flex-shrink-0">📖</span>}
          <span className="text-sm text-white">{a.exercise_title}</span>
        </div>
        <span className={`text-xs flex-shrink-0 ${badge.className}`}>{badge.label}</span>
      </div>
      {a.note_to_student && (
        <p className="text-xs text-slate-400 mt-1 italic">"{a.note_to_student}"</p>
      )}
      {!isContent && !isMilestone && (
        <div className="flex items-center gap-3 mt-2">
          {a.word_limit && (
            <span className="text-xs text-slate-600">Up to {a.word_limit} words</span>
          )}
          {a.is_timed && a.time_limit_minutes && (
            <span className="text-xs text-slate-600">⏱ {a.time_limit_minutes} min</span>
          )}
          {a.due_date && (
            <span className="text-xs text-slate-600">Due {new Date(a.due_date).toLocaleDateString()}</span>
          )}
        </div>
      )}
    </Link>
  )
}

function UnitAssignmentList({
  sectionKey,
  unitTitle,
  label,
  assignments,
  studentId,
  isCounselor,
}: {
  sectionKey: string
  unitTitle: string
  label: string
  assignments: WritingAssignment[]
  studentId?: string | null
  isCounselor?: boolean
}) {
  const unitAssignments = assignments.filter(
    a => a.section_key === sectionKey && a.unit_title === unitTitle
  )

  if (unitAssignments.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white">{label}</h2>
        <div className="py-12 text-center bg-slate-800/30 rounded-xl border border-slate-700/30">
          {isCounselor ? (
            <p className="text-slate-500 text-sm">No exercises assigned yet.<br />
              <span className="text-slate-600 text-xs mt-1 block">Assign exercises from the exercise library.</span>
            </p>
          ) : (
            <p className="text-slate-500 text-sm">Your coach hasn&apos;t assigned any exercises here yet.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-white">{label}</h2>
      {unitAssignments.map(a => (
        <AssignmentCard key={a.id} a={a} studentId={studentId} />
      ))}
    </div>
  )
}

// ── Writing Practice tab ───────────────────────────────────────────────────────

function WritingPracticeTab({
  assignments,
  studentId,
  isCounselor,
  onAssignRequest,
}: {
  assignments: WritingAssignment[]
  studentId?: string | null
  isCounselor?: boolean
  onAssignRequest?: () => void
}) {
  const practiceAssignments = assignments.filter(a => a.section_key === 'writing_practice')

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-white">Writing Practice</h2>
      <p className="text-xs text-slate-500">
        Structured exercises to develop your voice and storytelling skills before diving into application essays.
      </p>

      {practiceAssignments.length > 0 ? (
        <div className="space-y-3">
          {practiceAssignments.map(a => (
            <AssignmentCard key={a.id} a={a} studentId={studentId} />
          ))}
          {isCounselor && onAssignRequest && (
            <button
              onClick={onAssignRequest}
              className="w-full py-2 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20 rounded-lg hover:border-violet-500/40 transition-all"
            >
              + Assign another exercise
            </button>
          )}
        </div>
      ) : (
        <div className="py-12 text-center bg-slate-800/30 rounded-xl border border-slate-700/30">
          {isCounselor && onAssignRequest ? (
            <div className="space-y-3">
              <p className="text-slate-500 text-sm">No exercises assigned yet.</p>
              <button
                onClick={onAssignRequest}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-all"
              >
                Assign Exercise
              </button>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Your coach hasn&apos;t assigned any writing practice exercises yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

interface LibraryExercise {
  id: number
  title: string
  prompt_text: string | null
  exercise_type: string
  word_limit: number | null
  time_limit_minutes: number | null
  is_timed: boolean
  unit_title: string
  section_key: string
}

function AssignPanel({
  sectionKey,
  sectionLabel,
  studentId,
  token,
  onAssigned,
  onClose,
}: {
  sectionKey: string
  sectionLabel: string
  studentId: string
  token: string
  onAssigned: () => void
  onClose: () => void
}) {
  const [exercises, setExercises] = useState<LibraryExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [assigning, setAssigning] = useState<number | null>(null)
  const [assigned, setAssigned] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch(`${API}/writing/library?section_key=${sectionKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setExercises(data.exercises || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sectionKey, token])

  const assign = async (exerciseId: number) => {
    setAssigning(exerciseId)
    try {
      const res = await fetch(`${API}/writing/assignments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: parseInt(studentId), exercise_id: exerciseId, note_to_student: note || null }),
      })
      if (res.ok) {
        setAssigned(s => { const n = new Set(s); n.add(exerciseId); return n })
        onAssigned()
      }
    } finally {
      setAssigning(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-800 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h3 className="text-sm font-semibold text-white">Assign Exercise</h3>
            <p className="text-xs text-slate-400 mt-0.5">{sectionLabel}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Optional note */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Note to student (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Add context or specific instructions…"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : exercises.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No exercises available for this section yet.</p>
          ) : (
            <div className="space-y-2">
              {exercises.map(ex => {
                const isAssigned = assigned.has(ex.id)
                return (
                  <div key={ex.id} className={`bg-slate-700/40 rounded-xl border p-4 ${isAssigned ? 'border-green-500/30' : 'border-slate-600/40'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white leading-tight">{ex.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ex.unit_title}</p>
                        {ex.prompt_text && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ex.prompt_text}</p>
                        )}
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-600 bg-slate-700 px-1.5 py-0.5 rounded">{ex.exercise_type}</span>
                          {ex.word_limit && <span className="text-[10px] text-slate-600">{ex.word_limit}w</span>}
                          {ex.is_timed && ex.time_limit_minutes && <span className="text-[10px] text-slate-600">⏱ {ex.time_limit_minutes}min</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => assign(ex.id)}
                        disabled={isAssigned || assigning === ex.id}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isAssigned
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50'
                        }`}
                      >
                        {isAssigned ? 'Assigned ✓' : assigning === ex.id ? '…' : 'Assign'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EssaySectionTab({
  sectionKey,
  label,
  description,
  assignments,
  studentId,
  isCounselor,
  onAssignRequest,
}: {
  sectionKey: string
  label: string
  description: string
  assignments: WritingAssignment[]
  studentId?: string | null
  isCounselor?: boolean
  onAssignRequest?: () => void
}) {
  const sectionAssignments = assignments.filter(a => a.section_key === sectionKey)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">{label}</h2>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>

      {sectionAssignments.length > 0 ? (
        <div className="space-y-3">
          {sectionAssignments.map(a => (
            <AssignmentCard key={a.id} a={a} studentId={studentId} />
          ))}
          {isCounselor && onAssignRequest && (
            <button
              onClick={onAssignRequest}
              className="w-full py-2 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20 rounded-lg hover:border-violet-500/40 transition-all"
            >
              + Assign another exercise
            </button>
          )}
        </div>
      ) : (
        <div className="py-12 text-center bg-slate-800/30 rounded-xl border border-slate-700/30">
          {isCounselor && onAssignRequest ? (
            <div className="space-y-3">
              <p className="text-slate-500 text-sm">No exercises assigned yet.</p>
              <button
                onClick={onAssignRequest}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-all"
              >
                Assign Exercise
              </button>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Your coach hasn&apos;t assigned any {label.toLowerCase()} exercises yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function WritingPageInner() {
  const { getToken, isLoaded } = useAuth()
  const searchParams = useSearchParams()

  const forParam = searchParams.get('for')
  const fromParam = searchParams.get('from')

  const [token, setToken] = useState<string | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [studentDisplayName, setStudentDisplayName] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<WritingAssignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [assessmentDone, setAssessmentDone] = useState<boolean | null>(null)
  const [showAssessment, setShowAssessment] = useState(false)

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
        if (res.ok) {
          const data = await res.json()
          setUsageData(data)
          // Prefer beneficiary name from /my-usage; fall back to profile fetch
          // (beneficiary is only populated for direct student_counselor connections;
          // admins and tenant-admins don't get it automatically)
          const nameFromUsage = data?.beneficiary?.full_name || data?.beneficiary?.email
          if (nameFromUsage) {
            setStudentDisplayName(nameFromUsage)
          } else if (forParam) {
            // Fetch name directly from student profile
            fetch(`${API}/profile/${forParam}`, { headers: { Authorization: `Bearer ${tok}` } })
              .then(r => r.ok ? r.json() : null)
              .then(profile => {
                if (profile?.full_name) setStudentDisplayName(profile.full_name)
                else if (profile?.email) setStudentDisplayName(profile.email)
              })
              .catch(() => {})
          }
        }
      })
      .catch(() => {})
  }, [isLoaded, getToken, forParam])

  // Load assignments
  const loadAssignments = useRef<() => void>(() => {})
  useEffect(() => {
    if (!token) return
    const sid = forParam || undefined
    const url = `${API}/writing/assignments${sid ? `?student_id=${sid}` : ''}`
    const doFetch = () => {
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          setAssignments(data.assignments || [])
          setLoadingAssignments(false)
        })
        .catch(() => setLoadingAssignments(false))
    }
    loadAssignments.current = doFetch
    doFetch()
  }, [token, forParam])

  const isCounselor = usageData?.account_type === 'counselor'
  const isParent = usageData?.account_type === 'parent'
  const showSelfDiscovery   = usageData?.writing_self_discovery_module !== false
  const showWritingPractice = usageData?.writing_practice_module !== false
  const showEssayStatus     = !!(usageData?.essays_module || usageData?.essay_list_module || usageData?.editate_module)
  const showCommonApp       = !!usageData?.commonapp_module
  const showUCPIQs          = !!usageData?.uc_piqs_module
  const showWhyEssays       = !!usageData?.why_essays_module
  const showEssayHub        = showEssayStatus || showCommonApp || showUCPIQs || showWhyEssays

  // Check personality assessment completion to set initial expand state
  useEffect(() => {
    if (!token || !usageData) return
    if (!showSelfDiscovery) return
    const isCoachView = !!(isCounselor && forParam) || isParent
    if (isCoachView) {
      setAssessmentDone(null)
      setShowAssessment(false)
      return
    }
    // Students: check if assessment is done to decide whether to expand
    const url = `${API}/writing/personality-assessment`
    getToken().then(freshToken => {
      if (!freshToken) return
      fetch(url, { headers: { Authorization: `Bearer ${freshToken}` } })
        .then(r => {
          const done = r.status === 200
          setAssessmentDone(done)
          setShowAssessment(!done) // expand if not done (show CTA), collapse if done
        })
        .catch(() => {
          setAssessmentDone(false)
          setShowAssessment(true)
        })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, usageData])

  if (!isLoaded || !token || !usageData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Counselors and parents without a ?for= param → writing coach/parent view
  if (!forParam && (isCounselor || isParent)) {
    return (
      <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <Link href="/chat" className="text-slate-400 hover:text-white text-sm">← Chat</Link>
          <span className="text-slate-700">|</span>
          <h1 className="text-base font-semibold">
            {isParent ? 'Writing Progress' : 'Writing Assignments'}
          </h1>
        </div>
        <WritingCoachView
          token={token}
          readOnly={isParent}
          enabledModules={{
            selfDiscovery:   showSelfDiscovery,
            writingPractice: showWritingPractice,
            commonApp:       showCommonApp,
            ucPiqs:          showUCPIQs,
            whyEssays:       showWhyEssays,
          }}
        />
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {fromParam === 'writing' ? (
          <Link href="/writing" className="text-slate-400 hover:text-white text-sm">← Writing</Link>
        ) : (
          <Link href="/chat" className="text-slate-400 hover:text-white text-sm">← Chat</Link>
        )}
        <span className="text-slate-700">|</span>
        <h1 className="text-base font-semibold">Writing</h1>
        {(isCounselor || isParent) && forParam && studentDisplayName && (
          <span className="text-xs bg-violet-900/40 text-violet-300 px-2 py-0.5 rounded-full border border-violet-700/50 ml-auto">
            Viewing: {studentDisplayName}
          </span>
        )}
      </div>

      {/* Main — no sidebar */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

          {/* Self-Discovery section */}
          {showSelfDiscovery && token && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-slate-500 font-medium">Self-Discovery</h2>

              {/* Personality Assessment collapsible card */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <button
                  onClick={() => setShowAssessment(x => !x)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-800/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🧠</span>
                    <div>
                      <p className="text-sm font-medium text-white">Personality Assessment</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {assessmentDone === null ? 'Loading…' : assessmentDone ? '✓ Completed' : 'Not yet completed'}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">{showAssessment ? '▲' : '▼'}</span>
                </button>
                {showAssessment && (
                  <div className="border-t border-slate-700/50 px-4 pb-4 pt-4">
                    <SelfDiscoveryTab
                      token={token}
                      studentId={forParam}
                      studentName={studentDisplayName}
                      isReadOnly={(isCounselor || isParent) && !!forParam}
                      canRegenerate={!isParent}
                    />
                  </div>
                )}
              </div>

            </div>
          )}

          {/* My Assignments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                {isCounselor && forParam
                  ? `${studentDisplayName ? studentDisplayName.split(' ')[0] + "'s" : 'Student'} Assignments`
                  : 'My Assignments'}
              </h2>
              {isCounselor && forParam && (
                <Link
                  href="/writing"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  ← Assign exercises
                </Link>
              )}
            </div>

            {loadingAssignments ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="py-12 text-center bg-slate-800/30 rounded-xl border border-slate-700/30">
                {isCounselor && forParam ? (
                  <div className="space-y-3">
                    <p className="text-slate-500 text-sm">No exercises assigned yet.</p>
                    <Link href="/writing" className="text-xs text-violet-400 hover:text-violet-300">
                      ← Go to Assignments to assign exercises
                    </Link>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Your coach hasn&apos;t assigned any exercises yet.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {[...assignments]
                  .sort((a, b) => {
                    const order: Record<string, number> = { in_progress: 0, submitted: 1, assigned: 2, reviewed: 3, complete: 4 }
                    return (order[a.status] ?? 99) - (order[b.status] ?? 99)
                  })
                  .map(a => <AssignmentCard key={a.id} a={a} studentId={forParam} />)
                }
              </div>
            )}
          </div>

          {/* Essay Prompts & Drafts */}
          {showEssayStatus && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-slate-500 font-medium">Essays</h2>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Essay Prompts &amp; Drafts</p>
                  <p className="text-xs text-slate-400 mt-0.5">Browse all essay prompts and track your drafts</p>
                </div>
                <Link
                  href={forParam ? `/essays?for=${forParam}` : '/essays'}
                  className="shrink-0 px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                >
                  Open →
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
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
