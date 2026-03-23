'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { ChatHeader } from './ChatHeader'
import { ChatMessage } from './ChatMessage'
import { ModuleChips } from './ModuleChips'
import { WelcomeCard } from './WelcomeCard'
import { LimitModal } from './LimitModal'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
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
}

interface LimitReachedData {
  messages_used: number
  effective_limit: number
  reset_date?: string
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

export function ChatInterface({ userId }: ChatInterfaceProps) {
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [limitModalData, setLimitModalData] = useState<LimitReachedData | null>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [isCounselor, setIsCounselor] = useState(false)
  const [isParent, setIsParent] = useState(false)
  const [myStudents, setMyStudents] = useState<Array<{ id: number; full_name: string; email: string }>>([])
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [forStudentId, setForStudentId] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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
      const res = await fetch(`${apiUrl}/my-usage`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsageData(data)

        const accountType = data.account_type ?? 'student'
        const counselor = accountType === 'counselor'
        const parent = accountType === 'parent'
        setIsCounselor(counselor)
        setIsParent(parent)

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
          if (studentsRes.ok) {
            const students = await studentsRes.json()
            setMyStudents(students.map((s: { id: number; full_name: string; email: string }) => ({ id: s.id, full_name: s.full_name, email: s.email })))
          }
        }
      }
    } catch { /* silently ignore */ }
  }, [userId, getToken, apiUrl])

  const fetchSessions = useCallback(async () => {
    if (!userId) return
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch { /* silently ignore */ }
  }, [userId, getToken, apiUrl])

  // Auth sync — ensure user exists in our DB so profile/lists work.
  // Also claims any guest sessions from localStorage so history/usage carry over.
  // IMPORTANT: fetchUsage() is called AFTER sync completes so that /my-usage sees
  // the correct clerk_user_id (auth/sync may have just reconnected it). Without this,
  // counselor accounts whose Clerk ID was recreated would appear as students because
  // /my-usage ran before the DB row was updated.
  useEffect(() => {
    if (!userId || !clerkUser) return
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
  }, [userId, clerkUser, getToken, apiUrl, fetchUsage])

  useEffect(() => {
    fetchUsage()
    fetchSessions()
  }, [fetchUsage, fetchSessions])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    if (abortControllerRef.current) abortControllerRef.current.abort()
    setMessages([])
    setConversationHistory([])
    setServerSessionId(null)
    setActiveSessionId(null)
    setInput('')
    setIsStreaming(false)
    setStreamingMessageId(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [])

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
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch { /* silently ignore */ }
  }, [userId, getToken, guestToken, apiUrl])

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

              if (data.type === 'text') {
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
                      ? { ...m, content: `_${data.msg}_` }
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
                // Refresh session list after each message
                fetchSessions()
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
    [isStreaming, userId, getToken, serverSessionId, conversationHistory, guestToken, activeModules, apiUrl, fetchSessions, forStudentId]
  )

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
      <ChatHeader
        userId={userId}
        onNewConversation={handleNewConversation}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
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
            ${sidebarOpen ? 'w-[260px]' : 'w-0'}
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
              New conversation
            </button>
          </div>

          {/* Recent label */}
          <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600 flex-shrink-0">
            Recent
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

          {/* Bottom nav — pinned */}
          {userId && (
            <div className="border-t border-white/10 p-3 flex-shrink-0 flex flex-col gap-0.5">
              {/* Counselors + Parents: student picker dropdown */}
              {(isCounselor || isParent) && myStudents.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 px-3 mb-1">
                    {isCounselor ? 'Researching for' : 'Your student'}
                  </p>
                  <select
                    value={forStudentId ?? ''}
                    onChange={(e) => setForStudentId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none"
                  >
                    <option value="">— Select student —</option>
                    {myStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
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

              {/* My Info / Profile — always own profile */}
              <Link
                href="/profile"
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <span className="text-base leading-none">👤</span>
                <span>{isCounselor || isParent ? 'My Info' : 'Profile'}</span>
              </Link>

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
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <span className="text-base leading-none">🎓</span>
                    <span>College Lists</span>
                  </Link>
                </>
              )}

              {/* My College Lists — students only */}
              {!isCounselor && !isParent && (
                <Link
                  href="/lists"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <span className="text-base leading-none">🎓</span>
                  <span>My College Lists</span>
                </Link>
              )}
            </div>
          )}
        </aside>

        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
            {messages.length === 0 ? (
              <WelcomeCard onSendMessage={sendMessage} />
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && msg.id === streamingMessageId}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Module chips */}
          <ModuleChips activeModules={activeModules} onToggle={toggleModule} />

          {/* Input area */}
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Soar about colleges, majors, costs, fit..."
                  disabled={isStreaming}
                  rows={1}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm font-sans resize-none outline-none leading-relaxed focus:border-indigo-500 transition-colors disabled:opacity-60 max-h-40 overflow-y-auto"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={isStreaming || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-xl px-5 h-11 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
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

              {/* Usage counter */}
              {userId && usageData && (
                <p className={`text-center text-xs mt-1 ${usageData.effective_limit ? usageColor : 'text-gray-400'}`}>
                  {usageData.effective_limit
                    ? `${usageData.messages_used} of ${usageData.effective_limit} messages used this month`
                    : `${usageData.messages_used} messages used this month`}
                  {usageData.effective_limit && usagePercent >= 60 && (
                    <> · <a href="/upgrade" className="underline hover:text-indigo-500">Upgrade for more →</a></>
                  )}
                </p>
              )}

              {/* Safety link */}
              <p className="text-center text-xs mt-1 text-gray-400">
                <a href="/safety" className="hover:text-white transition-colors">How we help keep teens safe →</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Limit modal */}
      {limitModalData && (
        <LimitModal
          messagesUsed={limitModalData.messages_used}
          limit={limitModalData.effective_limit}
          resetDate={limitModalData.reset_date}
          onClose={() => setLimitModalData(null)}
        />
      )}
    </div>
  )
}
