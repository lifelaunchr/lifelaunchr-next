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

> Last updated: 2026-04-24 (v1.0.2).

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v0.9.6.2 | 2026-04-10 | Unified reports page (#28); sidebar scoping (#49); summary modal spinner |
| v0.9.6.3 | 2026-04-10 | Family onboarding (#38, #39): AddFamilyModal, Invited badges with copy-link on dashboard and admin; WelcomeCard first-session starters (#48 partial) |
| v0.9.6.5 | 2026-04-11 | Extended onboarding suite (#48): 6-step flow (role picker → profile → colleges → Soar intro cards → counselor invite → question picker); auto-send first question to chat via sessionStorage; role-specific card content and taglines; parent onboarding flow; migration invite routing; strikethrough rendering fix; add-to-list buttons hidden for parents |
| v0.9.6.7 | 2026-04-14 | Backend-only: complete data migration (#61, #60) — no frontend changes |
| v0.9.7 | 2026-04-15 | Backend-only: production deployment infrastructure + Clerk allowlist (#69) — schema fixes, tiers seeding, invite-only allowlist gate — no frontend changes |
| v0.9.7.1 | 2026-04-15 | Backend-only: scholarship search overhaul (#54, #24) — coaching intake approach, eligibility scoring, filter fixes, merit-first framing, strategy guide auto-load — no frontend changes |
| v0.9.7.2 | 2026-04-16 | Fix research summaries not showing on Reports page (#70): loadReports() in reports/page.tsx was bailing early with setReports([]) when studentId was null instead of calling /reports/unified; fixed to always call the API and pass for_student_id only when a student is selected |
| v0.9.7.3 | 2026-04-16 | Production config only (#71): Essays module enabled, Editate credentials set on production tenant, essay lazy-fetch confirmed working — no frontend code changes |
| v0.9.7.4 | 2026-04-16 | Beta banner + Render cleanup (#36, #22, #23): BetaBanner component added (dismissible, signed-in users only, 7-day reappear); Render now API-only with 302 redirects to SOAR_BASE_URL — no longer serves static/index.html |
| v0.9.7.5 | 2026-04-16 | WelcomeCard copy refresh (#75): 6 value prop cards (up from 5), updated starter chips (removed "safety/match/reach" terminology), tagline kept as original personalization-focused line |
| v0.9.7.6 | 2026-04-17 | Redirect lifelaunchr-next.vercel.app → soar.lifelaunchr.com (#72): host-based redirect in next.config.ts; preview deployment URLs excluded |
| v0.9.7.7 | 2026-04-17 | Landing page + upgrade page rewrite (#32): new hero copy on landing page; full upgrade page with fear-first framing, feature cards, tier tables, tools comparison, FAQ; layout.tsx metadata updated; tenant tagline updated to "College and Career Planning, Built for the Whole Team." |
| v0.9.7.8 | 2026-04-17 | Server-side auth redirect (#77): signed-in users hitting / now redirect to /chat at the edge via proxy.ts (Next.js 16 middleware); deleted conflicting middleware.ts; removed client-side Clerk loading guard from page.tsx to eliminate blank-page flash for non-signed-in users |
| v0.9.8 | 2026-04-17 | Tenant admin family invite (#80): AddFamilyModal shows counselor dropdown for tenant admins and routes to POST /tenant-admin/families; dashboard/page.tsx fetches counselor list and passes to modal with key-prop remount fix; localStorage token fix (was sessionStorage, lost across Clerk redirects); site password gate query-string fix in proxy.ts (url.pathname + url.search — was dropping ?token= param); parent onboarding routing fix (POST /accept-invite response used as primary account_type source so parents skip role picker and land on Soar intro at step 4) |
| v0.9.9 | 2026-04-18 | Essays empty state contextual messages (#83): three distinct states now shown — Editate not enabled for student (admin instructions), Editate not enabled for own account (contact counselor), Editate enabled but no colleges in Applying+ status (link to Lists page). essays/page.tsx uses effectiveEditateAvailable to branch the message correctly. |
| v0.9.10 | 2026-04-19 | Backend-only: agentic loop graceful degradation (#45) — friendly error messages on API failures, synthesis nudge + tool_choice=none to guarantee loop termination. No frontend changes. |
| v0.9.10 | 2026-04-20 | Backend-only: quarterly data refresh wizard (#89) — scripts/quarterly_refresh.py with --dry-run mode; build_colleges_csv.py auto-detects newest Peterson's folder by mtime. No frontend changes. |
| v0.9.10 | 2026-04-20 | Invite approval banner (#66): admin/page.tsx shows amber banner when approve returns ok:false (active account), green on success. approveMessage state added; all error paths covered including network failures. Follow-up for inline per-row errors filed as next#16. |
| v0.9.10 | 2026-04-20 | Onboarding + invite form copy (#17): practice name label on landing page changed to "Company, practice, or school name"; helper text added to onboarding IEC practice field explaining it is the business name with examples. |
| v0.9.11 | 2026-04-20 | Sidebar nav scroll fix (#18): bottom nav div given overflow-y-auto + max-h-[60vh] so Activities and other items are always reachable on small screens; counselors with a student selected no longer clip the nav. |
| v0.9.11 | 2026-04-20 | Add-to-list button fixes (#87): ChatMessage.tsx extract functions switched from match() to matchAll()+g flag — multiple colleges in one response now each get their own button. Strip ** before matching so bolded college names produce buttons. Require [A-Z] first char to reject generic phrases like "any of these". Filed next#19 for future hidden-marker redesign. |
| v0.9.11 | 2026-04-20 | Resend invite button for access requests (#13): admin/page.tsx shows "Resend invite" button on invited rows alongside the invited date. Calls the same approveRequest() function; backend returns status="resent" so banner shows "Invite resent successfully." instead of "Invite sent successfully." |
| v0.9.12 | 2026-04-21 | Session counter fix on profile page (#51): profile/page.tsx now shows sessions_used / session_limit from /my-usage instead of the legacy messages_used / effective_limit fields. Students see the correct pool total (e.g. 35) rather than their own tier limit (e.g. 5). |
| v0.9.12 | 2026-04-21 | Parent profile page cleanup: Academic Information, Background, High School, College Interests, and Preferences & Goals sections now hidden for parents viewing their own profile (gate: accountType !== 'parent' \|\| isViewingStudent). Added a "Financial Preferences" section (income tier, SAI/EFC, budget max) with explanatory note. Removed History retention row from Plan & Usage table — field is not enforced in the backend. Filed next#21 to wire financial prefs into system prompt (post-launch). Stale localStorage forStudentId bug (counselors with no students seeing student nav items) filed as next#20 (post-launch). |
| v0.9.13 | 2026-04-22 | College drawer tab visibility: tab labels shortened ("Research Notes"→"Research", "People Notes"→"People") and horizontal padding reduced (container 22px→10px, buttons 14px→10px per side) so all 6 tabs fit in the 520px drawer without horizontal scrolling. "Soar Summary" was previously hidden off-screen unless the user scrolled right. (`src/app/lists/page.tsx`) |
| v0.9.13 | 2026-04-22 | Sidebar nav discoverability: "My Lists" moved to appear immediately after "Profile" for students — was previously after Research Summaries and Activities, hidden below the fold on typical screens. For counselors/parents viewing a student, "Lists" now appears before "Activities". "My Activities" for students is now between "My Lists" and "Research Summaries". (`src/components/chat/ChatInterface.tsx`) |
| v0.9.17 | 2026-04-22 | Monitoring stack (app#82): `@vercel/analytics` installed, `<Analytics />` added to `src/app/layout.tsx`. UptimeRobot monitors live for frontend + backend. Backend `/health` now accepts HEAD + GET. Sentry deferred post-launch. |
| v0.9.16 | 2026-04-22 | Suppress password manager autofill on CC email field (next#27): "Additional email addresses" input in session reports was triggering browser/password-manager credential autofill due to email-like placeholder. Added `autoComplete="off"`, `data-form-type="other"` (Dashlane), `data-lpignore="true"` (LastPass), `data-1p-ignore="true"` (1Password). No backend changes. (`src/app/reports/page.tsx`) |
| v0.9.15 | 2026-04-22 | Fix NPC link opening as relative URL (next#23): `sc_npc_url` from the DB sometimes lacks an `https://` prefix. The `href` on the "(Link ↗)" anchor in the Financial tab now guards with `.startsWith('http') ? url : \`https://${url}\``. (`src/app/lists/page.tsx` — `EditDrawer` Financial tab) |
| v0.9.14 | 2026-04-22 | Fix enrichment AddEnrichmentModal showing 'Add "undefined"' (next#29): backend `/enrichment-lookup` was aliasing `name AS program_name` but `EnrichmentSearchResult` interface expected `name` — alias removed in backend. Frontend unchanged. (`lifelaunchr-app-3/main.py`) |
| v0.9.14 | 2026-04-22 | Fix enrichment tab count showing 0 until clicked (next#29): `loadEnrichment()` was lazy (tab-click only). Now fired in parallel with the initial `GET /lists/{id}` fetch at page load via `Promise.all`. `enrichmentLoaded` flag set immediately so lazy guard prevents double-fetch. (`src/app/lists/page.tsx`) |
| v0.9.13 | 2026-04-22 | Fix: coach assessment fields (EC rating, Academic Rigor) reset to -Select after save (#25). Root cause: GET /profile returns DB column names (`extracurricular_rating`, `academic_rigor`) but the selects bind to `ec_rating` and `academic_rigor_rating`. Post-save re-fetch was wiping the select values. Added `normalizeProfile()` in `src/app/profile/page.tsx` to map DB names → frontend names on both initial load and post-save re-fetch. |
| v0.9.25 | 2026-04-23 | Backend-only: counselor families endpoint (#90) — `_find_or_create_user()` now handles all 4 cases (created/reinvited/reactivated/connected); connected notification email Sign In link now uses `_SOAR_BASE_URL`; `send_connected_notification_email()` gains `app_url` param. No frontend code changes. |
| v0.9.24 | 2026-04-23 | Fix note and research summary dates showing tomorrow for late-evening US users (next#35): `reportLabel()` was using `created_at?.slice(0,10)` and `started_at?.slice(0,10)` to get the display date — slicing a UTC ISO timestamp gives the UTC date, which is one day ahead for US users after ~5 PM local time. Added `localDateStr()` helper in `src/app/reports/page.tsx` that converts a UTC timestamp to a local YYYY-MM-DD string using `getFullYear()/getMonth()/getDate()` (local clock). Applied to note `created_at` label and all three research summary `started_at` display sites. |
| v0.9.23 | 2026-04-23 | Fix profile re-fetch wipes unsaved edits (next#26): `useEffect` in `src/app/profile/page.tsx` had `clerkUser` (the full object) as a dependency. Clerk silently creates a new object reference on every background token refresh (~60s), causing the effect to re-run, re-fetch the profile from the server, and overwrite any pending unsaved changes — explaining why citizenship, testing_status, and other fields "required 2-3 saves." Fixed by changing the dependency to `clerkUser?.id`. One-line change; no backend changes. |
| v1.0.2 | 2026-04-24 | Fix add-to-list buttons missing in counselor mode: `extractResearchListOffers`, `extractScholarshipListOffers`, and `extractEnrichmentListOffers` in `src/components/chat/ChatMessage.tsx` now match `her|his|their` in addition to `your` and `[Name]'s`. Counselors researching on behalf of a student were seeing "Want to add X to her research list?" with no button because the regex only matched "your". |
| v1.0.1 | 2026-04-24 | Fix silent auth/sync failure on parent/counselor onboarding: `handleSaveData()` in `src/app/onboarding/page.tsx` now checks `syncRes.ok` for all account types before proceeding — previously only students had the guard, so a failed `/auth/sync` response silently advanced parents/counselors to step 4 with no user row claimed. Added `console.error('[onboarding] handleSaveData error:', err)` to the catch block so failures are visible in browser DevTools without needing the network tab. |
| v1.0 | 2026-04-23 | Production go-live. No frontend code changes — all v1.0 work was backend migration quality fixes (html2text paragraph collapse, EC/athletic rating key mapping, UC/CA activity categories, org_description, Key to-dos paragraph break in session notes) and data backfill (sent_at on 10,570 session reports). Backend: see lifelaunchr-app-3 CLAUDE.md v0.9.26–v0.9.28. |
| v0.9.22 | 2026-04-23 | Fix onboarding skip for newly invited users (#93 follow-up): `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat` in Vercel env vars was overriding `fallbackRedirectUrl="/onboarding"` on the `<SignUp>` component — all new sign-ups landed directly in chat, bypassing profile setup, college selection, and the Soar intro cards. Removed from staging and production Vercel env vars. Updated `.env.local.example` to document the correct value (`/onboarding`). No code changes — the `<SignUp fallbackRedirectUrl="/onboarding" />` setting in `src/app/sign-up/[[...sign-up]]/page.tsx` was always correct. |
| v0.9.18 | 2026-04-22 | Soar Summary fixes (#91): (1) `summaryError` state + red error banner in the Soar Summary tab — errors are now visible instead of silent. (2) `onUpdateEntry` prop added to `EditDrawer` — updates parent `entries` array and `editEntry` state without closing the drawer; used after generation completes so the summary persists when the drawer is closed and reopened. (3) Fixed drawer closing on "Regenerate Summary" — was caused by `handleGenerateSummary` calling `onSave` (which calls `setEditEntry(null)`); switched to `onUpdateEntry` which has no close side-effect. All in `src/app/lists/page.tsx`. |

## Repository Structure
- **Backend:** `lifelaunchr-app-3/` — Python/FastAPI, deployed on Render
- **Frontend:** `lifelaunchr-next/` (this repo) — Next.js, deployed on Vercel

## Branch → Environment Mapping

| Branch | Backend (Render) | Frontend (Vercel) | Notes |
|---|---|---|---|
| `main` | Staging (`lifelaunchr.onrender.com`) | Preview/staging | Active development |
| `production` | Production (`lifelaunchr-prod.onrender.com`) | Production (`soar.lifelaunchr.com`) | Stable live code |

**Practical rule: push to `main` for staging, test there first, then push to `production` only when ready. Never tag a version until after it has been pushed to production and verified.**

### Step-by-step workflow

**Step 1 — Develop and push to `main` (staging)**
- All code changes are committed and pushed to `main`.
- Vercel deploys automatically from `main` as a preview/staging build.
- Test on staging. Confirm the fix works before touching production.

**Step 2 — Decide what to push to production**
- May be all of `main` (fast-forward) or specific commits (cherry-pick).
- Confirm no Claude worktree has stranded commits that should land in `main` first.
- **Do not delete the current Claude worktree** — deleting it ends the active chat session. Only close a worktree when we explicitly decide to wrap up that session.

**Step 3 — Pre-production checklist**
1. Review what's changing — no accidental deletions:
   ```bash
   git diff origin/production..origin/main --stat
   git diff origin/production..origin/main
   ```
2. Update `CLAUDE.md` with all UI/component changes and commit to `main`.
3. For backend changes, also run `check_wiring.py` and update `FEATURES.md` — see the backend `CLAUDE.md` (`lifelaunchr-app-3`) for the full backend checklist.

**Step 4 — Push to production**

To push all of `main` to production (fast-forward):
```bash
git push --force-with-lease origin main:production
```

To push only specific commits (cherry-pick):
```bash
git checkout production
git cherry-pick <hash1> <hash2>   # in chronological order
git push origin production
git checkout main
```

**Never use** `git checkout production && git merge origin/main` — creates unnecessary merge commits and causes branch divergence. Always use the `main:production` form or cherry-pick.

**Step 5 — Verify the push**
```bash
git log --oneline -1 origin/main && git log --oneline -1 origin/production
```
Confirm production is at the expected commit. If something looks wrong, stop and investigate before tagging.

**Step 6 — Tag the version**

Only tag after production is verified:
```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```
Tag both repos at the same version number when both were updated in the release.

### Branch rules
- **All commits go to `main` only.** Never commit directly to `production`.
- `production` may lag behind `main` — that is normal and expected. `main` must never be behind `production`.
- See the backend `CLAUDE.md` (`lifelaunchr-app-3`) for the full pre-production checklist including `check_wiring.py`.

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

## Product Positioning and Messaging

Soar is positioned as **the AI college and career planning assistant built specifically for the counselor-student-parent team**. This framing should be consistent across all pages, copy, and any new UI.

### Core insight (the "TiVo moment")
Students are already using ChatGPT and Claude for college and career planning — whether their counselor knows it or not. Soar is the version where the counselor is in the loop. Every student conversation builds a shared research record visible to counselors and parents.

### Key differentiators vs. general-purpose AI (Claude, ChatGPT)
1. **Persistent student profiles** — built automatically from conversation; survives across sessions
2. **Real college and scholarship data** — 1,800+ colleges, 6,700+ scholarships, 250+ enrichment programs; no hallucinated acceptance rates
3. **Counseling methodology baked in** — asks the questions students don't know to ask; guides the process step by step rather than just answering queries
4. **Shared research record** — counselor, student, and parent all see the same research; no one is out of the loop
5. **Privacy** — uses the Anthropic API; student conversations are not used to train AI models (unlike Claude.ai/ChatGPT direct)

### Positioning vs. other tools
- **Scoir / Naviance / Maia Learning / College Planner Pro** — complementary; those are CRM/workflow tools; Soar is where the research happens. Key insight: students actually use Soar because it's conversational, not form-based.
- **NerdApply** — complementary; NerdApply does application strategy analysis; Soar handles earlier-stage research and planning.
- **Claude / ChatGPT** — "in addition, not instead." General-purpose AI is fine for practice operations (marketing, comms). Soar is the right tool for the student-facing work.

### Tone and framing rules
- Lead with **counselor fears and opportunities**, not feature lists
- Use **"college and career"** throughout — Soar covers majors, careers, essays, résumés, scholarships, and financial aid, not just college selection
- Avoid "safety, match, and reach" — Soar uses "likely, target, and reach"
- Avoid excessive em-dashes; use periods and colons instead
- The product is **not a smarter Google** — it guides the process, not just answers questions

### Approved taglines (as of v0.9.7.7)
| Context | Tagline |
|---------|---------|
| Signed-in header (tenant tagline in DB) | College and Career Planning, Built for the Whole Team. |
| WelcomeCard (returning users) | The college and career planning assistant that knows you, remembers everything, and gets smarter the more you use it. |
| Landing page hero headline | The AI College and Career Counseling Assistant That Transforms Your Practice |
| Upgrade page hero headline | Your students are already using AI for college and career planning. Soar helps you guide them as they do. |
| layout.tsx metadata description | The AI college and career planning assistant that keeps counselors, students, and parents on the same page. Built on real data, deep counseling methodology, and a shared research record. |

---

## Frontend Pages and Components

### Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Public landing page — auth-aware; signed-in users redirect to /chat; hero with new headline "The AI College and Career Counseling Assistant That Transforms Your Practice"; body copy positions Soar vs. general AI; italic credential line; privacy callout; "How it works" (3 steps); request access form |
| `/chat` | `app/chat/page.tsx` | Main AI chat interface; sidebar with sessions, student picker, schedule button |
| `/profile` | `app/profile/page.tsx` | Student profile (My Info for counselors); GPA, test scores, major, demographics, coach assessment |
| `/lists` | `app/lists/page.tsx` | College, scholarship, and enrichment lists; spreadsheet and card views; drag-to-reorder |
| `/activities` | `app/activities/page.tsx` | Student extracurricular activities; drag-to-reorder; UC/Common App format export via chat |
| `/dashboard` | `app/dashboard/page.tsx` | Counselor student roster; status fields, engagement type, notes, scheduling links |
| `/reports` | `app/reports/page.tsx` | Session reports; two-panel layout (list + form); AI draft; send via SendGrid |
| `/admin` | `app/admin/page.tsx` | Admin panel; tabs: Users, Tiers (super-admin), Tenants (super-admin), Tenant Settings |
| `/safety` | `app/safety/page.tsx` | Safety event review (admin/counselor only) |
| `/upgrade` | `app/upgrade/page.tsx` | Plans & Pricing page — fear-first framing for counselors; hero + case-for-Soar intro; 6 feature cards; student and counselor tier comparison tables; "Works with your tools" section (Scoir/Naviance/Maia/CPP, NerdApply, Claude/ChatGPT); FAQ (9 items); bottom CTA; beta pricing lock-in note |
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
| `WelcomeCard` | `components/chat/WelcomeCard.tsx` | Welcome screen with starter chips; switches between normal and first-session modes (`isFirstSession` prop); role-specific starters via `FIRST_SESSION_STARTERS`; returning-user view shows 6 value prop cards (`VALUE_PROPS`) and 4 starter chips (`STARTERS`); tagline: "The college and career planning assistant that knows you, remembers everything, and gets smarter the more you use it." |
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

The name capture group requires an uppercase first letter (`[A-Z]`) — this rejects generic phrases like "any of these" which start lowercase. The `i` (case-insensitive) flag is intentionally absent for this reason.

All three functions (`extractResearchListOffers`, `extractScholarshipListOffers`, `extractEnrichmentListOffers`) use `matchAll` with the `g` flag and return `string[]`, so a response discussing multiple items renders one button per item rather than just the first.

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
