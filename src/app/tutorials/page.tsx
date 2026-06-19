'use client'

import { useState, useEffect } from 'react'

// ── Add video IDs here as you upload new tutorials ────────────────────────────
// Find each ID in the video's Vimeo URL: vimeo.com/1234567890 → id: '1234567890'
// New videos go at the BOTTOM — the first item in this list is the first card.
// Thumbnails are fetched automatically from Vimeo; no manual steps needed.
const VIDEOS: { id: string; title: string; description?: string }[] = [
  {
    id: '1197542498',
    title: 'Why Soar is Different',
    description: 'Soar is a shared workspace where counselors, students, and parents work together — not just a tool for managing a process. A two-minute overview from LifeLaunchr founder Swami Swaminathan.',
  },
  {
    id: '1198259270',
    title: 'Invite Your First Family',
    description: "The single most important first step: invite a student and their parents. Once you do, you can start researching on the student's behalf immediately. Takes about two minutes.",
  },
  {
    id: '1202638568',
    title: 'Updating a Student Profile',
    description: 'Once you invite a student to join Soar, you - or the student - can update the student\'s profile: enter GPA and test scores, intended majors and financial details, even upload transcripts. This information is used to power the student\'s college and career research.',
  },
  {
    id: '1202689764',
    title: 'Entering Student Activities Lists',
    description: "Once you invite students and add them, counselors or students can enter details of a student's activities into Soar, so it can be used to generate CommonApp and UC activities lists, and also to power their research.",
  },
  {
    id: '1202638152',
    title: 'Using Soar to Explore Majors and Careers',
    description: 'Soar helps students explore majors and their connection to careers. It can help students make more nuanced, better informed decisions about career paths and the majors that lead to them.',
  },
  {
    id: '1202638545',
    title: 'Generating Personalized Soar Summaries for Each College',
    description: 'After a student researches a college, Soar generates Soar summaries that provide an organized summary of the work you did, the student did, and their parent did, and connects the college to the student in a way that helps students choose colleges, and also helps to prepare "Why Us?" essays.',
  },
  {
    id: '1202638285',
    title: 'Generating Meeting Briefs Before Meetings',
    description: 'Before you meet with a student, Soar can generate a meeting brief to prepare you. It will review all the work the student, parent, and counselor did since the last meeting, and generate a detailed brief to prepare you for the meeting.',
  },
  {
    id: '1202638154',
    title: 'Generating Session Summaries',
    description: 'Soar automates the generation of session summaries - using meeting briefs and automated transcripts of sessions, so you can send detailed, high-quality session reports to parents and children after each session.',
  },
  {
    id: '1202638153',
    title: 'How Soar Calculates College Admission Likelihoods',
    description: "Soar calculates admission likelihoods using a proprietary algorithm developed over many years of working with students. ChatGPT and other AI chatbots overestimate likelihoods, and Soar's algorithms - based on GPA, rigor, SAT/ACT scores, extracurriculars, and athletics - are designed to be accurate and representative.",
  },
  {
    id: '1202689765',
    title: 'Generating Activities Lists for Applications',
    description: 'Soar can generate draft versions of the UC or CommonApp activities lists, or create resumés you can use for internships, job applications, or college applications.',
  },
  {
    id: '1202638155',
    title: 'How Soar Avoids Hallucinations',
    description: "AI tools are prone to hallucinations: making up facts. To avoid this, we've built many features into Soar: authoritative databases, tens of thousands of words of context about college and career planning, and search and web retrieval. These allow us to provide better information to parents and students.",
  },
]
// ─────────────────────────────────────────────────────────────────────────────

// Fallback: until video IDs are added above, show the Vimeo showcase embed
const SHOWCASE_EMBED = 'https://vimeo.com/showcase/12272683/embed?autoplay=0'

export default function TutorialsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const hasVideos = VIDEOS.length > 0

  // Fetch thumbnails from Vimeo oEmbed API (works for unlisted videos)
  useEffect(() => {
    if (!hasVideos) return
    VIDEOS.forEach(async (video) => {
      try {
        const res = await fetch(
          `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${video.id}&width=640`
        )
        if (!res.ok) return
        const data = await res.json()
        if (data.thumbnail_url) {
          setThumbnails((prev) => ({ ...prev, [video.id]: data.thumbnail_url }))
        }
      } catch {
        // silently skip — gradient placeholder will show
      }
    })
  }, [hasVideos])

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
                  {thumbnails[video.id] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumbnails[video.id]}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1e3a5f] via-[#0c1b33] to-[#0a1628] group-hover:from-[#24436e] transition-colors duration-300" />
                  )}
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
