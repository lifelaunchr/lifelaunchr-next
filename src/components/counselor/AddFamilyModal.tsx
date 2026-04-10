'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ParentEntry { full_name: string; email: string }
interface FamilyResult {
  student: { id: number; status: 'created' | 'linked'; invite_url: string | null }
  parents: { id: number; status: 'created' | 'linked'; invite_url: string | null }[]
}
interface Props { open: boolean; onClose: () => void; onSuccess: () => void }

export default function AddFamilyModal({ open, onClose, onSuccess }: Props) {
  const { getToken } = useAuth()
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [parents, setParents] = useState<ParentEntry[]>([{ full_name: '', email: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<FamilyResult | null>(null)
  const [resultNames, setResultNames] = useState({ studentName: '', parentNames: [] as string[] })

  const reset = () => {
    setStudentName('')
    setStudentEmail('')
    setParents([{ full_name: '', email: '' }])
    setError('')
    setResult(null)
    setResultNames({ studentName: '', parentNames: [] })
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
      const res = await fetch(API + '/counselors/me/families', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: { full_name: studentName.trim(), email: studentEmail.trim() },
          parents: fp.map(p => ({ full_name: p.full_name.trim(), email: p.email.trim() })),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || 'Error ' + res.status)
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
                  <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' + (result.student.status === 'created' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                    {result.student.status === 'created' ? 'Invited' : 'Linked'}
                  </span>
                  <span className="text-sm text-gray-800">{resultNames.studentName}</span>
                  <span className="text-xs text-gray-400">(student)</span>
                </div>
                {result.parents.map((pr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' + (pr.status === 'created' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                      {pr.status === 'created' ? 'Invited' : 'Linked'}
                    </span>
                    <span className="text-sm text-gray-800">{resultNames.parentNames[i]}</span>
                    <span className="text-xs text-gray-400">(parent)</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mb-5">
                {result.student.status === 'created' || result.parents.some(p => p.status === 'created')
                  ? 'Invite emails have been sent. Connections will be established automatically when they sign up.'
                  : 'All accounts were already in the system. Connections have been established.'}
              </p>
              <div className="flex gap-3">
                <button onClick={handleAddAnother} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">Add Another Family</button>
                <button onClick={handleDone} className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Done</button>
              </div>
            </div>
          ) : (
            <div>
              {error && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
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
