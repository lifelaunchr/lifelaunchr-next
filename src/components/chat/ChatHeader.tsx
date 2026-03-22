'use client'

import Link from 'next/link'

interface ChatHeaderProps {
  userId: string | null
  userName: string | null
  onNewConversation: () => void
  onToggleSidebar: () => void
}

export function ChatHeader({
  userId,
  userName,
  onNewConversation,
  onToggleSidebar,
}: ChatHeaderProps) {
  return (
    <header className="bg-[#1a1a2e] text-white px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0 border-b border-white/10">
      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger */}
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 rounded-md border border-white/20 text-white/50 hover:border-white/40 hover:text-white/80 flex items-center justify-center flex-shrink-0 transition-all"
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Brand */}
        <div className="flex flex-col leading-tight min-w-0">
          <h1 className="text-base font-semibold tracking-tight leading-none">
            Soar by LifeLaunchr
          </h1>
          <span className="text-xs text-white/45 whitespace-nowrap">
            Your AI-powered college advisor
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-nowrap">
        {/* College count badge */}
        <span className="hidden sm:inline-flex items-center gap-1 bg-white/10 text-white/70 text-xs px-3 py-1 rounded-full border border-white/15 whitespace-nowrap">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3 h-3"
          >
            <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
            <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
            <path d="M4.462 19.462c.42-.419.753-.89 1-1.394.453.213.902.434 1.347.661a6.743 6.743 0 01-1.286 1.794.75.75 0 11-1.06-1.06z" />
          </svg>
          1,514 colleges
        </span>

        {/* New conversation button */}
        <button
          onClick={onNewConversation}
          className="border border-white/20 text-white/60 hover:border-white/40 hover:text-white/90 text-xs px-3 py-1.5 rounded-md transition-all whitespace-nowrap"
        >
          New conversation
        </button>

        {/* Auth section */}
        {userId ? (
          <span className="text-sm text-white/50 max-w-[120px] truncate hidden sm:block">
            {userName}
          </span>
        ) : (
          <>
            <Link
              href="/sign-in"
              className="border border-white/20 text-white/60 hover:border-white/40 hover:text-white/90 text-xs px-3 py-1.5 rounded-md transition-all whitespace-nowrap"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap"
            >
              Get started free
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
