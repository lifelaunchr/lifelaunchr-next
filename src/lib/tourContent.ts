/**
 * tourContent.ts
 *
 * Single source of truth for all product tour copy — step titles, body text,
 * bullet lists, and showcase items — for every user role.
 *
 * To update tour copy, only edit this file. No component logic needs to change.
 *
 * Structure:
 *   tourSteps      — tooltip steps shown on the /chat page
 *   showcaseItems  — off-screen features shown in the final modal
 *   tourMeta       — button labels and misc strings
 */

export type TourRole = 'student' | 'counselor' | 'parent'

export interface TourStepContent {
  /** CSS selector for the element to highlight */
  target: string
  title: string
  body: string
  /** Optional bullet list rendered below body */
  list?: string[]
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'center'
  /** Scroll the page to the target before showing the step */
  scrollToStep?: boolean
}

export interface ShowcaseItem {
  icon: string
  title: string
  description: string
  href: string
}

// ─── Button labels & misc strings ────────────────────────────────────────────

export const tourMeta = {
  next: 'Next →',
  back: '← Back',
  skip: 'Skip tour',
  last: 'Explore Soar →',
  showcaseTitle: "Here's what else Soar can do",
  showcaseSubtitle: 'These features live on other screens — click any to explore.',
  showcaseDone: 'Got it, let me explore',
  localStorageKey: (role: TourRole) => `soar_tour_seen_${role}`,
}

// ─── Student tour ─────────────────────────────────────────────────────────────

const studentSteps: TourStepContent[] = [
  {
    target: '#tour-chat-input',
    title: 'Welcome to Soar 👋',
    body: "Soar is your thinking partner — not just a smarter Google. Don't search for facts; explore ideas. Try something like:",
    list: [
      '"I love environmental science and writing — what majors or careers might fit me?"',
      '"I want a strong film program, not too far from home — where should I look?"',
      '"What\'s the real difference between a BS and a BA in psychology?"',
    ],
    placement: 'top',
  },
  {
    target: '#tour-session-counter',
    title: 'Research sessions',
    body: 'Each conversation counts as one research session. Your plan includes a set number per month — they reset on the 1st. You can always pick up where you left off within a session.',
    placement: 'right',
  },
  {
    target: '#tour-new-session',
    title: 'Start a new session',
    body: "When you're ready to explore a new topic, start a fresh session. Past sessions are saved in the sidebar so you can always come back.",
    placement: 'right',
  },
  {
    target: '#tour-nav-lists',
    title: 'Your Lists',
    body: 'Colleges, scholarships, and enrichment programs you want to track all live here. You can add to your lists directly from a conversation — just ask Soar about a school and it will offer to save it.',
    placement: 'right',
  },
  {
    target: '#tour-nav-activities',
    title: 'Your Activities',
    body: "Log your extracurriculars, awards, and leadership here. Soar uses your activity list to personalize research and college fit — the more it knows, the better the advice.",
    placement: 'right',
  },
  {
    target: '#tour-nav-reports',
    title: 'Research Summaries',
    body: 'Every conversation gets summarized automatically so you can pick up where you left off — even weeks later. Your counselor can also see what you\'ve been exploring.',
    placement: 'right',
  },
  {
    target: '#tour-chat-input',
    title: 'Things you might not think to ask',
    body: "Soar can do more than college research. Try asking:",
    list: [
      '"Can you create a first draft of my résumé?"',
      '"Can you create a first draft of my Common App activity list?"',
      '"What questions should I ask on a college visit?"',
      '"Compare these three schools for someone who wants to go to law school."',
      '"What does a typical week look like for a neuroscience major?"',
    ],
    placement: 'top',
  },
]

// ─── Counselor tour ───────────────────────────────────────────────────────────

