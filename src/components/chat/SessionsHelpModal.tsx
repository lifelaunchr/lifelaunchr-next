'use client'

interface UsageDataLite {
  sessions_used?: number
  session_limit?: number | null
  beneficiary?: {
    full_name?: string | null
    email?: string | null
    sessions_used: number
    session_limit: number
  } | null
}

export default function SessionsHelpModal({
  usageData,
  onClose,
}: {
  usageData: UsageDataLite
  onClose: () => void
}) {
  const ben = usageData.beneficiary
  const benName = ben?.full_name || ben?.email || 'this student'
  const callerUsed = usageData.sessions_used ?? 0
  const callerLimit = usageData.session_limit ?? 0

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
              A <em>research session</em> is a continuous block of work — your first message
              opens a session, and any follow-up questions in the next <strong>60 minutes</strong> are
              free. After 60 minutes of inactivity, your next message opens a new session and
              counts +1 toward the limit.
            </p>
            <p className="mt-2 text-slate-400">
              This means you&apos;re billed for <em>research depth</em>, not message count. Ask as
              many follow-ups as you need within the hour.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">Two pools, tracked separately</h3>
            <p>
              When you research <em>for a specific student</em>, the session counts against
              that student&apos;s shared pool — not your own. Your personal pool is for
              unscoped research (no student selected).
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Your sessions:</strong> {callerUsed} / {callerLimit} this month</li>
              {ben && (
                <li>
                  <strong>{benName}&apos;s shared pool:</strong> {ben.sessions_used} / {ben.session_limit} this month
                </li>
              )}
            </ul>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">How limits are computed</h3>
            <p>
              Each user&apos;s <em>contribution</em> is the first non-null of:
            </p>
            <ol className="list-decimal pl-5 mt-1 space-y-0.5">
              <li>Their per-user override (admin-set)</li>
              <li>Their tier&apos;s default</li>
              <li>5 (hard fallback)</li>
            </ol>
            <p className="mt-2">
              <strong>Your personal pool</strong> = your contribution.
            </p>
            {ben && (
              <p className="mt-1">
                <strong>{benName}&apos;s shared pool</strong> = {benName}&apos;s contribution +
                every linked parent&apos;s contribution + every active (non-archived)
                counselor&apos;s contribution. If any contributor is unlimited, the whole
                pool is unlimited.
              </p>
            )}
          </section>

          <section className="pt-2 border-t border-white/10">
            <p className="text-xs text-slate-500">
              Limits reset on the 1st of each month. Need more? Contact your counselor or
              upgrade your plan.
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
