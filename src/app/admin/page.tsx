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
  editate_enabled: boolean | null
  editate_review_limit: number | null
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
  display_name: string
  subdomain: string
  plan: string | null
  bot_name: string | null
  tagline: string | null
  header_logo_url: string | null
  primary_color: string | null
  header_color: string | null
  accent_color: string | null
  custom_instructions: string | null
  is_active: boolean
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

interface TenantFormData {
  subdomain: string
  display_name: string
  plan: string
  bot_name: string
  tagline: string
  header_logo_url: string
  primary_color: string
  header_color: string
  accent_color: string
  custom_instructions: string
  is_active: boolean
}

const BLANK_TENANT: TenantFormData = {
  subdomain: '',
  display_name: '',
  plan: 'counselor_starter',
  bot_name: 'Soar',
  tagline: 'Your AI-powered college and career planning assistant.',
  header_logo_url: '',
  primary_color: '#0369a1',
  header_color: '#0c1b33',
  accent_color: '#c2410c',
  custom_instructions: '',
  is_active: true,
}

const STARTER_PROMPT = `I run a college counseling practice called [PRACTICE NAME]. Help me write a 2–3 paragraph context description for an AI college and career planning assistant that will work with my students. It should capture: our counseling philosophy, the types of students we work with, any geographic or school-type focus, and anything that makes our practice distinctive. Keep it concise and written in second person addressed to the AI ("You are a college research assistant for…"). Ask me questions first to help create it.`

type TabType = 'users' | 'tiers' | 'tenants' | 'tenant'

const PAGE_SIZE = 25

/** Normalise a hex color input to #rrggbb. Accepts with/without #, 6 or 8 chars. */
function normalizeColor(raw: string): string {
  const s = raw.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{8}$/.test(s)) return '#' + s.slice(0, 6) // strip alpha
  if (/^[0-9a-fA-F]{6}$/.test(s)) return '#' + s
  return raw.trim() // return as-is; invalid values ignored by backend
}

