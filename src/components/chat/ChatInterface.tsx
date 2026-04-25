'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChatHeader } from './ChatHeader'
import { ChatMessage } from './ChatMessage'
import { ModuleChips } from './ModuleChips'
import { WelcomeCard } from './WelcomeCard'
import { LimitModal } from './LimitModal'
import SessionsHelpModal from './SessionsHelpModal'
import SafetyEventModal, { SafetyStudent } from '@/components/safety/SafetyEventModal'

export interface MessageDownload {
  filename: string
  content: string
  label: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  downloads?: MessageDownload[]
}

interface HistoryItem {
  role: string
  content: string
}

interface UsageData {
  user_id?: number
  messages_used: number
  effective_limit: number | null
  reset_date?: string
  account_type?: string
  display_plan?: string
  breakdown?: string
  can_use_essays?: boolean
  can_use_plans?: boolean
  history_retention_days?: number | null
  students_count?: number
  max_students?: number
  active_students?: number | null
  student_limit?: number | null
  is_admin?: boolean
  is_tenant_admin?: boolean
  scheduling_link?: string | null
  essays_module?: boolean      // essay prompts available (any tenant with module)
  editate_available?: boolean  // editate link + drafts (LifeLaunchr + editate_enabled)
  sessions_used?: number          // caller's own pool — always present
  session_limit?: number | null
  session_reset_date?: string | null
  first_session_completed?: boolean
  beneficiary?: {
    user_id: number
    full_name?: string | null
    email?: string | null
    sessions_used: number
    session_limit: number
    session_reset_date?: string | null
    contributors?: Array<{
      role: 'student' | 'parent' | 'counselor'
      full_name?: string | null
      email?: string | null
      contribution: number
    }>
  } | null
}

interface LimitReachedData {
  messages_used: number
  effective_limit: number
  reset_date?: string
  is_session_limit?: boolean
}

interface Session {
  id: number
  title: string
  last_active_at: string
  active_topics?: string[]
}

interface ChatInterfaceProps {
  userId: string | null
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ChatInterface({ userId: serverUserId }: ChatInterfaceProps) {
  const { getToken, userId: clerkUserId, isLoaded } = useAuth()
  // Prefer client-side Clerk state over server prop — reacts immediately to sign-out
  const userId = clerkUserId ?? serverUserId
  const { user: clerkUser } = useUser()
  const searchParams = useSearchParams()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Strip any DB-only fields (created_at etc.) — Claude API only accepts {role, content}
  const toHistory = (items: Array<{ role: string; content: string; [k: string]: unknown }>) =>
    items.map(({ role, content }) => ({ role, content }))

  const [messages, setMessages] = useState<Message[]>([])
  const [conversationHistory, setConversationHistory] = useState<HistoryItem[]>([])
  const [serverSessionId, setServerSessionId] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [guestToken, setGuestToken] = useState<string | null>(null)
  const [activeModules, setActiveModules] = useState<string[]>([])
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768
  )
  const [limitModalData, setLimitModalData] = useState<LimitReachedData | null>(null)
  const [currentResearchSessionId, setCurrentResearchSessionId] = useState<number | null>(null)
  const [showNewSessionBanner, setShowNewSessionBanner] = useState(false)
  const [showSessionsHelp, setShowSessionsHelp] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [summaryToast, setSummaryToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [showSummaryConfirm, setShowSummaryConfirm] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [isCounselor, setIsCounselor] = useState(false)
  const [isParent, setIsParent] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [myStudents, setMyStudents] = useState<Array<{ id: number; full_name: string; email: string; has_safety_flag?: boolean }>>([])
  const [safetyStudent, setSafetyStudent] = useState<SafetyStudent | null>(null)
  const [tenantBranding, setTenantBranding] = useState<{ botName: string; tagline: string; logoUrl: string | null; supportEmail: string }>({
    botName: 'Soar',
    tagline: 'Your AI-powered college advisor',
    logoUrl: null,
    supportEmail: 'help@lifelaunchr.com',
  })
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [schedulingLink, setSchedulingLink] = useState<string | null>(null)
  const [forStudentId, setForStudentId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem('ll_for_student_id')
    return saved ? parseInt(saved, 10) : null
  })
  const [addingToList, setAddingToList] = useState<string | null>(null)
  const [addedToListToast, setAddedToListToast] = useState<string | null>(null)
  const [addingToScholarshipList, setAddingToScholarshipList] = useState<string | null>(null)
  const [addingToEnrichmentList, setAddingToEnrichmentList] = useState<string | null>(null)
  const [myConnections, setMyConnections] = useState<{
    counselors: Array<{ id: number; full_name: string; email: string; organization?: string }>
    parents: Array<{ id: number; full_name: string; email: string }>
  } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const onboardingAutoSentRef = useRef(false)
  const prevUserIdRef = useRef<string | null>(null)

  // Clear stale state when the signed-in user changes (e.g. log out → log in as someone else).
  // Without this, the previous user's usage data, student list, and sessions bleed into the
  // new session and 401-retried fetches overwrite them with wrong data.
  useEffect(() => {
    if (!isLoaded) return
    const prev = prevUserIdRef.current
    const curr = userId ?? null
    if (prev !== null && prev !== curr) {
      // User switched — wipe all auth-scoped state before new fetches fire
      setUsageData(null)
      setMyStudents([])
      setSessions([])
      setMessages([])
      setConversationHistory([])
      setServerSessionId(null)
      setActiveSessionId(null)
      setIsCounselor(false)
      setIsParent(false)
      setIsAdmin(false)
      setMyConnections(null)
      setInviteUrl(null)
      setSchedulingLink(null)
      setCurrentResearchSessionId(null)
    }
    prevUserIdRef.current = curr
  }, [isLoaded, userId])