const counselorSteps: TourStepContent[] = [
  {
    target: '#tour-student-selector',
    title: 'Select a student to begin',
    body: 'Everything in Soar — research, lists, summaries, and reports — is scoped to whoever is selected here. Switch students at any time; Soar loads their full profile automatically.',
    placement: 'right',
  },
  {
    target: '#tour-chat-input',
    title: 'Research as a conversation',
    body: "Soar works best as a thinking partner. Start broad, then drill down — Soar remembers the whole thread. Try:",
    list: [
      '"What should I know about financial aid for a 3.7 GPA student with a $40K family budget?"',
      '"Compare Northwestern and Georgetown for a student interested in political science and law."',
      '"What summer programs would strengthen this student\'s application to engineering schools?"',
    ],
    placement: 'top',
  },
  {
    target: '#tour-session-counter',
    title: 'Beneficiary pool',
    body: "When you research on behalf of a student, sessions bill against that student's shared pool — not your own. The pool is contributed to by you, the student, and their parents together.",
    placement: 'right',
  },
  {
    target: '#tour-new-session',
    title: 'New research session',
    body: "Start a fresh session for each new topic or student meeting. Past sessions are saved in the sidebar — click any to review the full transcript.",
    placement: 'right',
  },
  {
    target: '#tour-nav-lists',
    title: 'Lists',
    body: "Add colleges, scholarships, or programs directly from a research conversation — Soar will offer to save them. The college list shows fit tiers (Likely / Target / Reach) based on the student's actual profile.",
    placement: 'right',
  },
  {
    target: '#tour-nav-activities',
    title: 'Activities',
    body: "Review and edit your student's extracurricular list here. Soar uses it to tailor research and assess college fit — keeping it current makes a real difference in the quality of advice.",
    placement: 'right',
  },
  {
    target: '#tour-nav-reports',
    title: 'Summaries & Reports',
    body: 'Research summaries auto-generate after each session. Session notes and AI-drafted reports live here too — you can send them to students and parents directly from this screen.',
    placement: 'right',
  },
  {
    target: '#tour-chat-input',
    title: 'Things you might not think to ask',
    body: 'Soar can handle more than college research. Try:',
    list: [
      '"Summarize what we\'ve researched about UCLA to prep for my next meeting."',
      '"Draft a first outline of this student\'s Common App activity list."',
      '"What merit scholarships should this student know about, given her profile?"',
      '"What are the strongest programs at UT Austin for pre-med students?"',
    ],
    placement: 'top',
  },
]

// ─── Parent tour ──────────────────────────────────────────────────────────────

const parentSteps: TourStepContent[] = [
  {
    target: '#tour-student-selector',
    title: "Your student's view",
    body: "You're seeing Soar through your student's lens — their profile, college list, and research history are all here. Everything is tailored to them.",
    placement: 'right',
  },
  {
    target: '#tour-chat-input',
    title: 'Explore together',
    body: "Don't just look things up — use Soar to work through decisions as a family. Try:",
    list: [
      '"My daughter is torn between pre-med and psychology — what should she be thinking about?"',
      '"What\'s the real cost difference between these two schools for our income level?"',
      '"Which schools on her list have the strongest financial aid for our situation?"',
    ],
    placement: 'top',
  },
  {
    target: '#tour-session-counter',
    title: 'Shared research pool',
    body: "Your plan contributes sessions to your student's shared pool — used by you, your student, and their counselor together. Sessions reset on the 1st of each month.",
    placement: 'right',
  },
  {
    target: '#tour-nav-lists',
    title: "Your student's lists",
    body: "See every college, scholarship, and program your student is tracking. You can add to the list directly from a conversation — just ask about a school and Soar will offer to save it.",
    placement: 'right',
  },
  {
    target: '#tour-nav-reports',
    title: 'Research Summaries',
    body: "Every conversation is summarized automatically — yours, your student's, and their counselor's. Session notes from counseling meetings are shared here too.",
    placement: 'right',
  },
  {
    target: '#tour-chat-input',
    title: 'Things you might not think to ask',
    body: 'Soar can help with more than college lists. Try:',
    list: [
      '"What questions should we ask on college visits next month?"',
      '"Explain the difference between Early Decision and Early Action — is ED right for us?"',
      '"What does the financial aid timeline look like for a student applying this fall?"',
      '"Which schools on her list are most likely to offer merit aid for her profile?"',
    ],
    placement: 'top',
  },
]