/** Tiny inline color swatch — only renders if value is valid hex */
function ColorSwatch({ value }: { value: string }) {
  const n = normalizeColor(value)
  if (!/^#[0-9a-fA-F]{6}$/.test(n)) return null
  return (
    <span
      className="inline-block w-5 h-5 rounded border border-gray-200 flex-shrink-0"
      style={{ backgroundColor: n }}
      title={n}
    />
  )
}

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
  const [userPage, setUserPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortCol, setSortCol] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
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

  // Create / Edit tenant modal
  const [tenantModalOpen, setTenantModalOpen] = useState(false)
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null)
  const [tenantForm, setTenantForm] = useState<TenantFormData>(BLANK_TENANT)
  const [tenantFormMsg, setTenantFormMsg] = useState('')

  // Delete tenant
  const [deletingTenant, setDeletingTenant] = useState<TenantRow | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')

  // Pending role change waiting for confirmation
  const [pendingFlag, setPendingFlag] = useState<{
    userId: number
    email: string
    flag: 'admin' | 'super-admin' | 'tenant-admin'
    value: boolean
    confirmInput: string
  } | null>(null)

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

  // Reset to page 1 when search or filter changes
  useEffect(() => { setUserPage(1) }, [search, typeFilter])

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
          editate_enabled: editingUser.editate_enabled ?? false,
          editate_review_limit: editingUser.editate_review_limit,
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

  const requestToggleFlag = (userId: number, email: string, flag: 'admin' | 'super-admin' | 'tenant-admin', value: boolean) => {
    setPendingFlag({ userId, email, flag, value, confirmInput: '' })
  }

  const confirmToggleFlag = async () => {
    if (!pendingFlag) return
    const { userId, email, flag, value } = pendingFlag
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

  const openCreateTenant = () => {
    setTenantForm(BLANK_TENANT)
    setEditingTenantId(null)
    setTenantFormMsg('')
    setTenantModalOpen(true)
  }

  const openEditTenant = (t: TenantRow) => {
    setTenantForm({
      subdomain: t.subdomain,
      display_name: t.display_name,
      plan: t.plan || 'counselor_starter',
      bot_name: t.bot_name || 'Soar',
      tagline: t.tagline || '',
      header_logo_url: t.header_logo_url || '',
      primary_color: t.primary_color || '#0369a1',
      header_color: t.header_color || '#0c1b33',
      accent_color: t.accent_color || '#c2410c',
      custom_instructions: t.custom_instructions || '',
      is_active: t.is_active,
    })
    setEditingTenantId(t.id)
    setTenantFormMsg('')
    setTenantModalOpen(true)
  }

  const saveTenantForm = async () => {
    if (!tenantForm.subdomain || !tenantForm.display_name) {
      setTenantFormMsg('Subdomain and display name are required.')
      return
    }
    setSaving(true)
    try {
      const token = await getToken()
      const payload = {
        ...tenantForm,
        primary_color: normalizeColor(tenantForm.primary_color),
        header_color: normalizeColor(tenantForm.header_color),
        accent_color: normalizeColor(tenantForm.accent_color),
        header_logo_url: tenantForm.header_logo_url.trim() || null,
        custom_instructions: tenantForm.custom_instructions.trim() || null,
      }
      const isEdit = editingTenantId !== null
      const res = await fetch(
        isEdit ? `${apiUrl}/admin/tenants/${editingTenantId}` : `${apiUrl}/admin/tenants`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      )
      if (res.ok) {
        setTenantModalOpen(false)
        setSaveMsg(isEdit ? 'Tenant updated!' : 'Tenant created!')
        setTimeout(() => setSaveMsg(''), 3000)
        load()
      } else {
        const err = await res.json()
        setTenantFormMsg(err.detail || 'Error saving tenant.')
      }
    } catch { setTenantFormMsg('Error saving tenant.') }
    setSaving(false)
  }

  const openDeleteTenant = async (t: TenantRow) => {
    setDeleteConfirmInput('')
    // Fetch fresh tenant list so user_count is current, not cached
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const fresh: TenantRow[] = await res.json()
        setTenants(fresh)
        const freshTenant = fresh.find(r => r.id === t.id)
        setDeletingTenant(freshTenant ?? t)
        return
      }
    } catch { /* fall through to cached value */ }
    setDeletingTenant(t)
  }

  const confirmDeleteTenant = async () => {
    if (!deletingTenant) return
    if (deleteConfirmInput.trim().toLowerCase() !== deletingTenant.display_name.toLowerCase()) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/admin/tenants/${deletingTenant.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setTenants(prev => prev.filter(t => t.id !== deletingTenant.id))
        setDeletingTenant(null)
        setDeleteConfirmInput('')
        setSaveMsg('Tenant deleted.')
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        const err = await res.json()
        setSaveMsg(err.detail || 'Error deleting tenant.')
        setTimeout(() => setSaveMsg(''), 5000)
        setDeletingTenant(null)
      }
    } catch { setSaveMsg('Error deleting tenant.') }
    setSaving(false)
  }

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setUserPage(1)
  }

  const sortIndicator = (col: string) =>
    sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const filteredUsers = users
    .filter(u =>
      (typeFilter === 'all' || u.account_type === typeFilter) &&
      (!search ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.organization?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortCol) {
        case 'name':  av = (a.full_name || a.email).toLowerCase(); bv = (b.full_name || b.email).toLowerCase(); break
        case 'type':  av = a.account_type; bv = b.account_type; break
        case 'tier':  av = (a.tier_display_name || a.tier || '').toLowerCase(); bv = (b.tier_display_name || b.tier || '').toLowerCase(); break
        case 'limit': av = a.monthly_message_limit ?? 999999; bv = b.monthly_message_limit ?? 999999; break
        case 'used':  av = a.messages_used; bv = b.messages_used; break
        default: return 0
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const pagedUsers = filteredUsers.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE)

  // Counselors in this tenant for the My Practice / Tenant Settings tab
  const tenantCounselors = users.filter(u =>
    u.account_type === 'counselor' && u.tenant_id === tenantSettings?.id
  )

  // Counselor/practice tiers for the tenant plan dropdown.
  // These are the B2B tiers (is_b2b = true in DB). Pulled dynamically from loaded tiers if
  // available; hardcoded slugs as fallback so the form always renders.
  const B2B_TIER_SLUGS = ['counselor_starter', 'solo', 'practice', 'school', 'enterprise']
  const counselorTierOptions: Array<{ name: string; display_name: string }> = tiers.length > 0
    ? tiers.filter(t => B2B_TIER_SLUGS.includes(t.name))
    : B2B_TIER_SLUGS.map(s => ({ name: s, display_name: s }))

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
      <div className="bg-[#0c1b33] text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold"><span className="text-sky-300">Soar</span> Admin</h1>
          <p className="text-xs text-slate-400 mt-0.5">{roleLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          {saveMsg && <span className="text-sm text-green-400">{saveMsg}</span>}
          <Link href="/chat" className="text-sm text-slate-400 hover:text-white">← Back to chat</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(isAdmin || isSuperAdmin || isTenantAdmin) && (
            <button onClick={() => setTab('users')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Users ({users.length})
            </button>
          )}
          {isSuperAdmin && (
            <button onClick={() => setTab('tiers')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'tiers' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Tiers ({tiers.length})
            </button>
          )}
          {isSuperAdmin && (
            <button onClick={() => setTab('tenants')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'tenants' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Tenants ({tenants.length})
            </button>
          )}
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
            <div className="mb-4 flex gap-3 items-center flex-wrap">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or org…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:border-indigo-400"
              />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white"
              >
                <option value="all">All types</option>
                <option value="student">Students</option>
                <option value="parent">Parents</option>
                <option value="counselor">Counselors</option>
              </select>
              <span className="text-sm text-gray-400">{filteredUsers.length} users</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[['name','User','left',''],['type','Type','left','hidden sm:table-cell'],['tier','Tier / Role','left',''],['limit','Msg limit','right','hidden sm:table-cell'],['used','Used','right','']].map(([col, label, align, responsive]) => (
                      <th key={col} onClick={() => toggleSort(col)}
                        className={`px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none text-${align} ${responsive}`}>
                        {label}{sortIndicator(col)}
                      </th>
                    ))}
                    <th className="hidden md:table-cell text-right px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Overrides</th>
                    <th className="px-2 py-2 sm:px-4 sm:py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
                        <p className="font-medium text-gray-800">{u.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                        {u.organization && <p className="text-xs text-gray-400">{u.organization}</p>}
                        {u.tenant_name && <p className="text-xs text-indigo-400">{u.tenant_name}</p>}
                      </td>
                      <td className="hidden sm:table-cell px-2 py-2 sm:px-4 sm:py-3 text-gray-600 capitalize">{u.account_type}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
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
                      <td className="hidden sm:table-cell px-2 py-2 sm:px-4 sm:py-3 text-right text-gray-600">
                        {u.monthly_message_limit === null ? '∞' : u.monthly_message_limit ?? '—'}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-gray-600">{u.messages_used}</td>
                      <td className="hidden md:table-cell px-2 py-2 sm:px-4 sm:py-3 text-right text-xs text-gray-400">
                        {[
                          u.history_retention_days_override != null && `hist:${u.history_retention_days_override}d`,
                          u.essays_enabled_override != null && `essays:${u.essays_enabled_override}`,
                          u.plans_enabled_override != null && `plans:${u.plans_enabled_override}`,
                          u.max_students_override != null && `maxStu:${u.max_students_override}`,
                        ].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
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
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-400">
                  Page {userPage} of {totalPages} · {filteredUsers.length} users
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
                    disabled={userPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tiers tab ── */}
        {tab === 'tiers' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="text-right px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Msg/mo</th>
                    <th className="hidden sm:table-cell text-right px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">History</th>
                    <th className="text-right px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Max Stu</th>
                    <th className="text-center px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Essays</th>
                    <th className="text-center px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plans</th>
                    <th className="px-2 py-2 sm:px-4 sm:py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tiers.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
                        <p className="font-medium text-gray-800">{t.display_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{t.name}</p>
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-gray-600">{t.monthly_message_limit ?? '∞'}</td>
                      <td className="hidden sm:table-cell px-2 py-2 sm:px-4 sm:py-3 text-right text-gray-600">{t.history_retention_days ? `${t.history_retention_days}d` : '∞'}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-gray-600">{t.max_students ?? '∞'}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center">{t.can_use_essays ? '✓' : '—'}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center">{t.can_use_plans ? '✓' : '—'}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
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
                onClick={openCreateTenant}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                + New Tenant
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                    <th className="text-left px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subdomain</th>
                    <th className="text-left px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="text-right px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Users</th>
                    <th className="text-right px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"><span className="hidden sm:inline">AI queries (mo)</span><span className="sm:hidden">AI/mo</span></th>
                    <th className="hidden sm:table-cell text-right px-2 py-2 sm:px-4 sm:py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-2 py-2 sm:px-4 sm:py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tenants.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
                        <p className="font-medium text-gray-800">{t.display_name}</p>
                        {!t.is_active && <span className="text-xs text-gray-400">inactive</span>}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-gray-500 font-mono text-xs">{t.subdomain}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                          {tiers.find(r => r.name === t.plan)?.display_name || t.plan || '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-gray-600">{t.user_count}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-gray-600">{t.ai_queries_this_month}</td>
                      <td className="hidden sm:table-cell px-2 py-2 sm:px-4 sm:py-3 text-right text-gray-400 text-xs">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEditTenant(t)}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteTenant(t)}
                            className="text-xs text-red-400 hover:text-red-600 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tenant Settings / My Practice tab ── */}
        {tab === 'tenant' && (
          <div className="max-w-xl space-y-6">
            {/* CC emails card */}
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

            {/* Counselors card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-1">Counselors</h2>
              <p className="text-sm text-gray-400 mb-4">Coaches in your organization.</p>
              {tenantCounselors.length === 0 ? (
                <p className="text-sm text-gray-400">No counselors found.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {tenantCounselors.map(u => (
                    <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{u.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                        {u.organization && <p className="text-xs text-gray-400">{u.organization}</p>}
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-3">
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                            {u.tier_display_name || u.tier || 'free'}
                          </span>
                          {u.is_tenant_admin && (
                            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700">admin</span>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{u.messages_used} msgs used</p>
                        </div>
                        {(isAdmin || isSuperAdmin) && (
                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  placeholder="e.g. student_plus, solo, practice, school"
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

              {/* Editate section */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Editate (Essay Review)</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingUser.editate_enabled ?? false}
                      onChange={e => setEditingUser({ ...editingUser, editate_enabled: e.target.checked })}
                    />
                    Editate enabled (student can access Editate link &amp; drafts)
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Feedback rounds included <span className="text-gray-400 font-normal">(can only increase)</span>
                    </label>
                    <input
                      type="number"
                      min={editingUser.editate_review_limit ?? 0}
                      value={editingUser.editate_review_limit ?? ''}
                      onChange={e => setEditingUser({ ...editingUser, editate_review_limit: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="0 = no limit shown"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
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
                        Type the user&apos;s email to confirm
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

      {/* ── Create / Edit tenant modal ── */}
      {tenantModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-800 mb-5">
              {editingTenantId !== null ? 'Edit Tenant' : 'New Tenant'}
            </h3>
            {tenantFormMsg && (
              <p className={`text-sm mb-3 ${tenantFormMsg.toLowerCase().includes('error') || tenantFormMsg.includes('required') ? 'text-red-500' : 'text-green-600'}`}>
                {tenantFormMsg}
              </p>
            )}
            <div className="space-y-4">
              {/* Display name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display name <span className="text-red-400">*</span></label>
                <input
                  value={tenantForm.display_name}
                  onChange={e => setTenantForm({ ...tenantForm, display_name: e.target.value })}
                  placeholder="e.g. Bright Futures Counseling"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              {/* Subdomain */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subdomain <span className="text-red-400">*</span></label>
                <input
                  value={tenantForm.subdomain}
                  onChange={e => setTenantForm({ ...tenantForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="e.g. brightfutures"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-400"
                />
                <p className="text-[10px] text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
              </div>
              {/* Plan */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                <select
                  value={tenantForm.plan}
                  onChange={e => setTenantForm({ ...tenantForm, plan: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  {counselorTierOptions.map(t => (
                    <option key={t.name} value={t.name}>{t.display_name}</option>
                  ))}
                </select>
              </div>
              {/* Bot name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">AI assistant name</label>
                <input
                  value={tenantForm.bot_name}
                  onChange={e => setTenantForm({ ...tenantForm, bot_name: e.target.value })}
                  placeholder="e.g. Soar"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              {/* Tagline */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tagline</label>
                <input
                  value={tenantForm.tagline}
                  onChange={e => setTenantForm({ ...tenantForm, tagline: e.target.value })}
                  placeholder="e.g. Your AI-powered college and career planning assistant."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              {/* Header logo URL */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Header logo URL</label>
                <input
                  value={tenantForm.header_logo_url}
                  onChange={e => setTenantForm({ ...tenantForm, header_logo_url: e.target.value })}
                  placeholder="https://…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              {/* Brand colors */}
              <div className="grid grid-cols-3 gap-3">
                {(['primary_color', 'header_color', 'accent_color'] as const).map(field => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {field === 'primary_color' ? 'Primary' : field === 'header_color' ? 'Header' : 'Accent'} color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={tenantForm[field]}
                        onChange={e => setTenantForm({ ...tenantForm, [field]: e.target.value })}
                        placeholder="#0369a1"
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm font-mono focus:outline-none focus:border-indigo-400"
                      />
                      <ColorSwatch value={tenantForm[field]} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">6 or 8 hex digits, # optional</p>
                  </div>
                ))}
              </div>
              {/* Active */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tenantForm.is_active}
                    onChange={e => setTenantForm({ ...tenantForm, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              {/* Custom instructions */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">AI context / custom instructions</label>
                <textarea
                  value={tenantForm.custom_instructions}
                  onChange={e => setTenantForm({ ...tenantForm, custom_instructions: e.target.value })}
                  placeholder="You are a college and career planning assistant for…"
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-y"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This text shapes how the AI introduces itself and responds to students. It can include your practice&apos;s philosophy, focus areas, and anything specific to your students.
                </p>
                <details className="mt-2">
                  <summary className="text-xs text-indigo-500 cursor-pointer hover:text-indigo-700 select-none">
                    Need help writing this? →
                  </summary>
                  <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Paste this prompt into Claude, ChatGPT, or Google Gemini:</p>
                    <pre className="whitespace-pre-wrap font-sans text-[11px] text-gray-600 bg-white border border-gray-200 rounded p-2 leading-relaxed">{STARTER_PROMPT}</pre>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(STARTER_PROMPT)}
                      className="mt-1.5 text-indigo-500 hover:text-indigo-700 text-[11px] font-medium"
                    >
                      Copy prompt
                    </button>
                  </div>
                </details>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveTenantForm}
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {saving ? 'Saving…' : editingTenantId !== null ? 'Save changes' : 'Create tenant'}
              </button>
              <button
                onClick={() => { setTenantModalOpen(false); setTenantFormMsg('') }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete tenant confirmation modal ── */}
      {deletingTenant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Delete Tenant</h3>
            <p className="text-sm text-gray-500 mb-3">{deletingTenant.display_name}</p>

            {deletingTenant.user_count > 0 ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                  <p className="text-sm text-red-700 font-medium">
                    Cannot delete — tenant has {deletingTenant.user_count} active user{deletingTenant.user_count !== 1 ? 's' : ''}.
                  </p>
                  <p className="text-xs text-red-500 mt-1">Remove or reassign all users before deleting this tenant.</p>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Need help? Contact <a href="mailto:help@lifelaunchr.com" className="text-indigo-500 hover:underline">help@lifelaunchr.com</a>.
                </p>
                <button
                  onClick={() => { setDeletingTenant(null); setDeleteConfirmInput('') }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-4">
                  This action is permanent and cannot be undone. Type the tenant name to confirm.
                </p>
                <input
                  autoFocus
                  type="text"
                  value={deleteConfirmInput}
                  onChange={e => setDeleteConfirmInput(e.target.value)}
                  placeholder={deletingTenant.display_name}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-red-400"
                />
                <div className="flex gap-3">
                  <button
                    onClick={confirmDeleteTenant}
                    disabled={saving || deleteConfirmInput.trim().toLowerCase() !== deletingTenant.display_name.toLowerCase()}
                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                  >
                    {saving ? 'Deleting…' : 'Delete tenant'}
                  </button>
                  <button
                    onClick={() => { setDeletingTenant(null); setDeleteConfirmInput('') }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