  // Fetch tenant branding on mount (public endpoint, no auth required)
  useEffect(() => {
    fetch(`${apiUrl}/tenant-config`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setTenantBranding({
            botName: data.bot_name || 'Soar',
            tagline: data.tagline || 'Your AI-powered college advisor',
            logoUrl: data.header_logo_url || null,
            supportEmail: data.support_email || 'help@lifelaunchr.com',
          })
        }
      })
      .catch(() => {/* keep defaults */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Guest token initialization
  useEffect(() => {
    if (!userId) {
      let token = localStorage.getItem('ll_guest_token')
      if (!token) {
        token = crypto.randomUUID()
        localStorage.setItem('ll_guest_token', token)
      }
      setGuestToken(token)
    }
  }, [userId])

  // Fetch usage + session list for authenticated users
  const fetchUsage = useCallback(async () => {
    if (!userId) return
    try {
      const token = await getToken()
      const qs = forStudentId ? `?for_student_id=${forStudentId}` : ''
      const res = await fetch(`${apiUrl}/my-usage${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log('[fetchUsage] /my-usage status:', res.status)
      if (res.ok) {
        const data = await res.json()
        console.log('[fetchUsage] account_type:', data.account_type, 'user_id:', data.user_id)
        setUsageData(data)

        const accountType = data.account_type ?? 'student'
        const counselor = accountType === 'counselor'
        const parent = accountType === 'parent'
        setIsCounselor(counselor)
        setIsParent(parent)
        setIsAdmin(!!data.is_admin)
        if (!counselor && !parent && data.scheduling_link) {
          setSchedulingLink(data.scheduling_link)
        }

        // Invite link — available to everyone
        const inviteRes = await fetch(`${apiUrl}/my-invite`, { headers: { Authorization: `Bearer ${token}` } })
        if (inviteRes.ok) {
          const inv = await inviteRes.json()
          const frontendBase = typeof window !== 'undefined' ? window.location.origin : ''
          setInviteUrl(`${frontendBase}/join?code=${inv.token}`)
        }

        // Student list — counselors and parents only
        if (counselor || parent) {
          const studentsRes = await fetch(`${apiUrl}/my-students`, { headers: { Authorization: `Bearer ${token}` } })
          console.log('[fetchUsage] /my-students status:', studentsRes.status)
          if (studentsRes.ok) {
            const students = await studentsRes.json()
            console.log('[fetchUsage] students returned:', students.length)
            setMyStudents(students.map((s: { id: number; full_name: string; email: string; has_safety_flag?: boolean }) => ({ id: s.id, full_name: s.full_name, email: s.email, has_safety_flag: s.has_safety_flag })))
          }
        }
      }
    } catch (err) {
      console.error('[fetchUsage] error:', err)
    }
  }, [userId, getToken, apiUrl, forStudentId])

  const fetchSessions = useCallback(async () => {
    if (!userId) return
    try {
      const token = await getToken()
      // Three cases:
      // 1. Counselor/parent has a student selected → all sessions for that student (shared view)
      // 2. Student viewing their own research → all sessions for themselves, including those
      //    conducted by their counselors/parents (shared view using their own DB user ID)
      // 3. Counselor/parent with no student selected → their own unscoped sessions only
      let url: string
      if (forStudentId) {
        url = `${apiUrl}/sessions?for_student_id=${forStudentId}`
      } else if (!isCounselor && !isParent && usageData?.user_id) {
        url = `${apiUrl}/sessions?for_student_id=${usageData.user_id}`
      } else {
        url = `${apiUrl}/sessions?unscoped=1`
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch { /* silently ignore */ }
  }, [userId, getToken, apiUrl, forStudentId, isCounselor, isParent, usageData])

  // Auth sync — ensure user exists in our DB so profile/lists work.
  // Also claims any guest sessions from localStorage so history/usage carry over.
  // IMPORTANT: fetchUsage() is called AFTER sync completes so that /my-usage sees
  // the correct clerk_user_id (auth/sync may have just reconnected it). Without this,
  // counselor accounts whose Clerk ID was recreated would appear as students because
  // /my-usage ran before the DB row was updated.
  useEffect(() => {
    if (!isLoaded || !userId || !clerkUser) return
    const sync = async () => {
      try {
        const token = await getToken()
        await fetch(`${apiUrl}/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            clerk_user_id: userId,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            full_name: clerkUser.fullName || clerkUser.firstName || '',
            account_type: 'student',
          }),
        })
        // Claim any sessions the user had as a guest before signing in.
        // This transfers usage count + history to their real account.
        const guestTok = localStorage.getItem('ll_guest_token')
        if (guestTok) {
          await fetch(`${apiUrl}/sessions/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ guest_token: guestTok }),
          })
          // Remove the guest token — they're a real user now
          localStorage.removeItem('ll_guest_token')
          setGuestToken(null)
        }
      } catch { /* ignore */ }
      // Re-fetch usage after sync so account_type is always correct
      fetchUsage()
    }
    sync()
  }, [isLoaded, userId, clerkUser, getToken, apiUrl, fetchUsage])

  useEffect(() => {
    if (!isLoaded) return
    fetchUsage()
    fetchSessions()
  }, [isLoaded, fetchUsage, fetchSessions])

  // Fetch student's linked counselors/parents (students only — others get empty arrays)
  useEffect(() => {
    if (!isLoaded || !userId) return
    const fetchConnections = async () => {
      try {
        const token = await getToken()
        const res = await fetch(`${apiUrl}/my-connections`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setMyConnections(data)
        }
      } catch { /* silently ignore */ }
    }
    fetchConnections()
  }, [isLoaded, userId, getToken, apiUrl])

  // Auto-select the student when a parent has exactly one connected student.
  // Also clears a stale forStudentId if the saved student is no longer connected.
  useEffect(() => {
    if (!isParent || myStudents.length === 0) return
    const savedIsValid = forStudentId !== null && myStudents.some(s => s.id === forStudentId)
    if (!savedIsValid) {
      if (myStudents.length === 1) {
        // Auto-select the only student
        const s = myStudents[0]
        setForStudentId(s.id)
        localStorage.setItem('ll_for_student_id', String(s.id))
      } else {
        // Multiple students and no valid selection — clear the stale value
        setForStudentId(null)
        localStorage.removeItem('ll_for_student_id')
      }
    }
  }, [isParent, myStudents, forStudentId])

  // ── Onboarding auto-select: if counselor just invited a student, select them ──
  useEffect(() => {
    const studentId = sessionStorage.getItem('onboarding_for_student_id')
    if (!studentId) return
    sessionStorage.removeItem('onboarding_for_student_id')
    const id = parseInt(studentId, 10)
    if (!isNaN(id)) {
      setForStudentId(id)
      localStorage.setItem('ll_for_student_id', String(id))
    }
  }, [])

  // Auto-scroll to bottom (only when there are messages — don't scroll the welcome card)
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const toggleModule = useCallback((module: string) => {
    setActiveModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    )
  }, [])

  const handleNewConversation = useCallback(() => {
    // Proactive limit wall: clicking "+ New session" is an explicit signal
    // of intent. If the relevant pool (beneficiary's if a student is
    // selected, otherwise the caller's own) is already at limit, show the
    // upgrade modal instead of clearing — typing would just hit the same
    // wall on the first message anyway.
    if (usageData) {
      if (forStudentId && usageData.beneficiary) {
        const ben = usageData.beneficiary
        if (ben.session_limit != null && ben.sessions_used >= ben.session_limit) {
          setLimitModalData({
            messages_used: ben.sessions_used,
            effective_limit: ben.session_limit,
            reset_date: undefined,
            is_session_limit: true,
          })
          return
        }
      } else if (usageData.session_limit != null && (usageData.sessions_used ?? 0) >= usageData.session_limit) {
        setLimitModalData({
          messages_used: usageData.sessions_used ?? 0,
          effective_limit: usageData.session_limit,
          reset_date: undefined,
          is_session_limit: true,
        })
        return
      }
    }
    if (abortControllerRef.current) abortControllerRef.current.abort()
    // Just clear local state — the next message will create a fresh
    // chat_session row, and chat-scoped detection on the backend will
    // open a new research_session for it (no chat_session_id match →
    // INSERT path → counter bumps). The previous chat's research_session
    // stays open, so toggling back to it continues that session.
    setMessages([])
    setConversationHistory([])
    setServerSessionId(null)
    setActiveSessionId(null)
    setCurrentResearchSessionId(null)
    setInput('')
    setIsStreaming(false)
    setStreamingMessageId(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [usageData, forStudentId])

  const handleGenerateSummary = useCallback(async () => {
    if (!currentResearchSessionId || generatingSummary) return
    setGeneratingSummary(true)
    setSummaryToast(null)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/research-sessions/${currentResearchSessionId}/generate-summary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({ detail: 'Failed to generate summary' }))
        setSummaryToast({ kind: 'error', text: detail.detail || 'Failed to generate summary' })
      } else {
        setSummaryToast({ kind: 'success', text: 'Summary generated ✓' })
      }
    } catch {
      setSummaryToast({ kind: 'error', text: 'Network error generating summary' })
    } finally {
      setGeneratingSummary(false)
      setShowSummaryConfirm(false)
      setTimeout(() => setSummaryToast(null), 4000)
    }
  }, [currentResearchSessionId, generatingSummary, getToken, apiUrl])

  const loadSession = useCallback(async (sessionId: number) => {
    try {
      const token = userId ? await getToken() : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      if (!token && guestToken) {
        // guest
      }
      const res = await fetch(`${apiUrl}/sessions/${sessionId}`, { headers })
      if (!res.ok) return
      const data = await res.json()
      const msgs: Message[] = (data.messages || []).map((m: HistoryItem) => ({
        id: crypto.randomUUID(),
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      setMessages(msgs)
      setConversationHistory(toHistory(data.messages || []))
      setServerSessionId(sessionId)
      setActiveSessionId(sessionId)
      setCurrentResearchSessionId(data.research_session_id ?? null)
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch { /* silently ignore */ }
  }, [userId, getToken, guestToken, apiUrl])

  // Auto-load a session from ?session=X query param (e.g. from reports page)
  useEffect(() => {
    const sessionParam = searchParams.get('session')
    if (sessionParam && userId) {
      const sid = parseInt(sessionParam, 10)
      if (!isNaN(sid)) {
        loadSession(sid)
      }
    }
  }, [searchParams, userId, loadSession])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed }
      const assistantMsgId = crypto.randomUUID()
      const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: '' }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreamingMessageId(assistantMsgId)
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      setIsStreaming(true)

      try {
        const token = userId ? await getToken() : null
        abortControllerRef.current = new AbortController()

        const response = await fetch(`${apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: trimmed,
            history: conversationHistory,
            ...(serverSessionId ? { session_id: serverSessionId } : {}),
            ...(guestToken && !userId ? { guest_token: guestToken } : {}),
            active_topics: activeModules,
            ...(forStudentId ? { for_student_id: forStudentId } : {}),
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errText = await response.text()
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `Error: ${response.status} — ${errText}` }
                : m
            )
          )
          setIsStreaming(false)
          setStreamingMessageId(null)
          return
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const rawData = line.slice(6).trim()
            if (!rawData || rawData === '[DONE]') continue

            try {
              const data = JSON.parse(rawData)

              if (data.type === 'text_start') {
                // First real token incoming — wipe status messages so text streams into a clean bubble
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: '' } : m
                  )
                )
              } else if (data.type === 'text') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + data.content }
                      : m
                  )
                )
              } else if (data.type === 'status') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content ? `${m.content}\n\n_${data.msg}_` : `_${data.msg}_` }
                      : m
                  )
                )
              } else if (data.type === 'done') {
                if (data.response) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: data.response } : m
                    )
                  )
                }
                if (data.history) setConversationHistory(toHistory(data.history))
                if (data.session_id) {
                  setServerSessionId(data.session_id)
                  setActiveSessionId(data.session_id)
                }
                if (data.messages_used !== undefined && data.effective_limit !== undefined) {
                  setUsageData((prev) => prev ? { ...prev, messages_used: data.messages_used, effective_limit: data.effective_limit } : null)
                }
                // Research session tracking
                if (data.research_session_id != null) {
                  // Trust the server's new_session flag — comparing against
                  // currentResearchSessionId here would read a stale closure
                  // value (it's not in sendMessage's useCallback deps).
                  const isNewRS = !!data.new_session
                  setCurrentResearchSessionId(data.research_session_id)
                  if (data.sessions_used !== undefined) {
                    // Route the increment to the right pool: if billed against
                    // the beneficiary (student), update usageData.beneficiary;
                    // otherwise update the caller's top-level fields. This keeps
                    // the top-bar (caller) and sidebar (beneficiary) in sync
                    // independently.
                    const billedBeneficiary = data.beneficiary_user_id != null && data.beneficiary_user_id !== data.user_id
                    setUsageData((prev) => {
                      if (!prev) return null
                      if (billedBeneficiary && prev.beneficiary && prev.beneficiary.user_id === data.beneficiary_user_id) {
                        return {
                          ...prev,
                          beneficiary: {
                            ...prev.beneficiary,
                            sessions_used: data.sessions_used,
                            session_limit: data.session_limit ?? prev.beneficiary.session_limit,
                          },
                        }
                      }
                      return {
                        ...prev,
                        sessions_used: data.sessions_used,
                        session_limit: data.session_limit ?? prev.session_limit,
                      }
                    })
                  }
                  if (isNewRS) {
                    setShowNewSessionBanner(true)
                    // Banner stays until dismissed or next message — don't auto-hide
                  }
                }
                // Mark first session as completed (fire-and-forget)
                if (userId && usageData && !usageData.first_session_completed) {
                  getToken().then(t =>
                    fetch(`${apiUrl}/users/me/first-session-completed`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${t}` },
                    })
                  ).catch(() => {})
                  setUsageData(prev => prev ? { ...prev, first_session_completed: true } : prev)
                }
                // Refresh session list after each message
                fetchSessions()
              } else if (data.type === 'session_limit_reached') {
                setLimitModalData({
                  messages_used: data.sessions_used,
                  effective_limit: data.session_limit,
                  reset_date: data.reset_date,
                  is_session_limit: true,
                })
                setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId))
              } else if (data.type === 'error') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: data.msg || 'Something went wrong. Please try again.' }
                      : m
                  )
                )
              } else if (data.type === 'limit_reached') {
                setLimitModalData({
                  messages_used: data.messages_used,
                  effective_limit: data.effective_limit,
                  reset_date: data.reset_date,
                })
                setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId))
              } else if (data.type === 'file_ready') {
                // Attach the download to the current assistant message
                const dl: MessageDownload = {
                  filename: data.filename,
                  content: data.content,
                  label: data.label,
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, downloads: [...(m.downloads ?? []), dl] }
                      : m
                  )
                )
              }
            } catch { /* skip malformed SSE lines */ }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User aborted — leave partial message as-is
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
                : m
            )
          )
        }
      } finally {
        setIsStreaming(false)
        setStreamingMessageId(null)
        abortControllerRef.current = null
      }
    },
    [isStreaming, userId, getToken, serverSessionId, conversationHistory, guestToken, activeModules, apiUrl, fetchSessions, forStudentId, usageData]
  )

  // ── Onboarding auto-send: fire the first question from the question picker ──
  useEffect(() => {
    if (onboardingAutoSentRef.current || !userId) return
    const question = sessionStorage.getItem('onboarding_first_question')
    if (!question) return

    // Delay to let forStudentId settle and UI render the welcome state
    const timer = setTimeout(() => {
      if (onboardingAutoSentRef.current) return
      onboardingAutoSentRef.current = true
      sessionStorage.removeItem('onboarding_first_question')
      sendMessage(question)
    }, 800)

    return () => clearTimeout(timer)
  }, [userId, sendMessage])

  const handleAddToList = useCallback(async (collegeName: string) => {
    if (!userId) return
    const studentId = forStudentId ?? usageData?.user_id
    if (!studentId) return
    setAddingToList(collegeName)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/lists/${studentId}/colleges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ college_name: collegeName }),
      })
      if (res.ok) {
        setAddedToListToast(`${collegeName} added to your research list!`)
        setTimeout(() => setAddedToListToast(null), 3500)
      } else {
        const err = await res.json().catch(() => ({}))
        setAddedToListToast(err.detail || 'Could not add college — please try again.')
        setTimeout(() => setAddedToListToast(null), 4000)
      }
    } catch {
      setAddedToListToast('Network error — please try again.')
      setTimeout(() => setAddedToListToast(null), 4000)
    } finally {
      setAddingToList(null)
    }
  }, [userId, forStudentId, usageData, getToken, apiUrl])

  const handleAddToScholarshipList = useCallback(async (scholarshipName: string) => {
    if (!userId) return
    const studentId = forStudentId ?? usageData?.user_id
    if (!studentId) return
    setAddingToScholarshipList(scholarshipName)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/lists/${studentId}/scholarships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scholarship_name: scholarshipName }),
      })
      if (res.ok) {
        setAddedToListToast(`${scholarshipName} added to your scholarship list!`)
        setTimeout(() => setAddedToListToast(null), 3500)
      } else {
        const err = await res.json().catch(() => ({}))
        setAddedToListToast(err.detail || 'Could not add scholarship — please try again.')
        setTimeout(() => setAddedToListToast(null), 4000)
      }
    } catch {
      setAddedToListToast('Network error — please try again.')
      setTimeout(() => setAddedToListToast(null), 4000)
    } finally {
      setAddingToScholarshipList(null)
    }
  }, [userId, forStudentId, usageData, getToken, apiUrl])

  const handleAddToEnrichmentList = useCallback(async (programName: string) => {
    if (!userId) return
    const studentId = forStudentId ?? usageData?.user_id
    if (!studentId) return
    setAddingToEnrichmentList(programName)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/lists/${studentId}/enrichment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ program_name: programName }),
      })
      const data = await res.json()
      if (res.ok) {
        setAddedToListToast(`${programName} added to your enrichment list!`)
      } else {
        setAddedToListToast(data.detail || 'Could not add program — please try again.')
      }
    } catch {
      setAddedToListToast('Could not add program — please try again.')
    } finally {
      setAddingToEnrichmentList(null)
      setTimeout(() => setAddedToListToast(null), 3500)
    }
  }, [userId, forStudentId, usageData, getToken, apiUrl])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Usage bar — guard against null effective_limit (unlimited plans)
  const usagePercent =
    usageData && usageData.effective_limit
      ? (usageData.messages_used / usageData.effective_limit) * 100
      : 0
  const usageColor =
    usagePercent >= 85
      ? 'text-red-500'
      : usagePercent >= 60
      ? 'text-amber-500'
      : 'text-gray-400'

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* New research session banner */}
      {showNewSessionBanner && (
        <div className="flex items-center justify-between bg-emerald-600 text-white text-sm px-4 py-2 flex-shrink-0 z-40">
          <span>
            ✦ New research session started — counts as 1 toward your limit.
            Follow-up questions in the next 60 minutes are free.
          </span>
          <button onClick={() => setShowNewSessionBanner(false)} className="text-white/70 hover:text-white ml-4">✕</button>
        </div>
      )}

      {/* Summary toast */}
      {summaryToast && (
        <div className={`flex items-center justify-between text-white text-sm px-4 py-2 flex-shrink-0 z-40 ${
          summaryToast.kind === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          <span>{summaryToast.text}</span>
          <button onClick={() => setSummaryToast(null)} className="text-white/70 hover:text-white ml-4">✕</button>
        </div>
      )}

      <ChatHeader
        userId={userId}
        onNewConversation={handleNewConversation}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sessionsUsed={usageData?.sessions_used}
        sessionLimit={usageData?.session_limit ?? null}
        onShowSessionsHelp={() => setShowSessionsHelp(true)}
        messagesUsed={usageData?.messages_used}
        effectiveLimit={usageData?.effective_limit ?? null}
        botName={tenantBranding.botName}
        tagline={tenantBranding.tagline}
        logoUrl={tenantBranding.logoUrl}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:relative inset-y-0 left-0 z-30
            bg-[#1a1a2e] text-slate-300 flex flex-col flex-shrink-0
            border-r border-white/10 transition-all duration-200 overflow-hidden
            ${sidebarOpen ? 'w-[85vw] max-w-[280px] md:w-[260px] md:max-w-none' : 'w-0'}
          `}
        >
          {/* New conversation button */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <button
              onClick={() => { handleNewConversation(); setSidebarOpen(window.innerWidth < 768 ? false : true) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
              </svg>
              + New research session
            </button>
          </div>

          {/* Research sessions label */}
          <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600 flex-shrink-0">
            Research sessions
          </div>

          {/* Session list — scrollable */}
          <div className="flex-1 overflow-y-auto py-1 min-h-0">
            {!userId ? (
              <p className="text-center text-slate-600 text-xs px-4 py-5">
                Sign in to save conversations.
              </p>
            ) : sessions.length === 0 ? (
              <p className="text-center text-slate-600 text-xs px-4 py-5">
                No past conversations yet.
              </p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { loadSession(s.id); setSidebarOpen(window.innerWidth < 768 ? false : true) }}
                  className={`w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${
                    activeSessionId === s.id ? 'bg-white/10' : ''
                  }`}
                >
                  <p className="text-xs text-slate-300 truncate leading-snug">
                    {s.title || 'Untitled conversation'}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {formatSessionDate(s.last_active_at)}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Bottom nav — pinned but scrollable when tall */}
          {userId && (
            <div className="border-t border-white/10 p-3 flex-shrink-0 flex flex-col gap-0.5 overflow-y-auto max-h-[60vh]">
              {/* Usage bar — sessions (primary) or messages (fallback) */}
              {userId && usageData && (usageData.session_limit != null || usageData.effective_limit != null) && (
                <div className="mb-2 px-3">
                  {usageData.session_limit != null ? (
                    // Session-based usage. Show TWO blocks when a beneficiary is
                    // selected: caller's own pool + the student's shared pool.
                    // Both are tracked independently — answers the "why are these
                    // numbers different?" confusion from #27.
                    (() => {
                      const ben = usageData.beneficiary
                      const benName = ben?.full_name || ben?.email || null
                      const callerUsed  = usageData.sessions_used ?? 0
                      const callerLimit = usageData.session_limit!
                      const callerPct   = callerLimit ? callerUsed / callerLimit : 0
                      const callerColor = callerPct >= 0.85 ? 'bg-red-400' : callerPct >= 0.6 ? 'bg-amber-400' : 'bg-sky-400'
                      return (
                    <>
                      {/* Caller's own pool — always visible */}
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase tracking-widest text-slate-300">
                          Your sessions
                        </span>
                        <span className="text-[10px] text-slate-200 font-medium">
                          {callerUsed} / {callerLimit}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all ${callerColor}`}
                          style={{ width: `${Math.min(callerPct * 100, 100)}%` }}
                        />
                      </div>

                      {/* Beneficiary pool — only when researching for a student */}
                      {ben && (() => {
                        const benPct   = ben.session_limit ? ben.sessions_used / ben.session_limit : 0
                        const benColor = benPct >= 0.85 ? 'bg-red-400' : benPct >= 0.6 ? 'bg-amber-400' : 'bg-sky-400'
                        return (
                          <>
                            <div className="flex justify-between items-center mb-1 mt-3">
                              <span className="text-[10px] uppercase tracking-widest text-slate-300">
                                {benName ? `${benName.split(' ')[0]}'s pool` : "Student pool"}
                              </span>
                              <span className="text-[10px] text-slate-200 font-medium">
                                {ben.sessions_used} / {ben.session_limit}
                              </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1">
                              <div
                                className={`h-1 rounded-full transition-all ${benColor}`}
                                style={{ width: `${Math.min(benPct * 100, 100)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                              Shared with {benName || 'the student'}, parents, and counselors
                            </p>
                          </>
                        )
                      })()}

                      <button
                        type="button"
                        onClick={() => setShowSessionsHelp(true)}
                        className="text-[11px] text-sky-300 hover:text-sky-200 underline mt-2 text-left"
                      >
                        How are sessions counted?
                      </button>
                    </>
                      )
                    })()
                  ) : (
                    // Message-based usage (fallback)
                    <>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase tracking-widest text-slate-600">
                          {usageData.display_plan || 'Your plan'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {usageData.effective_limit === null
                            ? `${usageData.messages_used} msgs`
                            : `${usageData.messages_used} / ${usageData.effective_limit}`}
                        </span>
                      </div>
                      {usageData.effective_limit !== null && (
                        <div className="w-full bg-white/10 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all ${
                              (usageData.messages_used / usageData.effective_limit!) >= 0.85
                                ? 'bg-red-400'
                                : (usageData.messages_used / usageData.effective_limit!) >= 0.6
                                ? 'bg-amber-400'
                                : 'bg-sky-400'
                            }`}
                            style={{ width: `${Math.min((usageData.messages_used / usageData.effective_limit!) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {/* Student connection count — counselors only */}
              {isCounselor && usageData?.active_students != null && (
                <div className="mb-1 px-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase tracking-widest text-slate-600">Student connections</span>
                    <span className="text-[10px] text-slate-500">
                      {usageData.active_students}{usageData.student_limit != null ? ` / ${usageData.student_limit}` : ''}
                    </span>
                  </div>
                  {usageData.student_limit != null && (
                    <div className="w-full bg-white/10 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all ${
                          usageData.active_students / usageData.student_limit >= 0.85 ? 'bg-red-400'
                          : usageData.active_students / usageData.student_limit >= 0.6 ? 'bg-amber-400'
                          : 'bg-sky-400'
                        }`}
                        style={{ width: `${Math.min((usageData.active_students / usageData.student_limit) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Schedule button — students only, when a scheduling link is available */}
              {!isCounselor && !isParent && schedulingLink && (
                <a
                  href={schedulingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all w-full text-left"
                >
                  <span className="text-base leading-none">📅</span>
                  <span>Schedule a session</span>
                </a>
              )}

              {/* Counselors + Parents: student picker dropdown */}
              {(isCounselor || isParent) && myStudents.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 px-3 mb-1">
                    {isCounselor ? 'Researching for' : 'Your student'}
                  </p>
                  <select
                    value={forStudentId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null
                      setForStudentId(val)
                      if (val) localStorage.setItem('ll_for_student_id', String(val))
                      else localStorage.removeItem('ll_for_student_id')
                    }}
                    className="w-full bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none"
                  >
                    {(!isParent || myStudents.length > 1) && <option value="">— Select student —</option>}
                    {myStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.has_safety_flag ? `🚩 ${s.full_name || s.email}` : (s.full_name || s.email)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Invite link — all signed-in users */}
              {inviteUrl && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl)
                    setInviteCopied(true)
                    setTimeout(() => setInviteCopied(false), 2000)
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all w-full text-left"
                >
                  <span className="text-base leading-none">{inviteCopied ? '✅' : '🔗'}</span>
                  <span>
                    {inviteCopied
                      ? 'Copied!'
                      : isCounselor
                      ? 'Copy student invite link'
                      : isParent
                      ? 'Copy student invite link'
                      : 'Copy invite link'}
                  </span>
                </button>
              )}

              <div className="border-t border-white/10 mt-1 mb-1" />

              {/* Logged-in user */}
              {clerkUser && (
                <div className="text-[10px] text-slate-500 px-3 pb-0.5 truncate">
                  {clerkUser.fullName || clerkUser.emailAddresses[0]?.emailAddress || ''}
                </div>
              )}

              {/* My Info / Profile — always own profile */}
              <Link
                href="/profile"
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <span className="text-base leading-none">👤</span>
                <span>{isCounselor || isParent ? 'My Info' : 'Profile'}</span>
              </Link>

              {/* My Lists — students only, shown near the top for discoverability */}
              {!isCounselor && !isParent && (
                <Link
                  href="/lists"
                  className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <span className="text-base leading-none flex-shrink-0">📋</span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm leading-tight">My Lists</span>
                    <span className="text-[10px] text-slate-500 leading-tight truncate">colleges · scholarships · programs</span>
                  </span>
                </Link>
              )}

              {/* Counselor dashboard link */}
              {isCounselor && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <span className="text-base leading-none">📋</span>
                  <span>My Students</span>
                </Link>
              )}

              {/* Session & Research Summaries link — all roles */}
              <Link href="/reports" className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                <span className="text-base leading-none">📝</span>
                <span>Session &amp; Research Summaries</span>
              </Link>

              {/* My Activities — students only */}
              {!isCounselor && !isParent && (
                <Link
                  href="/activities"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <span className="text-base leading-none">🏆</span>
                  <span>My Activities</span>
                </Link>
              )}

              {/* Essays link — essays module enabled; counselors must have a student selected */}
              {usageData?.essays_module && !(isCounselor && !forStudentId) && (
                <Link
                  href={forStudentId && (isCounselor || isParent) ? `/essays?for=${forStudentId}` : '/essays'}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <span className="text-base leading-none">✏️</span>
                  <span>Essays</span>
                </Link>
              )}

              {/* Admin dashboard link — admins and tenant admins */}
              {(isAdmin || (usageData?.is_tenant_admin)) && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <span className="text-base leading-none">⚙️</span>
                  <span>Admin Dashboard</span>
                </Link>
              )}

              {/* Student profile + lists — shown when a student is selected (counselor/parent) */}
              {(isCounselor || isParent) && forStudentId && (
                <>
                  <Link
                    href={`/profile?for=${forStudentId}`}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <span className="text-base leading-none">🧑‍🎓</span>
                    <span>Student Profile</span>
                  </Link>
                  <Link
                    href={`/lists?for=${forStudentId}`}
                    className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <span className="text-base leading-none flex-shrink-0">📋</span>
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm leading-tight">Lists</span>
                      <span className="text-[10px] text-slate-500 leading-tight truncate">colleges · scholarships · programs</span>
                    </span>
                  </Link>
                  <Link
                    href={`/activities?for=${forStudentId}`}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <span className="text-base leading-none">🏆</span>
                    <span>Activities</span>
                  </Link>
                </>
              )}

              {/* Student connections — informational, shown at bottom */}
              {!isCounselor && !isParent && myConnections &&
                (myConnections.counselors.length > 0 || myConnections.parents.length > 0) && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 px-3 mb-1">
                    Connected to
                  </p>
                  {myConnections.counselors.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="text-sm leading-none flex-shrink-0">🧑‍🏫</span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-300 truncate">{c.full_name || c.email}</p>
                        {c.organization && (
                          <p className="text-[10px] text-slate-500 truncate">{c.organization}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {myConnections.parents.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="text-sm leading-none flex-shrink-0">👪</span>
                      <p className="text-xs text-slate-300 truncate">{p.full_name || p.email}</p>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </aside>

        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Active student banner — shown when counselor/parent has a student selected */}
          {(isCounselor || isParent) && forStudentId && myStudents.length > 0 && (() => {
            const s = myStudents.find((s) => s.id === forStudentId)
            return s ? (
              <>
                <div className="flex items-center justify-between bg-indigo-50 border-b border-indigo-100 px-4 py-1.5 flex-shrink-0">
                  <span className="text-xs text-indigo-700 font-medium">
                    🎓 Researching for: <strong>{s.full_name || s.email}</strong>
                  </span>
                  <div className="flex items-center gap-4 ml-4">
                    {currentResearchSessionId && messages.length > 0 && (
                      <button
                        onClick={() => setShowSummaryConfirm(true)}
                        disabled={generatingSummary}
                        className="text-xs text-indigo-700 hover:text-indigo-900 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Generate or regenerate a summary for this research session"
                      >
                        {generatingSummary ? 'Generating…' : 'Generate a summary of this session'}
                      </button>
                    )}
                    {(!isParent || myStudents.length > 1) && (
                      <button
                        onClick={() => {
                          setForStudentId(null)
                          localStorage.removeItem('ll_for_student_id')
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-700 transition-colors"
                        title="Clear student selection"
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>
                </div>
                {/* Safety alert banner */}
                {s.has_safety_flag && (
                  <div className="flex items-center justify-between bg-red-50 border-b border-red-200 px-4 py-2 flex-shrink-0">
                    <span className="text-xs text-red-700 font-medium flex items-center gap-1.5">
                      🚩 Unacknowledged safety event for {s.full_name || s.email}
                    </span>
                    <button
                      onClick={() => setSafetyStudent({ id: s.id, full_name: s.full_name || s.email })}
                      className="text-xs font-medium text-red-600 hover:text-red-800 underline underline-offset-2 ml-4 whitespace-nowrap"
                    >
                      Review and acknowledge →
                    </button>
                  </div>
                )}
              </>
            ) : null
          })()}
          {/* Generate summary action bar — only when there's no "Researching for" banner above */}
          {userId && currentResearchSessionId && messages.length > 0 && !((isCounselor || isParent) && forStudentId) && (
            <div className="flex-shrink-0 border-b border-indigo-100 bg-indigo-50 px-4 py-1.5 flex justify-end">
              <button
                onClick={() => setShowSummaryConfirm(true)}
                disabled={generatingSummary}
                className="text-xs text-indigo-700 hover:text-indigo-900 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Generate or regenerate a summary for this research session"
              >
                {generatingSummary ? 'Generating…' : 'Generate a summary of this session'}
              </button>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-6 pb-safe flex flex-col gap-4">
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-4 flex-1">
            {/* Parent with multiple students — block until one is selected */}
            {isParent && myStudents.length > 1 && !forStudentId ? (
              <div className="flex flex-col items-center justify-center flex-1 h-full text-center px-6 py-16">
                <div className="text-4xl mb-4">👪</div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Select a student to get started</h2>
                <p className="text-sm text-gray-500 max-w-xs">
                  You&apos;re connected to multiple students. Choose who you&apos;d like to research for using the selector in the sidebar.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <WelcomeCard
                onSendMessage={sendMessage}
                accountType={isCounselor ? 'counselor' : isParent ? 'parent' : 'student'}
                isFreeTier={!!(usageData?.effective_limit && usageData.effective_limit <= 30)}
                isFirstSession={!!(userId && usageData && !usageData.first_session_completed)}
              />
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && msg.id === streamingMessageId}
                  onAddToList={userId && !isParent ? handleAddToList : undefined}
                  addingToList={addingToList}
                  onAddToScholarshipList={userId && !isParent ? handleAddToScholarshipList : undefined}
                  addingToScholarshipList={addingToScholarshipList}
                  onAddToEnrichmentList={userId && !isParent ? handleAddToEnrichmentList : undefined}
                  addingToEnrichmentList={addingToEnrichmentList}
                />
              ))
            )}
            <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Module chips */}
          <ModuleChips activeModules={activeModules} onToggle={toggleModule} />

          {/* Input area */}
          <div className="bg-white border-t border-gray-200 px-3 sm:px-4 py-3 flex-shrink-0">
            <div className="max-w-3xl mx-auto w-full">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isParent && myStudents.length > 1 && !forStudentId ? 'Select a student first…' : `Research colleges, majors, costs, fit, and more...`}
                  disabled={isStreaming || (isParent && myStudents.length > 1 && !forStudentId)}
                  rows={1}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm font-sans resize-none outline-none leading-relaxed focus:border-indigo-500 transition-colors disabled:opacity-60 max-h-40 overflow-y-auto"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={isStreaming || !input.trim() || (isParent && myStudents.length > 1 && !forStudentId)}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-xl h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-2">
                Press Enter to send · Shift+Enter for new line
              </p>

              {/* Usage counter — prefer sessions, fall back to messages */}
              {userId && usageData && (() => {
                const useSessions = usageData.session_limit != null
                const used = useSessions ? (usageData.sessions_used ?? 0) : usageData.messages_used
                const lim = useSessions ? usageData.session_limit : usageData.effective_limit
                const unit = useSessions ? 'research sessions' : 'messages'
                const pct = lim ? (used / lim) * 100 : 0
                const color = lim
                  ? pct >= 85 ? 'text-red-500' : pct >= 60 ? 'text-amber-500' : 'text-gray-400'
                  : 'text-gray-400'
                return (
                  <p className={`text-center text-xs mt-1 ${color}`}>
                    {lim
                      ? `${used} of ${lim} ${unit} used this month`
                      : `${used} ${unit} used this month`}
                    {lim && pct >= 60 && (
                      <> · <a href="/upgrade" className="underline hover:text-indigo-500">Upgrade for more →</a></>
                    )}
                  </p>
                )
              })()}

              {/* Safety + upgrade links */}
              <p className="text-center text-xs mt-1 text-gray-400">
                <a href="/upgrade" className="hover:text-indigo-500 transition-colors">Upgrade {tenantBranding.botName}</a>
                <span className="mx-1.5">·</span>
                <a href="/safety" className="hover:text-white transition-colors">How we help keep teens safe →</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add-to-list toast */}
      {addedToListToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400 flex-shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          {addedToListToast}
        </div>
      )}

      {/* Generate-summary confirm modal */}
      {showSummaryConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowSummaryConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl">
                📄
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Generate session summary?
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  We&apos;ll create a structured summary covering key findings,
                  relevant facts, what it means for you, and suggested next steps.
                  {isCounselor && forStudentId && (
                    <> If you&apos;re researching for a student, we&apos;ll also draft a follow-up email.</>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                  You can find all summaries later in <strong className="text-gray-700">Session &amp; Research Summaries</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowSummaryConfirm(false)}
                disabled={generatingSummary}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:bg-indigo-400 flex items-center gap-2"
              >
                {generatingSummary ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate summary'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions help modal */}
      {showSessionsHelp && usageData && (
        <SessionsHelpModal
          usageData={usageData}
          supportEmail={tenantBranding.supportEmail}
          onClose={() => setShowSessionsHelp(false)}
        />
      )}

      {/* Limit modal */}
      {limitModalData && (
        <LimitModal
          messagesUsed={limitModalData.messages_used}
          limit={limitModalData.effective_limit}
          resetDate={limitModalData.reset_date}
          supportEmail={tenantBranding.supportEmail}
          isSessionLimit={limitModalData.is_session_limit}
          onClose={() => setLimitModalData(null)}
        />
      )}

      {/* Safety event modal */}
      {safetyStudent && (
        <SafetyEventModal
          student={safetyStudent}
          onClose={() => setSafetyStudent(null)}
          onAllAcknowledged={(studentId) => {
            setMyStudents(prev => prev.map(s => s.id === studentId ? { ...s, has_safety_flag: false } : s))
            setSafetyStudent(null)
          }}
          getToken={async () => await getToken()}
        />
      )}
    </div>
  )
}
