'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ParentEntry { full_name: string; email: string }
type PersonStatus = 'created' | 'linked' | 'reinvited' | 'reactivated' | 'connected'
interface PersonResult { id: number; status: PersonStatus; invite_url: string | null }
interface FamilyResult {
  student: PersonResult
  parents: PersonResult[]
}
interface CounselorOption { id: number; full_name: string }
interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  counselors?: CounselorOption[]
}

export default function AddFamilyModal({ open, onClose, onSuccess, counselors }: Props) {
  const { getToken } = useAuth()
  const isTenantAdmin = counselors !== undefined && counselors.length > 0
  // counselors is guaranteed populated on mount because dashboard passes key={tenantCounselors ? 'ta' : 'c'}
  // which forces a remount after the async fetch completes.
  const [selectedCounselorId, setSelectedCounselorId] = useState<number | null>(
    isTenantAdmin ? counselors[0].id : null
  )
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [parents, setParents] = useState<ParentEntry[]>([{ full_name: '', email: '' }])
  const [engagementType, setEngagementType] = useState('')
  const [packageName, setPackageName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [expectedEndDate, setExpectedEndDate] = useState('')
  const [actualEndDate, setActualEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<FamilyResult | null>(null)
  const [resultNames, setResultNames] = useState({ studentName: '', parentNames: [] as string[] })

  const ENGAGEMENT_TYPES = [
    { value: '', label: '— Select —' },
    { value: 'not_a_client_yet', label: 'Not a client yet' },
    { value: 'comprehensive', label: 'Comprehensive' },
    { value: 'stay_on_track', label: 'Stay on Track' },
    { value: 'hourly_on_demand', label: 'Hourly / On Demand' },
    { value: 'test_prep', label: 'Test Prep' },
    { value: 'essay', label: 'Essay' },
  ]

  const reset = () => {
    setStudentName('')
    setStudentEmail('')
    setParents([{ full_name: '', email: '' }])
    setEngagementType('')
    setPackageName('')
    setStartDate('')
    setExpectedEndDate('')
    setActualEndDate('')
    setError('')
    setResult(null)
    setResultNames({ studentName: '', parentNames: [] })
    if (isTenantAdmin && counselors) setSelectedCounselorId(counselors[0].id)
  }

  const addParent = () => {
    if (parents.length < 4) setParents([...parents, { full_name: '', email: '' }])
  }

  const removeParent = (i: number) => setParents(parents.filter((_, j) => j !== i))

  const updateParent = (i: number, f: keyof ParentEntry, v: string) => {
    const u = [...parents]
    u[i] = { ...u[i], [f]: v }
    setParents(u)
  }

  const validate = (): string | null => {
    if (isTenantAdmin && !selectedCounselorId) return 'Please select a counselor'
    if (!studentName.trim()) return 'Student name is required'
    if (!studentEmail.trim()) return 'Student email is required'
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(studentEmail.trim())) return 'Invalid student email format'
    const se = studentEmail.trim().toLowerCase()
    const seen = new Set([se])
    for (const p of parents.filter(x => x.full_name.trim() || x.email.trim())) {
      if (!p.full_name.trim()) return 'Parent name is required when email is provided'
      if (!p.email.trim()) return 'Parent email is required when name is provided'
      if (!re.test(p.email.trim())) return 'Invalid parent email: ' + p.email
      const pe = p.email.trim().toLowerCase()
      if (pe === se) return 'Parent email cannot be the same as student email'
      if (seen.has(pe)) return 'Duplicate email: ' + pe
      seen.add(pe)
    }
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setSubmitting(true)
    try {
      const token = await getToken()
      const fp = parents.filter(p => p.full_name.trim() && p.email.trim())
      const endpoint = isTenantAdmin ? '/tenant-admin/families' : '/counselors/me/families'
      const engagementFields = {
        ...(engagementType      ? { engagement_type:       engagementType }      : {}),
        ...(packageName.trim()  ? { coaching_package_name: packageName.trim() }  : {}),
        ...(startDate           ? { start_date:            startDate }            : {}),
        ...(expectedEndDate     ? { expected_end_date:     expectedEndDate }      : {}),
        ...(actualEndDate       ? { actual_end_date:       actualEndDate }        : {}),
      }
      const body = isTenantAdmin
        ? {
            counselor_id: selectedCounselorId,
            student: { full_name: studentName.trim(), email: studentEmail.trim() },
            parents: fp.map(p => ({ full_name: p.full_name.trim(), email: p.email.trim() })),
            ...engagementFields,
          }
        : {
            student: { full_name: studentName.trim(), email: studentEmail.trim() },
            parents: fp.map(p => ({ full_name: p.full_name.trim(), email: p.email.trim() })),
            ...engagementFields,
          }
      const res = await fetch(API + endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        const detail = d.detail
        if (detail === 'COUNSELOR_AT_CAPACITY' || detail?.code === 'COUNSELOR_AT_CAPACITY') {
          if (isTenantAdmin && detail?.code === 'COUNSELOR_AT_CAPACITY') {
            const name = counselors?.find(c => c.id === selectedCounselorId)?.full_name || 'This counselor'
            throw new Error(
              `${name} is at their student limit (${detail.active}/${detail.limit}). ` +
              `To add more students, upgrade ${name}'s plan or archive inactive students from their roster.`
            )
          }
          throw new Error("You've reached your student limit. Upgrade your plan or archive inactive students to add more.")
        }
        throw new Error(typeof detail === 'string' ? detail : 'Error ' + res.status)
      }
      const data: FamilyResult = await res.json()
      setResult(data)
      setResultNames({ studentName: studentName.trim(), parentNames: fp.map(p => p.full_name.trim()) })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddAnother = () => { reset(); onSuccess() }
  const handleDone = () => { reset(); onSuccess(); onClose() }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={result ? handleDone : onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">{result ? 'Family Added' : 'Add a Family'}</h2>
            <button onClick={result ? handleDone : onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>

          {result ? (
            <div>
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' + (['created','reinvited','reactivated'].includes(result.student.status) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                    {result.student.status === 'connected' || result.student.status === 'linked' ? 'Connected' : 'Invited'}
                  </span>
                  <span className="text-sm text-gray-800">{resultNames.studentName}</span>
                  <span className="text-xs text-gray-400">(student)</span>
                </div>
                {result.parents.map((pr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' + (['created','reinvited','reactivated'].includes(pr.status) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                      {pr.status === 'connected' || pr.status === 'linked' ? 'Connected' : 'Invited'}
                    </span>
                    <span className="text-sm text-gray-800">{resultNames.parentNames[i]}</span>
                    <span className="text-xs text-gray-400">(parent)</span>
                  </div>
                ))}
              </div>
              {(() => {
                const allPeople = [result.student, ...result.parents]
                const hasInvited = allPeople.some(p => ['created','reinvited','reactivated'].includes(p.status))
                const hasConnected = allPeople.some(p => p.status === 'connected' || p.status === 'linked')
                if (hasInvited && hasConnected) {
                  return <p className="text-sm text-gray-500 mb-5">Invite emails sent to new members. Existing account holders have been connected and notified.</p>
                }
                if (hasInvited) {
                  return <p className="text-sm text-gray-500 mb-5">Invite emails have been sent. Connections will be established automatically when they sign up.</p>
                }
                return <p className="text-sm text-gray-500 mb-5">All accounts were already active. Everyone has been connected and notified.</p>
              })()}

              <div className="flex gap-3">
                <button onClick={handleAddAnother} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">Add Another Family</button>
                <button onClick={handleDone} className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Done</button>
              </div>
            </div>
          ) : (
            <div>
              {error && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              {isTenantAdmin && (
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assign to Counselor</label>
                  <select
                    value={selectedCounselorId ?? ''}
                    onChange={e => setSelectedCounselorId(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(counselors ?? []).map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Student</label>
                <div className="space-y-3">
                  <input type="text" placeholder="Full name" value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="email" placeholder="Email address" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parents / Guardians</label>
                <div className="space-y-3">
                  {parents.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <input type="text" placeholder="Full name" value={p.full_name} onChange={e => updateParent(idx, 'full_name', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="email" placeholder="Email address" value={p.email} onChange={e => updateParent(idx, 'email', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      {parents.length > 1 && <button onClick={() => removeParent(idx)} className="mt-2 text-gray-400 hover:text-red-500 text-sm" title="Remove parent">&times;</button>}
                    </div>
                  ))}
                </div>
                {parents.length < 4 && <button onClick={addParent} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add another parent</button>}
              </div>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Engagement Details <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Engagement Type</label>
                      <select
                        value={engagementType}
                        onChange={e => setEngagementType(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ENGAGEMENT_TYPES.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Package Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Diamond Package"
                        value={packageName}
                        onChange={e => setPackageName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Expected End</label>
                      <input
                        type="date"
                        value={expectedEndDate}
                        onChange={e => setExpectedEndDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Actual End</label>
                      <input
                        type="date"
                        value={actualEndDate}
                        onChange={e => setActualEndDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? 'Adding...' : 'Add Family'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
