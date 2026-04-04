'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'

interface UserRow {
  id: number
  email: string
  full_name: string | null
  account_type: string
  tier: string | null
  monthly_message_limit: number | null
  messages_used: number
  messages_reset_date: string | null
  history_retention_days_override: number | null
  essays_enabled_override: boolean | null
  plans_enabled_override: boolean | null
  max_students_override: number | null
  organization: string | null
  is_admin: boolean
  is_super_admin: boolean
  is_tenant_admin: boolean
  tenant_id: number | null
  tenant_name: string | null
  created_at: string
  tier_display_name: string | null
}

interface TierRow {
  id: number
  name: string
  display_name: string
  monthly_message_limit: number | null
  history_retention_days: number | null
  can_use_essays: boolean
  can_use_plans: boolean
  max_students: number | null
  max_counselors: number | null
  sort_order: number
}

interface TenantRow {
  id: number
  name: string
  subdomain: string
  plan: string | null
  user_count: number
  ai_queries_this_month: number
  created_at: string
  session_report_cc_emails: string | null
}

interface TenantSettings {
  id: number
  display_name: string
  session_report_cc_emails: string | null
}

type TabType = 'users' | 'tiers' | 'tenants' | 'tenant'

export default function AdminPage() {
  const { getToken } = useAuth()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const [users, setUsers] = useState<UserRow[]>([])
  const [tiers, setTiers] = useState<TierRow[]>([])
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabType>('users')
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [editingTier, setEditingTier] = useState<TierRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Role flags
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isTenantAdmin, setIsTenantAdmin] = useState(false)

  // Tenant settings tab
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null)
  const [tenantCCEmails, setTenantCCEmails] = useState('')
  const [tenantLoading, setTenantLoading] = useState(false)

  // Create tenant
  const [creatingTenant, setCreatingTenant] = useState(false)
  const [newTenant, setNewTenant] = useState({ subdomain: '', display_name: '', plan: 'beta' })
  const [createMsg, setCreateMsg] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }

      // Determine role
      const usageRes = await fetch(`${apiUrl}/my-usage`, { headers })
      let superAdmin = false, admin = false, tenantAdmin = false
      if (usageRes.ok) {
        const usage = await usageRes.json()
        superAdmin  = Boolean(usage.is_super_admin)
        admin       = Boolean(usage.is_admin)
        tenantAdmin = Boolean(usage.is_tenant_admin)
        setIsSuperAdmin(superAdmin)
        setIsAdmin(admin)
        setIsTenantAdmin(tenantAdmin)
      }

      if (!superAdmin && !admin && !tenantAdmin) {
        setError('Access denied. Admin access required.')
        setLoading(false)
        return
      }

      const wrap = (label: string, p: Promise<unknown>) =>
        p.catch(e => { console.error(`[admin] ${label} failed:`, e); throw e })

      const fetches: Promise<unknown>[] = []

      if (admin || superAdmin) {
        fetches.push(
          wrap('users-all', fetch(`${apiUrl}/admin/users-all`, { headers })
            .then(r => { console.log('[admin] users-all status', r.status); return r.ok ? r.json() : [] }).then(setUsers)),
        )
      } else if (tenantAdmin) {
        // Tenant admins get a junction-table scoped view of their practice
        fetches.push(
          wrap('my-users', fetch(`${apiUrl}/admin/my-users`, { headers })
            .then(r => { console.log('[admin] my-users status', r.status); return r.ok ? r.json() : [] }).then(setUsers)),
        )
      }

      if (superAdmin) {
        fetches.push(
          wrap('tiers', fetch(`${apiUrl}/admin/tiers`, { headers })
            .then(r => { console.log('[admin] tiers status', r.status); return r.ok ? r.json() : [] }).then(setTiers)),
          wrap('tenants', fetch(`${apiUrl}/admin/tenants`, { headers })
            .then(r => { console.log('[admin] tenants status', r.status); return r.ok ? r.json() : [] }).then(setTenants)),
        )
      }

      fetches.push(
        wrap('my-tenant', fetch(`${apiUrl}/admin/my-tenant`, { headers })
          .then(r => { console.log('[admin] my-tenant status', r.status); return r.ok ? r.json() : null })
          .then(t => { if (t) { setTenantSettings(t); setTenantCCEmails(t.session_report_cc_emails || '') } }))
      )

      const results = await Promise.allSettled(fetches)
      const anyFailed = results.some(r => r.status === 'rejected')
      if (anyFailed) {
        console.warn('[admin] some fetches failed — page may be partially loaded')
      }
    } catch (e) {
      console.error('[admin] load failed:', e)
      setError('Failed to load admin data.')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const saveUser = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tier: editingUser.tier || null,
          monthly_message_limit: editingUser.monthly_message_limit,
          history_retention_days_override: editingUser.history_retention_days_override,
          essays_enabled_override: editingUser.essays_enabled_override,
          plans_enabled_override: editingUser.plans_enabled_override,
          max_students_override: editingUser.max_students_override,
        })
      })
      if (res.ok) {
        setSaveMsg('Saved!')
        setEditingUser(null)
        load()
      } else {
        setSaveMsg('Error saving.')
      }
    } catch { setSaveMsg('Error saving.') }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  // Pending role change waiting for confirmation
  const [pendingFlag, setPendingFlag] = useState<{
    userId: number
    email: string
    flag: 'admin' | 'super-admin' | 'tenant-admin'
    value: boolean
    confirmInput: string
  } | null>(null)

  const requestToggleFlag = (userId: number, email: string, flag: 'admin' | 'super-admin' | 'tenant-admin', value: boolean) => {
    setPendingFlag({ userId, email, flag, value, confirmInput: '' })
  }

  const confirmToggleFlag = async () => {
    if (!pendingFlag) return
    const { userId, email, flag, value } = pendingFlag
    // For super-admin grants, require typing the email
    if (flag === 'super-admin' && value && pendingFlag.confirmInput.trim().toLowerCase() !== email.toLowerCase()) {
      return
    }
    const token = await getToken()
    const bodyKey = flag === 'admin' ? 'is_admin' : flag === 'super-admin' ? 'is_super_admin' : 'is_tenant_admin'
    const res = await fetch(`${apiUrl}/admin/users/${userId}/${flag}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [bodyKey]: value }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [bodyKey]: value } : u))
      if (editingUser?.id === userId) setEditingUser(prev => prev ? { ...prev, [bodyKey]: value } : prev)
    }
    setPendingFlag(null)
  }

  const saveTier = async () => {
    if (!editingTier) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/admin/tiers/${editingTier.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          display_name: editingTier.display_name,
          monthly_message_limit: editingTier.monthly_message_limit,
          history_retention_days: editingTier.history_retention_days,
          can_use_essays: editingTier.can_use_essays,
          can_use_plans: editingTier.can_use_plans,
          max_students: editingTier.max_students,
          max_counselors: editingTier.max_counselors,
          sort_order: editingTier.sort_order,
        })
      })
      if (res.ok) {
        setSaveMsg('Tier updated!')
        setEditingTier(null)
        load()
      } else {
        setSaveMsg('Error saving tier.')
      }
    } catch { setSaveMsg('Error saving tier.') }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const saveTenantSettings = async () => {
    if (!tenantSettings) return
    setTenantLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/admin/tenants/${tenantSettings.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_report_cc_emails: tenantCCEmails.trim() || null }),
      })
      if (res.ok) {
        setSaveMsg('Tenant settings saved!')
        setTenantSettings({ ...tenantSettings, session_report_cc_emails: tenantCCEmails.trim() || null })
      } else {
        setSaveMsg('Error saving tenant settings.')
      }
    } catch { setSaveMsg('Error saving tenant settings.') }
    setTenantLoading(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const createTenant = async () => {
    if (!newTenant.subdomain || !newTenant.display_name) {
      setCreateMsg('Subdomain and display name are required.')
      return
    }
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/admin/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newTenant),
      })
      if (res.ok) {
        setCreateMsg('Tenant created!')
        setCreatingTenant(false)
        setNewTenant({ subdomain: '', display_name: '', plan: 'beta' })
        load()
      } else {
        const err = await res.json()
        setCreateMsg(err.detail || 'Error creating tenant.')
      }
    } catch { setCreateMsg('Error creating tenant.') }
    setSaving(false)
    setTimeout(() => setCreateMsg(''), 4000)
  }

  const filteredUsers = users.filter(u =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.organization?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-gray-500">Loading admin panel…</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/chat" className="text-indigo-500 underline">← Back to chat</Link>
      </div>
    </div>
  )

  const roleLabel = isSuperAdmin ? 'Super-admin' : isAdmin ? 'Admin' : 'Tenant admin'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#0c1b33] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold"><span className="text-sky-300">Soar</span> Admin</h1>
          <p className="text-xs text-slate-400 mt-0.5">{roleLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          {saveMsg && <span className="text-sm text-green-400">{saveMsg}</span>}
          <Link href="/chat" className="text-sm text-slate-400 hover:text-white">← Back to chat</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {/* Users: all three admin roles */}
          {(isAdmin || isSuperAdmin || isTenantAdmin) && (
            <button onClick={() => setTab('users')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Users ({users.length})
            </button>
          )}
          {/* Tiers: super-admin only */}
          {isSuperAdmin && (
            <button onClick={() => setTab('tiers')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'tiers' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Tiers ({tiers.length})
            </button>
          )}
          {/* Tenants: super-admin only */}
          {isSuperAdmin && (
            <button onClick={() => setTab('tenants')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'tenants' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Tenants ({tenants.length})
            </button>
          )}
          {/* Tenant Settings / My Practice: all three roles */}
          {tenantSettings && (
            <button onClick={() => setTab('tenant')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'tenant' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {isTenantAdmin && !isAdmin && !isSuperAdmin ? 'My Practice' : 'Tenant Settings'}
            </button>
          )}
        </div>

        {/* ── Users tab ── */}
        {tab === 'users' && (
          <div>
            {isTenantAdmin && !isAdmin && !isSuperAdmin && (
              <p className="text-sm text-gray-500 mb-4">
                To change a user&apos;s plan or limits, contact{' '}
                <a href="mailto:help@lifelaunchr.com" className="text-indigo-500 hover:underline">help@lifelaunchr.com</a>.
              </p>
            )}
            <div className="mb-4 flex gap-3 items-center">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or org…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-80 focus:outline-none focus:border-indigo-400"
              />
              <span className="text-sm text-gray-400">{filteredUsers.length} users</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier / Role</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Msg limit</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Used</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Overrides</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{u.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                        {u.organization && <p className="text-xs text-gray-400">{u.organization}</p>}
                        {u.tenant_name && <p className="text-xs text-indigo-400">{u.tenant_name}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{u.account_type}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                          {u.tier_display_name || u.tier || 'free'}
                        </span>
                        {u.is_super_admin && (
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">super-admin</span>
                        )}
                        {!u.is_super_admin && u.is_admin && (
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">admin</span>
                        )}
                        {u.is_tenant_admin && (
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700">tenant-admin</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {u.monthly_message_limit === null ? '∞' : u.monthly_message_limit ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{u.messages_used}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">
                        {[
                          u.history_retention_days_override != null && `hist:${u.history_retention_days_override}d`,
                          u.essays_enabled_override != null && `essays:${u.essays_enabled_override}`,
                          u.plans_enabled_override != null && `plans:${u.plans_enabled_override}`,
                          u.max_students_override != null && `maxStu:${u.max_students_override}`,
                        ].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {(isAdmin || isSuperAdmin) ? (
                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tiers tab ── */}
        {tab === 'tiers' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Msg/mo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">History</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Max students</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Essays</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plans</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tiers.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{t.display_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{t.name}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{t.monthly_message_limit ?? '∞'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{t.history_retention_days ? `${t.history_retention_days}d` : '∞'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{t.max_students ?? '∞'}</td>
                      <td className="px-4 py-3 text-center">{t.can_use_essays ? '✓' : '—'}</td>
                      <td className="px-4 py-3 text-center">{t.can_use_plans ? '✓' : '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setEditingTier({ ...t })}
                          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tenants tab (super-admin only) ── */}
        {tab === 'tenants' && isSuperAdmin && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <span className="text-sm text-gray-500">{tenants.length} tenants</span>
              <button
                onClick={() => setCreatingTenant(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                + New Tenant
              </button>
            </div>
            {createMsg && <p className="text-sm text-green-600 mb-3">{createMsg}</p>}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subdomain</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Users</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">AI queries (mo)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tenants.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.subdomain}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                          {t.plan || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{t.user_count}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{t.ai_queries_this_month}</td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tenant Settings tab ── */}
        {tab === 'tenant' && (
          <div className="max-w-xl">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-1">
                {tenantSettings?.display_name || 'Tenant'} Settings
              </h2>
              <p className="text-sm text-gray-400 mb-6">Configure settings for your organization.</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session report CC emails <span className="text-gray-400 font-normal">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={tenantCCEmails}
                    onChange={e => setTenantCCEmails(e.target.value)}
                    placeholder="e.g. swami@lifelaunchr.com, manager@firm.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    These addresses receive a copy of every session report sent by any coach in this tenant.
                  </p>
                </div>
                <button
                  onClick={saveTenantSettings}
                  disabled={tenantLoading || !tenantSettings}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
                >
                  {tenantLoading ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit user modal ── */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Edit User</h3>
            <p className="text-sm text-gray-400 mb-5">{editingUser.full_name || editingUser.email}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tier</label>
                <input
                  value={editingUser.tier || ''}
                  onChange={e => setEditingUser({ ...editingUser, tier: e.target.value || null })}
                  placeholder="e.g. student_plus, solo, practice"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                <p className="text-[10px] text-gray-400 mt-1">Leave blank to use default for account type</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Message limit override</label>
                <input
                  type="number"
                  value={editingUser.monthly_message_limit ?? ''}
                  onChange={e => setEditingUser({ ...editingUser, monthly_message_limit: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Leave blank = use tier default"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">History retention override (days)</label>
                <input
                  type="number"
                  value={editingUser.history_retention_days_override ?? ''}
                  onChange={e => setEditingUser({ ...editingUser, history_retention_days_override: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Leave blank = use tier default"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max students override (counselors)</label>
                <input
                  type="number"
                  value={editingUser.max_students_override ?? ''}
                  onChange={e => setEditingUser({ ...editingUser, max_students_override: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Leave blank = use tier default"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.essays_enabled_override ?? false}
                    onChange={e => setEditingUser({ ...editingUser, essays_enabled_override: e.target.checked })}
                  />
                  Essays override
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.plans_enabled_override ?? false}
                    onChange={e => setEditingUser({ ...editingUser, plans_enabled_override: e.target.checked })}
                  />
                  Plans override
                </label>
              </div>

              {/* Role flags — visibility gated by caller role */}
              {(isSuperAdmin || isAdmin) && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Role flags</p>
                  <div className="space-y-3">
                    {/* Super-admin: only super-admins can see/change */}
                    {isSuperAdmin && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          Super-admin
                          <span className="ml-1 text-xs text-gray-400">(platform owner)</span>
                        </span>
                        <button
                          onClick={() => requestToggleFlag(editingUser.id, editingUser.email, 'super-admin', !editingUser.is_super_admin)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            editingUser.is_super_admin
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {editingUser.is_super_admin ? 'Revoke' : 'Grant'}
                        </button>
                      </div>
                    )}
                    {/* Admin: only super-admins can see/change */}
                    {isSuperAdmin && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          Admin
                          <span className="ml-1 text-xs text-gray-400">(manage all users)</span>
                        </span>
                        <button
                          onClick={() => requestToggleFlag(editingUser.id, editingUser.email, 'admin', !editingUser.is_admin)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            editingUser.is_admin
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {editingUser.is_admin ? 'Revoke' : 'Grant'}
                        </button>
                      </div>
                    )}
                    {/* Tenant admin: super-admins and admins can see/change */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Tenant admin
                        <span className="ml-1 text-xs text-gray-400">(manage their org)</span>
                      </span>
                      <button
                        onClick={() => requestToggleFlag(editingUser.id, editingUser.email, 'tenant-admin', !editingUser.is_tenant_admin)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          editingUser.is_tenant_admin
                            ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {editingUser.is_tenant_admin ? 'Revoke' : 'Grant'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveUser}
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit tier modal ── */}
      {editingTier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Edit Tier: {editingTier.display_name}</h3>
            <p className="text-sm text-gray-400 font-mono mb-5">{editingTier.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display name</label>
                <input
                  value={editingTier.display_name}
                  onChange={e => setEditingTier({ ...editingTier, display_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Messages/month (blank = unlimited)</label>
                <input
                  type="number"
                  value={editingTier.monthly_message_limit ?? ''}
                  onChange={e => setEditingTier({ ...editingTier, monthly_message_limit: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">History retention days (blank = unlimited)</label>
                <input
                  type="number"
                  value={editingTier.history_retention_days ?? ''}
                  onChange={e => setEditingTier({ ...editingTier, history_retention_days: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max students (blank = unlimited)</label>
                <input
                  type="number"
                  value={editingTier.max_students ?? ''}
                  onChange={e => setEditingTier({ ...editingTier, max_students: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={editingTier.can_use_essays}
                    onChange={e => setEditingTier({ ...editingTier, can_use_essays: e.target.checked })} />
                  Essays
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={editingTier.can_use_plans}
                    onChange={e => setEditingTier({ ...editingTier, can_use_plans: e.target.checked })} />
                  Plans module
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveTier} disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                {saving ? 'Saving…' : 'Save tier'}
              </button>
              <button onClick={() => setEditingTier(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Role flag confirmation modal ── */}
      {pendingFlag && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            {(() => {
              const { flag, value, email } = pendingFlag
              const action = value ? 'Grant' : 'Revoke'
              const roleLabel = flag === 'super-admin' ? 'Super-admin' : flag === 'admin' ? 'Admin' : 'Tenant admin'
              const descriptions: Record<string, string> = {
                'super-admin': 'Full platform ownership. Can manage all tenants, grant admin access, and access everything.',
                'admin': 'Platform-wide access to all users and tiers.',
                'tenant-admin': 'Can manage their organization\'s settings and view team reports.',
              }
              const colors: Record<string, string> = {
                'super-admin': 'text-red-700',
                'admin': 'text-amber-700',
                'tenant-admin': 'text-teal-700',
              }
              const btnColors: Record<string, string> = {
                'super-admin': 'bg-red-600 hover:bg-red-500',
                'admin': 'bg-amber-600 hover:bg-amber-500',
                'tenant-admin': 'bg-teal-600 hover:bg-teal-500',
              }
              const needsEmailConfirm = flag === 'super-admin' && value
              const confirmReady = !needsEmailConfirm || pendingFlag.confirmInput.trim().toLowerCase() === email.toLowerCase()
              return (
                <>
                  <h3 className="text-base font-semibold text-gray-800 mb-1">
                    {action} <span className={colors[flag]}>{roleLabel}</span>
                  </h3>
                  <p className="text-sm text-gray-500 mb-1">{email}</p>
                  <p className="text-xs text-gray-400 mb-5">{descriptions[flag]}</p>

                  {needsEmailConfirm && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Type the user's email to confirm
                      </label>
                      <input
                        autoFocus
                        type="text"
                        value={pendingFlag.confirmInput}
                        onChange={e => setPendingFlag({ ...pendingFlag, confirmInput: e.target.value })}
                        placeholder={email}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={confirmToggleFlag}
                      disabled={!confirmReady}
                      className={`flex-1 ${btnColors[flag]} disabled:opacity-40 text-white rounded-lg py-2 text-sm font-medium transition-colors`}
                    >
                      {action} {roleLabel}
                    </button>
                    <button
                      onClick={() => setPendingFlag(null)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Create tenant modal ── */}
      {creatingTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-gray-800 mb-5">New Tenant</h3>
            {createMsg && <p className="text-sm text-red-500 mb-3">{createMsg}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display name</label>
                <input
                  value={newTenant.display_name}
                  onChange={e => setNewTenant({ ...newTenant, display_name: e.target.value })}
                  placeholder="e.g. Bright Futures Counseling"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subdomain</label>
                <input
                  value={newTenant.subdomain}
                  onChange={e => setNewTenant({ ...newTenant, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="e.g. brightfutures"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-400"
                />
                <p className="text-[10px] text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                <select
                  value={newTenant.plan}
                  onChange={e => setNewTenant({ ...newTenant, plan: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option value="beta">Beta</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={createTenant} disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                {saving ? 'Creating…' : 'Create tenant'}
              </button>
              <button onClick={() => { setCreatingTenant(false); setCreateMsg('') }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
