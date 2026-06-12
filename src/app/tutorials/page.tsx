export const metadata = {
  title: 'Tutorials | Soar by LifeLaunchr',
  description: 'Short video tutorials to help counselors and students get the most out of Soar.',
}

export default function TutorialsPage() {
  return (
    <div className="flex flex-col h-screen bg-[#0c1b33]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <h1 className="text-white font-semibold text-lg">Tutorials</h1>
        <span className="text-[11px] text-slate-500 flex-1">How to get the most out of Soar</span>
        <a
          href="/chat"
          className="text-sky-400 hover:text-sky-300 transition-colors text-sm font-medium"
        >
          Open Soar →
        </a>
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
