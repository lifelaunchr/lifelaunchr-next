'use client'

interface Contributor {
  role: 'student' | 'parent' | 'counselor'
  full_name?: string | null
  email?: string | null
  contribution: number
}

interface UsageDataLite {
  account_type?: string
  sessions_used?: number
  session_limit?: number | null
  beneficiary?: {
    full_name?: string | null
    email?: string | null
    sessions_used: number
    session_limit: number
    contributors?: Contributor[]
  } | null
}

function displayName(c: { full_name?: string | null; email?: string | null }) {
  return c.full_name || c.email || 'Unnamed'
}

export default function SessionsHelpModal({
  usageData,
  supportEmail,
  onClose,
}: {
  usageData: UsageDataLite
  supportEmail: string
  onClose: () => void
}) {
  const ben = usageData.beneficiary
  const benName = ben?.full_name || ben?.email || 'this student'
  const benFirst = (ben?.full_name || '').split(' ')[0] || benName
  const callerUsed = usageData.sessions_used ?? 0
  const callerLimit = usageData.session_limit ?? 0
  const isStudent = usageData.account_type === 'student'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-white/10 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-white">How research sessions work</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          <section>
            <h3 className="text-white font-medium mb-1">What counts as a session?</h3>
            <p>
              A <em>research session</em> is a continuous block of work: your first
              message in a new chat opens a session, and any follow-up questions in
              the next <strong>60 minutes</strong> are included. After 60 minutes of
              inactivity, your next message opens a new session and counts +1 toward
              your session limit.
            </p>
            <p className="mt-2 text-slate-400">
              This means you&apos;re billed for research depth, not message count.
              Ask as many follow-ups as you need within the hour. Soar works best
              when you have a conversation and explore, so we encourage you to do that.
            </p>
          </section>

          {!isStudent && (
            <section>
              <h3 className="text-white font-medium mb-1">
                You have two pools, tracked separately
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  When you research <em>for a specific student</em>, the session counts
                  against that student&apos;s shared pool, not your own. The same pool
                  is used whether the research is done by the student, a parent, or
                  you on the student&apos;s behalf.
                </li>
                <li>
                  Your personal pool is for research that&apos;s not tied to a
                  particular student (no student selected).
                </li>
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-white font-medium mb-1">Your current limits</h3>
            <ul className="list-none space-y-1">
              <li>
                <strong className="text-white">Your sessions:</strong> {callerUsed} / {callerLimit} this month
              </li>
              {ben && (
                <>
                  <li>
                    <strong className="text-white">{benName}&apos;s shared pool:</strong>{' '}
                    {ben.sessions_used} / {ben.session_limit} this month
                  </li>
                  {ben.contributors && ben.contributors.length > 0 && (
                    <li className="pl-5 mt-1">
                      <ul className="list-disc space-y-0.5 text-slate-400 text-[13px]">
                        {ben.contributors.map((c, i) => (
                          <li key={i}>
                            {c.contribution} from{' '}
                            {c.role === 'student'
                              ? `${benFirst}'s own account`
                              : c.role === 'parent'
                              ? `a parent (${displayName(c)})`
                              : `a counselor (${displayName(c)})`}
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                </>
              )}
            </ul>
          </section>

          <section className="pt-3 border-t border-white/10">
            <p className="text-xs text-slate-400">
              Limits reset on the 1st of each month. If you have questions, please
              email us at{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="text-sky-400 hover:text-sky-300 underline"
              >
                {supportEmail}
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm rounded-md"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
