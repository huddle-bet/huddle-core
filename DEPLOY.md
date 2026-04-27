# Deploying Huddle to Render

Everything except `huddle-bet` runs on Render. `huddle-core/render.yaml` defines all five Render services plus the shared FlareSolverr private service. `huddle-bet` runs on Vercel.

## Prerequisites

- A [Render](https://render.com) account with billing enabled
- All service repos pushed to GitHub under the `huddle-bet` org:
  - `huddle-bet/huddle-api`
  - `huddle-bet/huddle-odds`
  - `huddle-bet/huddle-data`
  - `huddle-bet/huddle-engine`
  - `huddle-bet/huddle-live`
- A Supabase project with the huddle schema applied (see `supabase/migrations`)
- Provider API keys (Sportradar, ThunderPicks, Groq, Steam, etc.) — see env table below

## Quick Start (Blueprint)

`huddle-core/render.yaml` is the source of truth. Render Blueprints can apply it in one shot.

1. Go to **https://dashboard.render.com/blueprints**
2. Click **New Blueprint Instance**
3. Connect the repo containing `render.yaml` (currently `huddle-bet/huddle-core`)
4. Render parses the yaml and previews the services + the `huddle-shared` env var group
5. Fill in every value marked `sync: false` (Render will prompt — see env table below)
6. Click **Apply**

All services attach to the `huddle-shared` env var group, so shared values (Supabase, Whop, internal secret) are entered once and propagated.

## Services created by the blueprint

| Service | Type | Plan | Purpose |
|---|---|---|---|
| `huddle-api` | web (Node) | free | Public REST + WS bridge to browsers (`/health`) |
| `huddle-live` | web (Node) | starter | Live state ingest + internal WS fanout to huddle-api (`/health`, port 8081) |
| `huddle-odds` | worker (Docker) | standard | Sportsbook poller for all leagues |
| `huddle-data` | worker (Docker) | starter | Schedule + final stats ingest |
| `huddle-engine` | worker (Node) | standard | Projections, +EV, middles, slips |
| `flaresolverr` | pserv (image) | starter | CF JS-challenge solver — only used by huddle-data's CS2 /stats backfill |

`huddle-bet` is **not** in `render.yaml`. It deploys to Vercel separately.

Redis is **not** currently provisioned by `render.yaml`. huddle-api uses it for rate limiting; if you want Redis, create a Render Key Value instance and add `REDIS_URL` to the `huddle-shared` group.

## Environment variables

### `huddle-shared` env var group

Set once on the group; every service inherits it. All marked `sync: false` in the yaml — Render will prompt during blueprint apply.

| Variable | Required by | Notes |
|---|---|---|
| `DATABASE_URL` | data, engine | Supabase pooler connection string (`postgresql://postgres.<ref>:<pw>@aws-…pooler.supabase.com:5432/postgres`) |
| `SUPABASE_URL` | all | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | all | Service-role JWT (`eyJhbGci…role":"service_role"…`). **Not** the `sb_publishable_…` key — that's the publishable key and will silently fail RLS-protected writes. |
| `SUPABASE_ANON_KEY` | api | Anon JWT — used for browser-scoped client calls |
| `WHOP_API_KEY` | api | Whop server API key |
| `WHOP_CLIENT_ID` | api | OAuth client ID |
| `WHOP_CLIENT_SECRET` | api | OAuth client secret |
| `WHOP_REDIRECT_URI` | api | e.g. `https://huddle-api.onrender.com/auth/whop/callback` |
| `HUDDLE_INTERNAL_SECRET` | api, live | Shared secret for the huddle-api ↔ huddle-live fanout WS (any 256-bit hex string) |
| `HUDDLE_LIVE_URL` | api | Internal URL of huddle-live, e.g. `http://huddle-live:8081` (Render private DNS) or `https://huddle-live.onrender.com` |

### Service-scoped secrets (set on the individual service, not the group)

These are not in the shared group because not every service needs them. Add them under each service's **Environment** tab in Render.

| Variable | Service | Notes |
|---|---|---|
| `WHOP_WEBHOOK_SECRET` | huddle-api | Whop webhook signing secret (rejects unsigned events) |
| `APP_URL` | huddle-api | Public app URL for OAuth redirects, e.g. `https://app.huddle.bet` |
| `SPORTRADAR_API_KEY` | huddle-data | NBA/NHL/MLB stats ingest |
| `SPORTRADAR_ACCESS_LEVEL` | huddle-data | `trial` or `production` |
| `SPORTRADAR_PUSH_KEY` | huddle-live | Push-feed key (separate from REST key on Sportradar's side) |
| `STEAM_API_KEY` | huddle-data, huddle-live | Dota/CS2 resolution. `STEAM_API_KEYS` (plural, comma-separated) is also accepted for round-robin. |
| `THUNDERPICKS_API_KEY` | huddle-odds | Esports book |
| `FANDUEL_API_KEY` | huddle-odds | Optional — falls back to public key if unset, but pin in prod |
| `GROQ_API_KEY` | huddle-engine | LLM features (slip narratives, AI picks) |
| `LOLESPORTS_API_KEY` | huddle-live | LoL Esports feed |
| `OPENDOTA_API_KEY` | huddle-data | Dota stats backfill |
| `GENIUS_API_KEY` / `GENIUS_CLIENT_ID` / `GENIUS_CLIENT_SECRET` | huddle-live | Genius Sports feed (NFL/NCAAF/NCAAM) — only set if `GENIUS_SOURCE=genius` |

### Service-scoped non-secrets (set in `render.yaml`)

These are baked into the yaml; no action needed. Documented for reference.

| Variable | Service | Value |
|---|---|---|
| `NODE_ENV` | all | `production` |
| `PORT` | huddle-api | `8080` |
| `PORT` | huddle-live | `8081` |
| `FLARESOLVERR_URL` | huddle-data | `http://flaresolverr:8191` (Render private DNS) — only used during CS2 /stats backfill |
| `FLARESOLVERR_PROXY_URL` | huddle-data, huddle-live | Comma-separated residential proxy pool. Cycletls pins one entry per process for HLTV cookie/IP affinity; FlareSolverr passes it through on /stats solves. |

## huddle-bet (Vercel)

Deployed separately from a connected GitHub repo. Required env:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | Public URL of huddle-api, e.g. `https://huddle-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | Public WS URL of huddle-api, e.g. `wss://huddle-api.onrender.com` |
| `JWT_SECRET` | App JWT signing secret. **Not** the placeholder. |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `ACCESS_PASSWORD` | Optional gating password during private beta |
| `SPORTSDATAIO_API_KEY` | If any Vercel-side ingest is still in use; otherwise omit |

## Verifying the deploy

1. **huddle-api** — `GET https://huddle-api.onrender.com/health` returns 200
2. **huddle-live** — Render logs show provider sockets connecting (Sportradar, HLTV polling scorebot via cycletls, etc.); `/health` returns 200 internally
3. **huddle-odds** — Logs show per-league poll cycles with non-zero odds counts
4. **huddle-data** — Logs show schedule discovery + stats ingest by sport
5. **huddle-engine** — Logs show the worker loop and projection refresh cycles
6. **flaresolverr** — Internal-only; verify by running a CS2 backfill (`huddle-data backfill-cs2-history --max-pages 1`) and watching for /stats fetch logs
7. **Supabase** — Confirm rows landing in `events`, `live_state`, `odds_snapshots`, `ev_picks` etc.

## Cost estimate (current plan tiers in render.yaml)

| Service | Plan | ~Cost/mo |
|---|---|---|
| huddle-api | free | $0 |
| huddle-live | starter | $7 |
| huddle-odds | standard | $25 |
| huddle-data | starter | $7 |
| huddle-engine | standard | $25 |
| flaresolverr | starter | $7 |
| **Total (Render)** | | **~$71/mo** |

Add Supabase (Pro tier ~$25/mo if used) and Vercel (Hobby free / Pro $20/mo) for the full picture. If `huddle-api` outgrows free, bump to starter (+$7).

## Notes

- **huddle-bet** is on Vercel; it is intentionally not in `render.yaml`.
- **huddle-core** is an npm package consumed by the workers, not a deployed service.
- All Render services run in **Oregon** to minimize cross-service latency. Pair with a us-west Supabase project (the prod project is in `us-west-2`).
- Render auto-deploys on push to the connected branch (usually `main`). Suspend a service from the dashboard if you need to pause without deleting.
- The huddle-api ↔ huddle-live fanout uses Render's internal DNS (`http://huddle-live:8081`) — no public ingress required for that path. The `HUDDLE_INTERNAL_SECRET` header is the only auth on it; rotate if leaked.
