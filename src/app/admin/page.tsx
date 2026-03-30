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
  student_plan: string | null
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
  can_customize_instructions: boolean
  can_brand: boolean
  is_b2b: boolean
  sort_order: number
}

interface TenantSettings {
  id: number
  name: string
  session_report_cc_emails: string | null
}

export default function AdminPage() {
  const { getToken } = useAuth()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const [users, setUsers] = useState<UserRow[]>([])
  const [tiers, setTiers] = useState<TierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'users' | 'tiers' | 'tenant'>('users')
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [editingTier, setEditingTier] = useState<TierRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null)
  const [tenantCCEmails, setTenantCCEmails] = useState('')
  const [tenantLoading, setTenantLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      // First check usage to determine role
      const usageRes = await fetch(`${apiUrl}/my-usage`, { headers: { Authorization: `Bearer ${token}` } })
      let superAdmin = false
      let tenantAdmin = false
      if (usageRes.ok) {
        const usage = await usageRes.json()
        superAdmin = Boolean(usage.is_admin)
        tenantAdmin = Boolean(usage.is_tenant_admin)
        setIsSuperAdmin(superAdmin)
      }

      if (superAdmin) {
        const [usersRes, tiersRes] = await Promise.all([
          fetch(`${apiUrl}/admin/users-all`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/admin/tiers`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (usersRes.status === 403 || tiersRes.status === 403) {
          setError('Access denied.')
          setLoading(false)
          return
        }
        if (usersRes.ok) setUsers(await usersRes.json())
        if (tiersRes.ok) setTiers(await tiersRes.json())
      } else if (!tenantAdmin) {
        setError('Access denied. Admin access required.')
        setLoading(false)
        return
      }

      // Load tenant settings for both super-admins and tenant-admins
      const tenantRes = await fetch(`${apiUrl}/admin/my-tenant`, { headers: { Authorization: `Bearer ${token}` } })
      if (tenantRes.ok) {
        const t: TenantSettings = await tenantRes.json()
        setTenantSettings(t)
        setTenantCCEmails(t.session_report_cc_emails || '')
      }

      // Tenant-admins land on tenant tab by default
      if (!superAdmin && tenantAdmin) {
        setTab('tenant')
      }
    } catch (e) {
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
    setSaving(true)
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
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#0c1b33] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold"><span className="text-sky-300">Soar</span> Admin</h1>
          <p className="text-xs text-slate-400 mt-0.5">{isSuperAdmin ? 'Super-admin panel' : 'Admin panel'}</p>
        </div>
        <div className="flex items-center gap-4">
          {saveMsg && <span className="text-sm text-green-400">{saveMsg}</span>}
          <Link href="/chat" className="text-sm text-slate-400 hover:text-white">← Back to chat</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {isSuperAdmin && (['users', 'tiers'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t} ({t === 'users' ? users.length : tiers.length})
            </button>
          ))}
          {tenantSettings && (
            <button
              onClick={() => setTab('tenant')}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === 'tenant'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tenant Settings
            </button>
          )}
        </div>

        {/* Users tab */}
        {tab === 'users' && (
          <div>
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
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
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{u.account_type}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                          {u.tier_display_name || u.tier || u.student_plan || 'free'}
                        </span>
                        {(u.is_admin || u.is_super_admin) && (
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                            {u.is_super_admin ? 'super-admin' : 'admin'}
                          </span>
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
                        <button
                          onClick={() => setEditingUser({ ...u })}
                          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                        >
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

        {/* Tenant Settings tab */}
        {tab === 'tenant' && (
          <div className="max-w-xl">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-1">
                {tenantSettings?.name || 'Tenant'} Settings
              </h2>
              <p className="text-sm text-gray-400 mb-6">Configure settings for your organization.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session report CC emails (comma-separated)
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
                  disabled={saving || !tenantSettings}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
                >
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tiers tab */}
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
                        <button
                          onClick={() => setEditingTier({ ...t })}
                          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                        >
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
      </div>

      {/* Edit user modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
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
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={editingUser.essays_enabled_override ?? false}
                    onChange={e => setEditingUser({ ...editingUser, essays_enabled_override: e.target.checked })}
                  />
                  Essays enabled override
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={editingUser.plans_enabled_override ?? false}
                    onChange={e => setEditingUser({ ...editingUser, plans_enabled_override: e.target.checked })}
                  />
                  Plans enabled override
                </label>
              </div>
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

      {/* Edit tier modal */}
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
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={editingTier.can_use_essays}
                    onChange={e => setEditingTier({ ...editingTier, can_use_essays: e.target.checked })}
                  />
                  Essays
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={editingTier.can_use_plans}
                    onChange={e => setEditingTier({ ...editingTier, can_use_plans: e.target.checked })}
                  />
                  Plans module
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveTier}
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {saving ? 'Saving…' : 'Save tier'}
              </button>
              <button
                onClick={() => setEditingTier(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
