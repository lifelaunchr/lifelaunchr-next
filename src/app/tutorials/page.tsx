'use client'

import { useState } from 'react'

// ── Add video IDs here as you upload new tutorials ────────────────────────────
// Find each ID in the video's Vimeo URL: vimeo.com/1234567890 → id: '1234567890'
// Thumbnails and embeds are generated automatically from the ID.
const VIDEOS: { id: string; title: string; description?: string }[] = [
  // { id: '1234567890', title: 'Introducing Soar by LifeLaunchr', description: 'A quick overview of what Soar can do.' },
  // { id: '0987654321', title: 'Getting Started as a Counselor', description: '' },
]
// ─────────────────────────────────────────────────────────────────────────────

// Fallback: until video IDs are added above, show the Vimeo showcase embed
const SHOWCASE_EMBED = 'https://vimeo.com/showcase/12272683/embed?autoplay=0'

export default function TutorialsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const hasVideos = VIDEOS.length > 0

  return (
    <div className="flex flex-col h-screen bg-[#0c1b33]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex items-center gap-3">
        {selectedId && (
          <button
            onClick={() => setSelectedId(null)}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← All tutorials
          </button>
        )}
        {!selectedId && <h1 className="text-white font-semibold text-lg">Tutorials</h1>}
        {!selectedId && (
          <span className="text-[11px] text-slate-500 flex-1">
            How to get the most out of Soar
          </span>
        )}
        <a
          href="/chat"
          className="text-sky-400 hover:text-sky-300 transition-colors text-sm font-medium ml-auto"
        >
          Open Soar →
        </a>
      </div>

      {/* Content */}
      {!hasVideos ? (
        // Fallback: showcase embed (autoplay disabled) until video IDs are configured
        <div className="flex-1 min-h-0">
          <iframe
            src={SHOWCASE_EMBED}
            className="w-full h-full"
            frameBorder="0"
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            title="Soar Tutorials"
          />
        </div>
      ) : selectedId ? (
        // Full-screen player for selected video
        <div className="flex-1 min-h-0 bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${selectedId}?autoplay=1&title=0&byline=0&portrait=0`}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Tutorial"
          />
        </div>
      ) : (
        // Gallery grid
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VIDEOS.map((video) => (
              <button
                key={video.id}
                onClick={() => setSelectedId(video.id)}
                className="group text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-all"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-white/5 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://vumbnail.com/${video.id}.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-slate-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div className="p-4">
                  <p className="text-white text-sm font-medium leading-snug">{video.title}</p>
                  {video.description && (
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{video.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
