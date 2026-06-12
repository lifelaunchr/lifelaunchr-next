'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function TutorialsPage() {
  const { isLoaded, userId } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !userId) {
      router.replace('/sign-in')
    }
  }, [isLoaded, userId, router])

  if (!isLoaded || !userId) return null

  return (
    <div className="flex flex-col h-screen bg-[#0c1b33]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <a
          href="/chat"
          className="text-slate-400 hover:text-white transition-colors text-sm"
        >
          ← Back to Soar
        </a>
        <span className="text-slate-600">|</span>
        <h1 className="text-white font-semibold text-lg">Tutorials</h1>
        <span className="text-[11px] text-slate-500 ml-1">How to get the most out of Soar</span>
      </div>

      {/* Full-height Vimeo showcase embed */}
      <div className="flex-1 min-h-0">
        <iframe
          src="https://vimeo.com/showcase/12272683/embed"
          className="w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Soar Tutorials"
        />
      </div>
    </div>
  )
}
