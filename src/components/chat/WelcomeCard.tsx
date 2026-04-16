'use client'

interface WelcomeCardProps {
  onSendMessage: (text: string) => void
  accountType?: 'student' | 'counselor' | 'parent'
  isFreeTier?: boolean
  isFirstSession?: boolean
}

const STARTERS = [
  'Help me find colleges that fit my profile',
  'What scholarships might I qualify for?',
  'How does financial aid work?',
  'Help me explore majors and careers',
]

const FIRST_SESSION_STARTERS: Record<string, string[]> = {
  student: [
    "I'm starting my college search — help me figure out where to begin",
    'What kind of information should I gather before researching schools?',
    'Help me understand the different types of colleges',
    "I know my GPA and test scores — what colleges should I consider?",
  ],
  parent: [
    "Help me understand the college admissions process",
    "What should I know about financial aid and scholarships?",
    "How can I support my child's college search?",
    "What's a realistic college budget, and how do we plan for it?",
  ],
  counselor: [
    'Show me what Soar can do for my students',
    "Research colleges strong in computer science for a student with a 3.8 GPA",
    "What financial aid options exist for a middle-income family?",
    "Help me compare liberal arts colleges in the Northeast",
  ],
}

const VALUE_PROPS = [
  {
    icon: '🎓',
    title: 'College, major & career research',
    desc: 'Real data on admissions, costs, and programs — matched to your academics, interests, and budget.',
  },
  {
    icon: '💰',
    title: 'Scholarship search',
    desc: 'Find scholarships you\'re actually eligible for, based on your background, heritage, interests, and activities.',
  },
  {
    icon: '🗺️',
    title: 'Know what to do next',
    desc: 'Built on decades of counseling experience — Soar knows what to ask, what matters, and when.',
  },
  {
    icon: '👥',
    title: 'Your whole team, one place',
    desc: 'Student, counselor, and parent all see the same research — no one is out of the loop.',
  },
  {
    icon: '📋',
    title: 'Come prepared to every meeting',
    desc: 'Students make progress between sessions; counselors arrive knowing exactly what was explored.',
  },
  {
    icon: '📊',
    title: 'Real data, not guesses',
    desc: '1,800+ colleges and 6,700+ scholarships — not AI training cutoffs.',
  },
]

function getHowDoesThisWorkMessage(accountType?: 'student' | 'counselor' | 'parent'): string {
  if (accountType === 'counselor') {
    return 'How does Soar work, and how can I use it for my own research and for my students?'
  }
  if (accountType === 'parent') {
    return 'How does Soar work, and how can it help my family through the college planning process?'
  }
  return 'How does Soar work, and what can it help me with as a student applying to colleges?'
}

export function WelcomeCard({ onSendMessage, accountType, isFreeTier, isFirstSession }: WelcomeCardProps) {
  const starters = isFirstSession
    ? FIRST_SESSION_STARTERS[accountType || 'student'] || FIRST_SESSION_STARTERS.student
    : STARTERS

  const heading = isFirstSession
    ? 'Welcome! Let\u2019s get started.'
    : 'Welcome to Soar by LifeLaunchr'

  const subtitle = isFirstSession
    ? accountType === 'counselor'
      ? 'Soar is your AI-powered research assistant. Ask anything about colleges, financial aid, or admissions \u2014 and tag research to specific students.'
      : accountType === 'parent'
        ? 'Soar helps you research colleges, scholarships, and financial aid on your child\u2019s behalf. Everything you find is shared with their planning team.'
        : 'Soar is your personal college planning assistant. Tell me about yourself and what you\u2019re looking for \u2014 the more I know, the better I can help.'
    : 'Research colleges, explore majors, find scholarships, and prepare for every meeting \u2014 all in one place.'

  return (
    <div className="flex-1 flex items-start justify-center pt-8 pb-4 px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Icon + heading */}
        <div className="mb-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-7 h-7 text-white"
            >
              <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
              <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {heading}
          </h2>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Value props — shown to returning users, hidden on first session to keep focus on starters */}
        {!isFirstSession && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 text-left">
          {VALUE_PROPS.map((vp) => (
            <div
              key={vp.title}
              className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl flex-shrink-0">{vp.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{vp.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{vp.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>}

        {/* Starter questions */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {starters.map((s) => (
            <button
              key={s}
              onClick={() => onSendMessage(s)}
              className="bg-white border border-indigo-200 text-indigo-600 text-sm px-4 py-2 rounded-full hover:bg-indigo-50 hover:border-indigo-300 transition-all font-medium"
            >
              {s}
            </button>
          ))}
        </div>

        {/* How does this work */}
        <button
          onClick={() => onSendMessage(getHowDoesThisWorkMessage(accountType))}
          className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
        >
          How does this work?
        </button>

        {/* Privacy note */}
        <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-4">
          Your conversations are private and used only to improve your experience.
        </p>
        {isFreeTier && (
          <p className="text-xs text-gray-400 mt-2">On the free tier · <a href="/upgrade" className="underline hover:text-indigo-500">Learn about Soar Plus →</a></p>
        )}
      </div>
    </div>
  )
}
