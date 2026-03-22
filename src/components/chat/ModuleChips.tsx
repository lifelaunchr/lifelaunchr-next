'use client'

const MODULES = [
  { id: 'athletics', label: 'Athletics', emoji: '🏈' },
  { id: 'religious', label: 'Religious / spiritual life', emoji: '✝️' },
  { id: 'lgbtq', label: 'LGBTQ+ & campus culture', emoji: '🏳️‍🌈' },
  { id: 'extracurriculars', label: 'Extracurriculars', emoji: '🎭' },
  { id: 'rankings', label: 'Rankings', emoji: '🏆' },
  { id: 'neurodiversity', label: 'Learning differences / neurodiversity', emoji: '🧠' },
  { id: 'diversity', label: 'Racial & ethnic diversity', emoji: '🌍' },
]

interface ModuleChipsProps {
  activeModules: string[]
  onToggle: (module: string) => void
}

export function ModuleChips({ activeModules, onToggle }: ModuleChipsProps) {
  return (
    <div className="bg-white border-t border-gray-100 px-4 py-2.5 flex-shrink-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
            Load extra guidance for:
          </span>
          {MODULES.map((mod) => {
            const isActive = activeModules.includes(mod.id)
            return (
              <button
                key={mod.id}
                onClick={() => onToggle(mod.id)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-gray-500 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                <span>{mod.emoji}</span>
                <span>{mod.label}</span>
                {isActive && <span className="text-indigo-500">✓</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
