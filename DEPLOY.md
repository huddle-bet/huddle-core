# Deploying Huddle to Render

**This file is canonical.** It lives next to `render.yaml` so the two stay in sync. A copy previously existed at the workspace root and drifted; that copy is now a pointer to this one.

Huddle deploys from **two** Render blueprints:

- **`huddle-core/render.yaml`** — seven services plus the `huddle-shared` env var group.
- **`huddle-discord/render.yaml`** — the Discord bot service plus its own Render Postgres. Independent; see the section at the end.

`huddle-client` does not deploy to Render — the mobile app ships through Expo/EAS.

## Prerequisites

- A [Render](https://render.com) account with billing enabled
- All service repos pushed to GitHub under the `huddle-bet` org (the GitHub org name is still `huddle-bet`; only the client repo was renamed):
  - `huddle-bet/huddle-api`
  - `huddle-bet/huddle-odds`
  - `huddle-bet/huddle-data` — used by **two** services (`huddle-data` and `huddle-reconciler`)
  - `huddle-bet/huddle-engine`
  - `huddle-bet/huddle-live`
  - `huddle-bet/huddle-core` — hosts `render.yaml` and the Byparr wrapper image
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

All services attach to the `huddle-shared` env var group, so shared values (Supabase, internal secret) are entered once and propagated.

## Services created by the blueprint

| Service | Type | Plan | Purpose |
|---|---|---|---|
| `huddle-api` | web (Node) | free | Public REST + WS bridge to clients (`/health`, port 8080) |
| `huddle-live` | web (Node) | **standard** | Live state ingest + internal WS fanout to huddle-api (`/health`, port 8081) |
| `huddle-odds` | worker (Docker) | standard | Sportsbook poller for all leagues |
| `huddle-data` | worker (Docker) | starter | Schedule + final stats ingest |
| `huddle-reconciler` | worker (Docker) | standard | **Same repo as huddle-data**, started with `--mode=reconciler` and `--max-old-space-size=768`. Resolves unmatched games and backfills stats; split out so a slow reconcile walk can't stall live ingest. |
| `huddle-engine` | worker (Node) | standard | Projections, +EV, middles, slips |
| `flaresolverr` | pserv (Docker) | standard | Cloudflare challenge solver for HLTV |

Two things about `flaresolverr` that the name hides:

- It **no longer runs the FlareSolverr image.** It builds `huddle-core/byparr-wrapper/Dockerfile` and runs **Byparr**. The service name was deliberately kept so `FLARESOLVERR_URL` didn't have to change across consumers. To revert: set `runtime: image` with `image.url`, and remove `BYPARR_MODE` from huddle-data and huddle-reconciler.
- Its entrypoint parses the first entry of `FLARESOLVERR_PROXY_URL` deterministically, so its egress IP matches the one huddle-data's cycletls process pins. `cf_clearance` is bound to source IP — mismatched IPs mean no session reuse.

**There is no Redis.** Earlier versions of this doc said huddle-api used Redis for rate limiting. It does not: there is no `redis` dependency in any service, and `@fastify/rate-limit` runs with its default **in-memory** store. Limits are therefore per-process — if huddle-api is ever scaled past one instance, the effective limit multiplies by the instance count.

## Environment variables

### `huddle-shared` env var group

Set once on the group; every service inherits it. All marked `sync: false` in the yaml — Render will prompt during blueprint apply.

| Variable | Required by | Notes |
|---|---|---|
| `DATABASE_URL` | data, engine | Supabase pooler connection string (`postgresql://postgres.<ref>:<pw>@aws-…pooler.supabase.com:5432/postgres`) |
| `SUPABASE_URL` | all | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | all | Service-role JWT (`eyJhbGci…role":"service_role"…`). **Not** the `sb_publishable_…` key — that's the publishable key and will silently fail RLS-protected writes. |
| `SUPABASE_ANON_KEY` | api | Anon JWT — used for client-scoped calls |
| `STRIPE_SECRET_KEY` | api | Stripe secret key. **Absent = nothing can grant Pro**; all gated routes 403 |
| `STRIPE_WEBHOOK_SECRET` | api | Signing secret for the endpoint targeting `/api/v1/webhooks/stripe` |
| `STRIPE_PRICE_ID` | api | Price the Checkout session subscribes to |
| `HUDDLE_INTERNAL_SECRET` | api, live | Shared secret for the huddle-api ↔ huddle-live fanout WS (any 256-bit hex string). **huddle-live will not start without it.** |
| `HUDDLE_LIVE_URL` | api | Internal URL of huddle-live: `http://huddle-live:8081` (Render private DNS). Locally this must be `http://127.0.0.1:8085` — the Render hostname does not resolve off-platform. |
| `FLARESOLVERR_PROXY_URL` | data, reconciler, live, flaresolverr | Comma-separated residential proxy pool. Cycletls pins one entry per process for HLTV cookie/IP affinity; the Byparr entrypoint parses the first entry. Contains credentials. |
| `HLTV_TRANSPORT` | live | Selects the HLTV scorebot transport (`headless` drove the huddle-live starter→standard upgrade). |

**`HUDDLE_LIVE_URL` and `HUDDLE_INTERNAL_SECRET` are the highest-consequence pair here.** If either is unset, huddle-api serves REST normally and every live room stays permanently empty — the service looks healthy from outside. It now logs a loud startup error and reports `status: degraded` on `/health`.

### Service-scoped secrets (set on the individual service, not the group)

These are not in the shared group because not every service needs them. Add them under each service's **Environment** tab in Render.

| Variable | Service | Notes |
|---|---|---|
| `APP_URL` | huddle-api | Public app URL, e.g. `https://app.huddle.bet` |
| `SPORTRADAR_API_KEY` | huddle-data, huddle-live | NBA/NFL/NHL/MLB stats + live |
| `SPORTRADAR_ACCESS_LEVEL` | huddle-data, huddle-live | `trial` or `production` — appears in the API path, so it is not cosmetic |
| `SPORTRADAR_PUSH_KEY` | huddle-live | Push-feed key (separate from REST key on Sportradar's side) |
| `STEAM_API_KEY` | huddle-data, huddle-live | Dota/CS2 resolution. `STEAM_API_KEYS` (plural, comma-separated) is also accepted for round-robin. |
| `THUNDERPICKS_API_KEY` | huddle-odds, huddle-engine | Esports book. huddle-odds also reads the legacy alias `TP_APIKEY`. |
| `FANDUEL_API_KEY` | huddle-odds | Optional. This is a **public client key**, not a secret — the same value appears as the `_ak` query param in FanDuel's web app. Falls back to that public value if unset; pin it in prod. |
| `GROQ_API_KEY` | huddle-engine | LLM features (slip narratives, AI picks) |
| `LOLESPORTS_API_KEY` | huddle-live, huddle-data | LoL Esports feed |
| `OPENDOTA_API_KEY` | huddle-data | Dota stats backfill |

`GENIUS_API_KEY` / `GENIUS_CLIENT_ID` / `GENIUS_CLIENT_SECRET` were removed — the Genius Sports feed was retired in 2026-05 and no code references `GENIUS_*`. `GSK_TOKEN` was removed in ENG-233 along with the last GameScorekeeper caller. Delete all four from Render if still set.

### Service-scoped non-secrets (set in `render.yaml`)

These are baked into the yaml; no action needed. Documented for reference.

| Variable | Service | Value |
|---|---|---|
| `NODE_ENV` | all | `production` |
| `PORT` | huddle-api | `8080` |
| `PORT` | huddle-live | `8081` |
| `PORT` | flaresolverr | `8191` |
| `BYPARR_MODE` | huddle-data, huddle-reconciler | `true` — routes HLTV `/stats` fetches through the Byparr container |
| `FLARESOLVERR_URL` | huddle-data, huddle-reconciler, huddle-live | `http://flaresolverr:8191` (Render private DNS) |

**`FLARESOLVERR_URL` is required by huddle-live, not just huddle-data.** `huddle-live/src/cli.ts:160` gates the entire CS2 live scorebot on its presence — unset, huddle-live logs one warning and CS2 live tracking is off. CS2 is a launch sport, so this is a launch-blocking variable, not an optional one.

## huddle-client (Expo / EAS)

The mobile app ships through Expo, not Render or Vercel. Required env (see `huddle-client/apps/mobile/.env.example`):

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_API_URL` | Public URL of huddle-api, e.g. `https://huddle-api.onrender.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |

`EXPO_PUBLIC_*` values are inlined into the JS bundle at build time and are visible to anyone with the app. Never put a secret in one.

`apps/web` exists in the repo but is **out of MVP scope** and excluded from every `turbo` pipeline. There is no Vercel deployment. The `JWT_SECRET` / `ACCESS_PASSWORD` / `SPORTSDATAIO_API_KEY` variables this doc previously listed under a Vercel section belonged to that unshipped app; none are in use.

## huddle-discord (separate blueprint)

`huddle-discord/render.yaml` is applied independently. It creates:

| Resource | Type | Plan | Purpose |
|---|---|---|---|
| `huddle-discord` | web (Node) | starter | Two bots in one process: daily recap, and content copy + Whop role sync |
| `huddle-db` | Postgres 16 | basic-256mb | Recap duplicate-post protection via a `cron_runs` table |

Notes:

- **This is a second database.** It is not the Supabase bus and carries no sports data — but it exists, and system diagrams that say "one database" are wrong.
- `preDeployCommand: npm run migrate` runs migrations as a one-shot before traffic switches.
- Its env var group is `huddle-discord`, separate from `huddle-shared`. See `huddle-discord/SETUP.md` for the token/guild/channel IDs.

## Verifying the deploy

1. **huddle-api** — `GET https://huddle-api.onrender.com/health` returns 200 **and `status: "ok"`**. `status: "degraded"` with `live_fanout_disconnected` means the huddle-live fanout is down — REST works, live rooms are empty.
2. **huddle-live** — Render logs show provider sockets connecting (Sportradar, HLTV polling scorebot via cycletls, etc.); `/health` returns 200 internally
3. **huddle-odds** — Logs show per-league poll cycles with non-zero odds counts
4. **huddle-data** — Logs show schedule discovery + stats ingest by sport
5. **huddle-reconciler** — Logs show reconcile passes; check `reconcile_dead_letters` isn't growing unbounded
6. **huddle-engine** — Logs show the worker loop and projection refresh cycles
7. **flaresolverr** — Internal-only; verify by running a CS2 backfill (`huddle-data backfill-cs2-history --max-pages 1`) and watching for `/stats` fetch logs
8. **huddle-discord** — `/health` returns 200; both bots report logged-in in the logs
9. **Supabase** — Confirm rows landing in `events`, `live_state`, `odds_snapshots`, `ev_picks` etc.

## Cost estimate (plan tiers actually in the yaml)

| Service | Plan | ~Cost/mo |
|---|---|---|
| huddle-api | free | $0 |
| huddle-live | standard | $25 |
| huddle-odds | standard | $25 |
| huddle-data | starter | $7 |
| huddle-reconciler | standard | $25 |
| huddle-engine | standard | $25 |
| flaresolverr | standard | $25 |
| **Subtotal (huddle-core blueprint)** | | **~$132/mo** |
| huddle-discord | starter | $7 |
| huddle-db (Postgres) | basic-256mb | ~$6 |
| **Total (Render)** | | **~$145/mo** |

Add Supabase (Pro tier ~$25/mo if used) and Expo EAS (free tier / Production $99/mo) for the full picture. If `huddle-api` outgrows free, bump to starter (+$7).

This is roughly **2× the ~$71/mo** the previous version of this table showed. That figure predated `huddle-reconciler` and the `starter → standard` upgrades on `huddle-live` and `flaresolverr`.

## Notes

- **huddle-core** is an npm package consumed by the workers, not a deployed service — but it *is* the repo Render builds the blueprint and the Byparr image from.
- **Rotating any of these?** The runbook lives in `huddle-api` (private) —
  this repo is public, and the procedure carries operational detail that
  shouldn't be.
- **huddle-data's repo backs two services.** Editing its Dockerfile or entrypoint affects `huddle-data` and `huddle-reconciler` both.
- All Render services run in **Oregon** to minimize cross-service latency. Pair with a us-west Supabase project (the prod project is in `us-west-2`).
- Render auto-deploys on push to the connected branch (usually `main`). Suspend a service from the dashboard if you need to pause without deleting.
- The huddle-api ↔ huddle-live fanout uses Render's internal DNS (`http://huddle-live:8081`) — no public ingress required for that path. The `HUDDLE_INTERNAL_SECRET` header is the only auth on it; rotate if leaked.