// ─── Showcase items (off-screen features) ────────────────────────────────────

const studentShowcase: ShowcaseItem[] = [
  {
    icon: '🎯',
    title: 'Likelihood Assessment',
    description: 'See how competitive you are at each college — Likely, Target, or Reach — based on your actual GPA, test scores, and the school\'s data.',
    href: '/lists',
  },
  {
    icon: '✨',
    title: 'Soar Summary',
    description: 'An AI-written personalized summary for each college on your list, drawing from your research conversations and your profile.',
    href: '/lists',
  },
  {
    icon: '🏆',
    title: 'Scholarship List',
    description: 'Track scholarships you\'re researching and applying for, with deadlines and status in one place.',
    href: '/lists',
  },
  {
    icon: '☀️',
    title: 'Enrichment Programs',
    description: 'Summer programs and enrichment opportunities — Soar can find ones that match your interests and strengthen your application.',
    href: '/lists',
  },
  {
    icon: '👤',
    title: 'Your Profile',
    description: 'The more Soar knows about you, the better the advice. Keep your GPA, test scores, and interests up to date.',
    href: '/profile',
  },
]

const counselorShowcase: ShowcaseItem[] = [
  {
    icon: '📋',
    title: 'Meeting Brief',
    description: 'Before a session, generate an AI-written prep brief: what\'s changed since last time, list snapshot, and suggested talking points.',
    href: '/reports',
  },
  {
    icon: '📝',
    title: 'AI Session Reports',
    description: 'Draft a session report from your notes in seconds. Send it to students and parents directly — with one click.',
    href: '/reports',
  },
  {
    icon: '🎯',
    title: 'Likelihood Assessment',
    description: 'Data-driven fit tiers (Likely / Target / Reach / Far Reach) for each college, based on the student\'s GPA, test scores, and school benchmarks.',
    href: '/lists',
  },
  {
    icon: '✨',
    title: 'Soar Summary',
    description: 'A personalized AI college summary for each student, drawn from their research history and profile. Great for meeting prep.',
    href: '/lists',
  },
  {
    icon: '📊',
    title: 'Dashboard',
    description: 'Manage all your students, track application status, copy invite links, and keep counseling notes — all in one place.',
    href: '/dashboard',
  },
]

const parentShowcase: ShowcaseItem[] = [
  {
    icon: '🎯',
    title: 'Likelihood Assessment',
    description: 'See how your student stacks up at every school on their list — Likely, Target, or Reach — based on real admissions data.',
    href: '/lists',
  },
  {
    icon: '✨',
    title: 'Soar Summary',
    description: 'A personalized AI write-up for each college, informed by your student\'s actual profile and research conversations.',
    href: '/lists',
  },
  {
    icon: '💰',
    title: 'Net Price Calculator Links',
    description: 'Real cost estimates for every school — linked directly from each college on the list so you can compare true costs.',
    href: '/lists',
  },
  {
    icon: '📝',
    title: 'Session Reports',
    description: 'Notes from counseling sessions, shared with you automatically so you\'re always in the loop.',
    href: '/reports',
  },
]

// ─── Exports ──────────────────────────────────────────────────────────────────

export const tourSteps: Record<TourRole, TourStepContent[]> = {
  student: studentSteps,
  counselor: counselorSteps,
  parent: parentSteps,
}

export const showcaseItems: Record<TourRole, ShowcaseItem[]> = {
  student: studentShowcase,
  counselor: counselorShowcase,
  parent: parentShowcase,
}
