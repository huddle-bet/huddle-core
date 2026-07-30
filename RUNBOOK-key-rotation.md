# Runbook — rotating Supabase keys and shared secrets

Written for ENG-251. Companion to `DEPLOY.md`.

## Which secret, and what it costs to rotate

| Secret | Held by | Blast radius if leaked | Rotation cost |
|---|---|---|---|
| `SUPABASE_SERVICE_KEY` | api, live, data, odds, engine | **Total.** Bypasses RLS on all 47 tables. | One env-group edit, five service restarts |
| `DATABASE_URL` | data, engine (+ reconciler) | **Total.** Direct Postgres, also bypasses RLS. | Supabase dashboard + env-group edit |
| `HUDDLE_INTERNAL_SECRET` | api, live | Fanout WS auth only | Must change on **both** simultaneously — see below |
| `SUPABASE_ANON_KEY` | api | Low. Subject to RLS. | Env-group edit |
| `WHOP_*` | api | Billing/entitlements | Whop dashboard + env-group edit |
| `FLARESOLVERR_PROXY_URL` | data, live, reconciler, flaresolverr | Proxy quota theft | Webshare dashboard + env-group edit |
| Provider keys (`SPORTRADAR_*`, `STEAM_*`, …) | per service | Quota theft, feed loss | Vendor dashboard + service env edit |

## Rotating `SUPABASE_SERVICE_KEY`

The five services all read it from the **`huddle-shared`** Render env group, so this is one edit, not five.

1. Supabase dashboard → Project Settings → API → roll the `service_role` key.
   **Both old and new are valid until you save**; there is no overlap window afterwards.
2. Render → Env Groups → `huddle-shared` → update `SUPABASE_SERVICE_KEY`.
3. Render restarts every attached service automatically. Watch for all five to
   come back before declaring done.
4. Verify — do not assume:
   - `GET https://huddle-api.onrender.com/health` returns `200` and `status: "ok"`.
     `status: "degraded"` means the fanout is down, which is a different problem.
   - huddle-data logs show a schedule write completing.
   - huddle-live logs show `live_state` upserts.

**There is no zero-downtime path.** Rolling the key invalidates the old one
immediately, so every service is broken between step 1 and step 3 finishing.
Do it during a quiet window. If that's unacceptable, add the new key as a
second variable, deploy code that prefers it, then remove the old one.

## Rotating `HUDDLE_INTERNAL_SECRET`

The one that bites. huddle-api and huddle-live must agree, and **huddle-live
refuses to start without it**.

Changing it in `huddle-shared` updates both, but they restart independently —
so there is a window where one has the new value and the other the old. The
fanout drops and reconnects. huddle-api reports `status: "degraded"` with
`live_fanout_disconnected`, live rooms stay empty, REST keeps serving.

Expect a gap of a minute or two. Confirm recovery via `/health` showing
`status: "ok"`, not just a `200`.

## Rotating `DATABASE_URL`

Supabase dashboard → Settings → Database → reset password. This changes the
pooler connection string. Update `huddle-shared`, then verify huddle-data and
huddle-engine reconnect.

⚠️ **Rotate this now if you haven't since 2026-07-30.** A production pooler DSN
including its password was committed to `huddle-data/.claude/settings.local.json`
and is in that repo's pushed history. See ENG-250.

## After any rotation

- Update your local `.env` files. Nothing warns you when they go stale; you just
  get confusing auth failures next time you run `./dev.sh start`.
- Never paste the new value into chat, a ticket, or a commit message.

---

# Audit — can any service hold a smaller key?

Measured 2026-07-30.

## Current state

`SUPABASE_SERVICE_KEY` is in five `.env` files and the shared Render group.
Every one of the five **writes** to Supabase:

| Service | `.from()` calls | write ops |
|---|---|---|
| huddle-data | 348 | 83 |
| huddle-api | 60 | 22 |
| huddle-engine | 47 | 16 |
| huddle-live | 33 | 43 |
| huddle-odds | 3 | 10 |

**36 of 47 public tables have RLS enabled with zero policies.** That is the
documented design — backend tables get no policies and the service role
bypasses RLS. The consequence is that `anon` and `authenticated` receive **zero
rows** from those tables, so no service can simply be handed a smaller key.
Reducing blast radius means *writing policies*, not swapping a credential.

## The one service worth changing

**huddle-api is the only internet-facing service.** The other four are Render
workers with no public ingress, so a leak there requires already being inside
the deploy. huddle-api is where a smaller key actually buys something.

Its writes are confined to **four user-facing tables, all of which already have
RLS policies**:

| Table | Policies |
|---|---|
| `user_picks` | SELECT, INSERT, UPDATE, DELETE |
| `reactions` | SELECT, INSERT, DELETE |
| `follows` | SELECT, INSERT, DELETE |
| `comments` | SELECT, UPDATE — **no INSERT or DELETE** |

So the write side is nearly ready to run under `anon` + a user JWT today. The
gap is `comments`, which can be read and edited under RLS but not created or
removed.

The read side is the real work. Of the 30 tables and views huddle-api touches,
**11 tables have no policy**: `events`, `teams`, `players`, `odds_current`,
`live_state`, `live_feed`, `game_summaries`, `player_game_stats`,
`ev_opportunities`, `pick_outcomes`, `reputation_events`. These are reference
and derived data with no per-user dimension, so a blanket read policy is
straightforward — but it is 11 deliberate decisions about what an unauthenticated
client may see, and several (`ev_opportunities`, `pick_outcomes`) are the
subscription-gated product.

The 10 views need nothing: they carry `security_invoker`, so they inherit
whatever the base tables enforce.

## Recommendation

1. **Keep service-role on the four workers.** No ingress, and every alternative
   costs policy work for no reduction in real exposure.
2. **Move huddle-api to `anon` + user JWT.** Add the two missing `comments`
   policies, then read policies for the 11 reference tables. This is the only
   change that shrinks blast radius where it matters — and it converts
   subscription gating from application logic into a database guarantee.
3. **Do not treat this as a key-swap.** It is an RLS design task; sizeable, and
   worth its own issue rather than being folded into a rotation.
