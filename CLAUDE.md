@AGENTS.md

# LifeLaunchr / Soar — Deployment Reference

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
