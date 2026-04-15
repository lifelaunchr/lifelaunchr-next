@AGENTS.md

## ⚠️ CRITICAL — TWO REPO RULE (READ FIRST, EVERY SESSION)

**This repo (`lifelaunchr-next`) is FRONTEND ONLY (Next.js → Vercel).**
**ALL backend/API/AI/DB changes go in `lifelaunchr-app-3` (FastAPI → Render).**

| What | Repo |
|------|------|
| UI pages, components, styles | `lifelaunchr-next` ← YOU ARE HERE |
| API routes, chat engine, DB, AI logic | `lifelaunchr-app-3` |

---

# LifeLaunchr / Soar — Deployment Reference

> Last updated: 2026-04-14.

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v0.9.6.2 | 2026-04-10 | Unified reports page (#28); sidebar scoping (#49); summary modal spinner |
| v0.9.6.3 | 2026-04-10 | Family onboarding (#38, #39): AddFamilyModal, Invited badges with copy-link on dashboard and admin; WelcomeCard first-session starters (#48 partial) |
| v0.9.6.5 | 2026-04-11 | Extended onboarding suite (#48): 6-step flow (role picker → profile → colleges → Soar intro cards → counselor invite → question picker); auto-send first question to chat via sessionStorage; role-specific card content and taglines; parent onboarding flow; migration invite routing; strikethrough rendering fix; add-to-list buttons hidden for parents |
| v0.9.6.7 | 2026-04-14 | Backend-only: complete data migration (#61, #60) — no frontend changes |
| v0.9.7 | 2026-04-15 | Backend-only: production deployment infrastructure + Clerk allowlist (#69) — schema fixes, tiers seeding, invite-only allowlist gate — no frontend changes |
| v0.9.7.1 | 2026-04-15 | Backend-only: scholarship search overhaul (#54, #24) — coaching intake approach, eligibility scoring, filter fixes, merit-first framing, strategy guide auto-load — no frontend changes |

## Repository Structure
- **Backend:** `lifelaunchr-app-3/` — Python/FastAPI, deployed on Render
- **Frontend:** `lifelaunchr-next/` (this repo) — Next.js, deployed on Vercel

## Branch → Environment Mapping

| Branch | Backend (Render) | Frontend (Vercel) | Notes |
|---|---|---|---|
| `main` | Staging (`lifelaunchr.onrender.com`) | Preview/staging | Active development |
| `production` | Production (`lifelaunchr-prod.onrender.com`) | Production (`soar.lifelaunchr.com`) | Stable live code |

**Practical rule: push to `main` for staging. Merge `main` → `production` to deploy to live users.**

## Key URLs
| Environment | Frontend | Backend API |
|---|---|---|
| Staging/dev | Vercel Preview (main branch) | `https://lifelaunchr.onrender.com` |
| Production | `https://soar.lifelaunchr.com` | `https://lifelaunchr-prod.onrender.com` |

## Local Development
- `NEXT_PUBLIC_API_URL` is set to the Render staging URL in `.env.local`
- Local Next.js dev server: `http://localhost:3000`
- Local backend (if running): `http://localhost:8000`

## What NOT to do
- **Do not push directly to `production` branch** — that affects live production users
- **Do not rename branches** without following the full rename checklist (see `docs/migration.md`)
- **Do not change Vercel Production branch** from `main` until we're ready to cut over
- **Do not break working features** — test chat, dashboard, safety flags, admin, and auth after significant changes

---

## Frontend Pages and Components

### Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Root redirect — sends users to /chat or /sign-in |
| `/chat` | `app/chat/page.tsx` | Main AI chat interface; sidebar with sessions, student picker, schedule button |
| `/profile` | `app/profile/page.tsx` | Student profile (My Info for counselors); GPA, test scores, major, demographics, coach assessment |
| `/lists` | `app/lists/page.tsx` | College, scholarship, and enrichment lists; spreadsheet and card views; drag-to-reorder |
| `/activities` | `app/activities/page.tsx` | Student extracurricular activities; drag-to-reorder; UC/Common App format export via chat |
| `/dashboard` | `app/dashboard/page.tsx` | Counselor student roster; status fields, engagement type, notes, scheduling links |
| `/reports` | `app/reports/page.tsx` | Session reports; two-panel layout (list + form); AI draft; send via SendGrid |
| `/admin` | `app/admin/page.tsx` | Admin panel; tabs: Users, Tiers (super-admin), Tenants (super-admin), Tenant Settings |
| `/safety` | `app/safety/page.tsx` | Safety event review (admin/counselor only) |
| `/upgrade` | `app/upgrade/page.tsx` | Upgrade / paywall page |
| `/onboarding` | `app/onboarding/page.tsx` | 6-step post-signup onboarding: (1) role picker, (2) student profile, (3) college wishlist, (4) Make the Most of Soar intro cards, (5) counselor invite (counselors only), (6) question picker → auto-sends to /chat |
| `/join` | `app/join/page.tsx` | Invite acceptance landing page |
| `/accept-invite` | `app/accept-invite/page.tsx` | Post-Clerk-auth invite claim page |
| `/sign-in` | `app/sign-in/` | Clerk sign-in |
| `/sign-up` | `app/sign-up/` | Clerk sign-up |

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| `ChatInterface` | `app/chat/components/ChatInterface.tsx` | Main chat UI; SSE streaming; sidebar drawer; for_student_id mode; first-session detection and flag flip |
| `ChatMessage` | `app/chat/components/ChatMessage.tsx` | Renders a single message; detects "Want to add X?" patterns and renders inline Add buttons; renders file_ready download buttons |
| `WelcomeCard` | `components/chat/WelcomeCard.tsx` | Welcome screen with starter chips; switches between normal and first-session modes (`isFirstSession` prop); role-specific starters via `FIRST_SESSION_STARTERS` |
| `AddFamilyModal` | `components/counselor/AddFamilyModal.tsx` | Modal for counselors to add student + parents as a family; validates emails, handles capacity errors, shows invite results |
| `ModuleChips` | `components/chat/ModuleChips.tsx` | Topic pills below chat input ("Load extra guidance for: Athletics, Religious life, ..."); toggles active_topics sent to backend |

### Key Frontend Patterns

**Mobile Responsive Layout (v0.9)**
All pages are mobile-responsive. Strategy varies by page:
- Pages with data tables (admin, lists): use `hidden sm:table-cell` / `hidden md:table-cell` Tailwind classes to hide lower-priority columns on small screens. Inline styles are used alongside className for responsive visibility.
- Reports page: uses an `isMobile` JS state (via `useState(() => window.innerWidth < 768)` + resize listener) to switch between a mobile single-panel layout (list → tap → detail) and a desktop two-panel layout. Inline styles throughout (no Tailwind) because Tailwind JIT doesn't compile dynamically constructed class strings.
- Chat: sidebar starts closed on mobile; opens as a partial-width drawer (`w-[85vw] max-w-[280px]`).
- Other pages: use `sm:` and `md:` Tailwind prefixes on padding, width, and layout classes.

**`for_student_id` (Counselor Research Mode)**
When a counselor selects a student in the chat sidebar, their user ID is stored in `localStorage` as `for_student_id`. It is sent as a request header on `/chat` calls. The backend loads that student's data into the system prompt and attributes list additions to the student's account.

**SSE Streaming**
Chat responses stream from `POST /chat` as Server-Sent Events. Event types: `status` (tool progress text), `text_start`, `text` (streaming token), `done`, `error`, `file_ready` (download button), `limit_reached` (show message limit modal).

**Message Limit Modal**
When the backend emits a `limit_reached` SSE event, the chat UI shows a modal explaining the limit has been reached and how to get more messages.

**"Want to add X?" Pattern**
`ChatMessage.tsx` regex-matches specific phrases in Claude's response text to render inline Add buttons. Supported patterns (case-insensitive):
- `Want to add [Name] to your research list?`
- `Want to add [Name] to [Student Name]'s research list?`
- Same patterns for `scholarship list` and `enrichment list`

The regex uses `(?:your|.+?'s)` to match both "your" and any possessive name (e.g. "Katheryn's"). This is needed because in counselor research mode, Soar uses the student's name instead of "your."

Do not change these phrases without also updating the regex in ChatMessage.tsx.

**Extended Onboarding Flow (v0.9.6.5)**
The onboarding page (`app/onboarding/page.tsx`) is a 6-step flow:
1. Role picker (student / counselor / parent)
2. Student profile (GPA, test scores, state, grad year)
3. College wishlist (search and add colleges)
4. "Make the Most of Soar" — role-specific intro cards (2×2 grid) with tagline
5. Invite a family (counselors only) — inline form to invite a student + optional parent
6. Question picker — role- and data-aware starter questions + free text input

Step 6 stores the selected question in `sessionStorage` as `onboarding_first_question`. If a counselor invited a student in step 5, the student's ID is stored as `onboarding_for_student_id`. On `/chat` mount, a useEffect reads these values, sets `forStudentId`, and auto-sends the question after an 800ms delay. Both keys are cleared after use to prevent re-firing.

The `SOAR_CARDS` constant and `getStarterQuestions()` function in the onboarding page contain all role-specific content. Migration invites (accepted via `/accept-invite`) route into the extended onboarding at step 4 (skipping role picker and profile since those were already set).

**Parent-Specific Behavior**
Parents skip step 5 (invite) and go directly from step 4 to step 6. Parents cannot add items to college/scholarship/enrichment lists — the `onAddToList`, `onAddToScholarshipList`, and `onAddToEnrichmentList` props are set to `undefined` when `isParent` is true. This prevents the inline "Add to list" buttons from appearing in chat.

**Tailwind JIT Warning**
Do not construct Tailwind class names dynamically (e.g. `text-${color}-500`). JIT only compiles classes that appear as complete strings in the source. For layout properties that must be set conditionally, use inline `style` props or pre-define both class variants explicitly.
