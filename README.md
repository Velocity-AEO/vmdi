# VMDI — Velocity Media Distribution Infrastructure

VAEO's internal content publishing platform. Publishes blogs, articles, and case studies with built-in AI detection, humanization, and SEO compliance.

## Quick Start

```bash
# Install root dependencies
npm install

# Run both apps with Doppler secrets injected
doppler run -- npm run dev
```

- Web UI: http://localhost:3000
- API: http://localhost:3001

## Project Structure

```
vmdi/
├── apps/
│   ├── web/                          → Next.js frontend (port 3000)
│   └── api/                          → Next.js API backend (port 3001)
├── modules/
│   ├── a-truth-infrastructure/       → Asset registry, keyword binding
│   ├── b-campaign-orchestration/     → Chatbot, upload ingestor, action log
│   ├── c-content-intelligence/       → AI detection, humanization, uniqueness, schema
│   ├── d-data-scoring/               → Data warehouse, ROI engine, reporting
│   ├── e-client-experience/          → Console, approval workflow, verified profile
│   ├── f-security-compliance/        → IP rights, copyright rules, safety filter
│   └── g-internal-ops/              → Admin console, monitoring, CI/CD
├── packages/                         → Shared packages
├── supabase/
│   ├── migrations/                   → Database migrations
│   └── seed.sql                      → Seed data
├── .github/workflows/ci.yml         → CI: typechecks on push/PR to main
└── vercel.json                       → Monorepo deployment config
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web + API concurrently |
| `npm run dev:web` | Start web UI only (port 3000) |
| `npm run dev:api` | Start API only (port 3001) |
| `npm run build:web` | Build web for production |
| `npm run build:api` | Build API for production |
| `npm run typecheck` | Run TypeScript checks across workspaces |

## Environment Variables

Copy `.env.example` to `.env.local` or use Doppler:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `API_BASE_URL` | Yes | API base URL (default: http://localhost:3001) |
| `GOOGLE_NLP_API_KEY` | No | Google NLP API key for secondary scoring |

## Deployments

- **Web**: https://vmdi-web.vercel.app (apps/web)
- **API**: https://vmdi-api.vercel.app (apps/api)

CI runs typechecks on every push and PR to `main` via GitHub Actions.

## Stack

- Frontend: Next.js
- API: Next.js API routes
- Database: Supabase (Postgres + RLS)
- Hosting: Vercel
- Secrets: Doppler
- AI: Claude (Anthropic SDK)
