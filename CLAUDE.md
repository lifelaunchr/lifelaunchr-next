@AGENTS.md

# LifeLaunchr / Soar — Deployment Reference

> Last updated: 2026-04-05.

## Repository Structure
- **Backend:** `lifelaunchr-app-3/` — Python/FastAPI, deployed on Render
- **Frontend:** `lifelaunchr-next/` (this repo) — Next.js, deployed on Vercel

## Branch → Environment Mapping

| Branch | Backend (Render) | Frontend (Vercel) | Notes |
|---|---|---|---|
| `main` | Staging (`lifelaunchr.onrender.com`) | **Production** (temporary — see below) | Active development |
| `production` | Production (`lifelaunchr-prod.onrender.com`) | Production (future) | Stable live code |

### ⚠️ Temporary exception
Vercel is currently deploying the `main` branch to **Production** (not Preview). This is because Preview deployments caused issues. Once stable, this will flip: `main` → Preview/staging, `production` → Vercel Production.

**Practical rule: push to `main` to deploy to staging backend AND Vercel Production (currently the same users).**

## Key URLs
| Environment | Frontend | Backend API |
|---|---|---|
| Staging/dev | Vercel Production (main branch) | `https://lifelaunchr.onrender.com` |
| Production | TBD (`soar.lifelaunchr.com` after DNS cutover) | `https://lifelaunchr-prod.onrender.com` |

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
| `/onboarding` | `app/onboarding/page.tsx` | Post-signup onboarding flow (role selection, practice name for counselors) |
| `/join` | `app/join/page.tsx` | Invite acceptance landing page |
| `/accept-invite` | `app/accept-invite/page.tsx` | Post-Clerk-auth invite claim page |
| `/sign-in` | `app/sign-in/` | Clerk sign-in |
| `/sign-up` | `app/sign-up/` | Clerk sign-up |

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| `ChatInterface` | `app/chat/components/ChatInterface.tsx` | Main chat UI; SSE streaming; sidebar drawer; for_student_id mode |
| `ChatMessage` | `app/chat/components/ChatMessage.tsx` | Renders a single message; detects "Want to add X?" patterns and renders inline Add buttons; renders file_ready download buttons |

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
`ChatMessage.tsx` regex-matches specific phrases in Claude's response text to render inline Add buttons. Exact phrases required (case-sensitive):
- `Want to add [Name] to your research list?`
- `Want to add [Name] to your scholarship list?`
- `Want to add [Name] to your enrichment list?`

Do not change these phrases without also updating the regex in ChatMessage.tsx.

**Tailwind JIT Warning**
Do not construct Tailwind class names dynamically (e.g. `text-${color}-500`). JIT only compiles classes that appear as complete strings in the source. For layout properties that must be set conditionally, use inline `style` props or pre-define both class variants explicitly.
