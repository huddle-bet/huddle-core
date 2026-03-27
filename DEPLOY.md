# Deploying Huddle to Render

Everything except `huddle-bet` runs on Render. The `render.yaml` in this repo defines all four services plus Redis.

## Prerequisites

- A [Render](https://render.com) account (Starter plan ~$7/service/mo)
- All four repos pushed to GitHub under `huddle-bet` org:
  - `huddle-bet/huddle-api`
  - `huddle-bet/huddle-odds`
  - `huddle-bet/huddle-data`
  - `huddle-bet/huddle-engine`
- A Supabase project with the huddle schema

## Quick Start (Blueprint)

Render Blueprints let you deploy everything from `render.yaml` in one shot.

1. Go to **https://dashboard.render.com/blueprints**
2. Click **New Blueprint Instance**
3. Connect the `huddle-bet/huddle-core` repo (which contains `render.yaml`)
4. Render will detect the yaml and show you the services it will create
5. Fill in the env vars it prompts for (see below)
6. Click **Apply** — Render creates all services + Redis at once

## Environment Variables

Each service needs these filled in on Render (marked `sync: false` in the yaml):

### All services
| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

### huddle-api only
| Variable | Value |
|---|---|
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `WHOP_API_KEY` | Whop API key |
| `WHOP_CLIENT_ID` | Whop OAuth client ID |
| `WHOP_CLIENT_SECRET` | Whop OAuth client secret |
| `WHOP_REDIRECT_URI` | e.g. `https://huddle-api.onrender.com/auth/whop/callback` |

`REDIS_URL` is auto-injected by Render from the managed Redis instance.

## Manual Setup (Alternative)

If you prefer to create services individually:

### 1. Create Redis
- Dashboard > New > Redis
- Name: `huddle-redis`
- Region: Oregon
- Plan: Starter
- Eviction policy: allkeys-lru

### 2. Create huddle-api (Web Service)
- Dashboard > New > Web Service
- Connect `huddle-bet/huddle-api`
- Runtime: Node
- Region: Oregon
- Build: `npm install && npm run build`
- Start: `node --import tsx src/server.ts`
- Health check: `/health`
- Add env vars from table above
- Add `REDIS_URL` from the Redis instance's connection string

### 3. Create huddle-odds (Background Worker)
- Dashboard > New > Background Worker
- Connect `huddle-bet/huddle-odds`
- Runtime: Node
- Build: `npm install && npm run build`
- Start: `node --import tsx src/cli.ts poll nba nhl mlb ncaam ncaaw cs2 lol val dota2 cod rl`
- Add `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `REDIS_URL`

### 4. Create huddle-data (Background Worker — Docker)
- Dashboard > New > Background Worker
- Connect `huddle-bet/huddle-data`
- Runtime: **Docker** (uses the Dockerfile in repo root — needed for Python `curl_cffi`)
- Add `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `REDIS_URL`

### 5. Create huddle-engine (Background Worker)
- Dashboard > New > Background Worker
- Connect `huddle-bet/huddle-engine`
- Runtime: Node
- Build: `npm install && npm run build`
- Start: `node --import tsx src/cli.ts worker`
- Add `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `REDIS_URL`

## Verifying the Deploy

1. **huddle-api**: Hit `https://huddle-api.onrender.com/health` — should return 200
2. **huddle-odds**: Check Render logs — should see poll cycles logging odds counts
3. **huddle-data**: Check Render logs — should see schedule discovery + live polling
4. **huddle-engine**: Check Render logs — should see worker loop starting
5. **Redis**: Check the Render Redis dashboard for active connections (should be 4)

## Cost Estimate

| Service | Plan | ~Cost/mo |
|---|---|---|
| huddle-api | Starter | $7 |
| huddle-odds | Starter | $7 |
| huddle-data | Starter | $7 |
| huddle-engine | Starter | $7 |
| huddle-redis | Starter | $10 |
| **Total** | | **~$38/mo** |

## Notes

- **huddle-bet** is deployed separately (Vercel) — it's not in `render.yaml`
- **huddle-core** is an npm package consumed by the other services, not a deployed service
- All services are in Oregon to minimize latency to each other and to Redis
- Render auto-deploys on push to the connected branch (usually `main`)
- To pause a service without deleting it, suspend it from the Render dashboard
