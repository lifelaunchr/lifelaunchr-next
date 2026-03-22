'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
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

interface UsageData {
  messages_used: number
  effective_limit: number
  reset_date?: string
}

interface LimitReachedData {
  messages_used: number
  effective_limit: number
  reset_date?: string
}

interface ChatInterfaceProps {
  userId: string | null
}

export function ChatInterface({ userId }: ChatInterfaceProps) {
  const { getToken } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId] = useState<string>(() => crypto.randomUUID())
  const [guestToken, setGuestToken] = useState<string | null>(null)
  const [activeModules, setActiveModules] = useState<string[]>([])
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [limitModalData, setLimitModalData] = useState<LimitReachedData | null>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

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

  // Fetch usage data for authenticated users
  useEffect(() => {
    if (!userId) return
    const fetchUsage = async () => {
      try {
        const token = await getToken()
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/my-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUsageData(data)
        }
      } catch {
        // silently ignore
      }
    }
    fetchUsage()
  }, [userId, getToken])

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setMessages([])
    setInput('')
    setIsStreaming(false)
    setStreamingMessageId(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
      }

      const assistantMsgId = crypto.randomUUID()
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreamingMessageId(assistantMsgId)
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      setIsStreaming(true)

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
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
            session_id: sessionId,
            ...(guestToken && !userId ? { guest_token: guestToken } : {}),
            active_modules: activeModules,
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
              } else if (data.type === 'done') {
                // Update usage if returned
                if (data.messages_used !== undefined && data.effective_limit !== undefined) {
                  setUsageData({
                    messages_used: data.messages_used,
                    effective_limit: data.effective_limit,
                    reset_date: data.reset_date,
                  })
                }
              } else if (data.type === 'limit_reached') {
                setLimitModalData({
                  messages_used: data.messages_used,
                  effective_limit: data.effective_limit,
                  reset_date: data.reset_date,
                })
                // Remove the empty assistant message
                setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId))
              }
            } catch {
              // skip malformed SSE lines
            }
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
    [isStreaming, userId, getToken, sessionId, guestToken, activeModules]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleSend = () => sendMessage(input)

  // Usage bar color
  const usagePercent = usageData
    ? (usageData.messages_used / usageData.effective_limit) * 100
    : 0
  const usageColor =
    usagePercent >= 85
      ? 'text-red-500'
      : usagePercent >= 66
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
        {/* Sidebar */}
        <aside
          className={`bg-[#1a1a2e] text-slate-300 flex flex-col flex-shrink-0 border-r border-white/10 transition-all duration-200 overflow-hidden ${
            sidebarOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 border-b border-white/10 flex-shrink-0">
            Past Conversations
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <p className="text-center text-slate-600 text-sm px-4 py-5">
              {userId ? 'No past conversations yet.' : 'Sign in to save conversations.'}
            </p>
          </div>
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
                  onClick={handleSend}
                  disabled={isStreaming || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-xl px-5 h-11 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-2">
                Press Enter to send · Shift+Enter for new line
              </p>

              {/* Usage counter */}
              {userId && usageData && (
                <p className={`text-center text-xs mt-1 ${usageColor}`}>
                  {usageData.messages_used} of {usageData.effective_limit} free messages used this
                  month ·{' '}
                  <a href="/upgrade" className="underline hover:text-indigo-500">
                    Learn about upgrades →
                  </a>
                </p>
              )}
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
