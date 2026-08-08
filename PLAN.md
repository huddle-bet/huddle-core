# huddle-core — plan and state

`SPEC.md` describes what this package holds. This describes **where it stands and what is
left**, and it is the thing to reconcile against Linear.

huddle-core is not a utility library. It is the layer whose entire purpose is that **every
service agrees** — canonical ids, the league registry, the shared stat shapes. A utility
library that drifts costs one service a bug. This one costs the services their agreement,
which is the only thing making a canonical id canonical.

**Rule: nothing here is "done" until the Linear issue says so, with the measurement attached.**

---

## Measured state — 2026-08-08

```
tests                    412 across 28 files, check-types clean
source                   57 .ts files, 10,558 lines
dist                     rebuilds byte-identical from committed src (0 files differ)
consumers                5 services, 86 files importing @huddle-bet/core
```

Consumer breakdown, by files that import it:

```
huddle-data    25        huddle-api     20        huddle-engine  16
huddle-odds    19        huddle-live     6        huddle-client   0
```

huddle-client's zero is expected, not a gap — it consumes the API contract through
`packages/shared-types`, not this package.

---

## How it reaches the services, which is the thing to understand

There is no registry and no version. Every consumer depends on:

```
"@huddle-bet/core": "github:huddle-bet/huddle-core#master"
```

npm installing from a GitHub URL does **not** run a build, and there is no `prepare` hook.
So consumers import `dist/` exactly as committed — 232 tracked files. Two consequences, and
they pull in opposite directions:

**`dist` must be committed in step with `src`.** Nothing about the language enforces this; a
commit touching only `src` would ship stale code to five services with CI green. This one is
handled — `.github/workflows/ci.yml:42` rebuilds and fails if `dist` differs. Verified today
by rebuilding from committed src: zero files changed.

**A merge to master reaches nobody until each consumer reinstalls.** `#master` is a moving
target resolved *once*, at install time, and frozen into the consumer's `package-lock.json`.
Nothing pulls. This is ENG-472, and the check it shipped is doing its job.

### Pin freshness — measured 2026-08-08

`./.audit/repo-sweep.sh`, against each repo's default branch:

```
core origin/master  38422335
huddle-api      1f5a05b1   7 commits behind
huddle-live     95fa734e  10 commits behind
huddle-engine   22efc905   1 commit  behind
huddle-data     38422335  current
huddle-odds     38422335  current
```

What those three are missing, verified against the installed copy rather than inferred from
the sha:

```
                normalizeTeamName("Grêmio")   == "Gremio"?   stripOrgSuffix   EventStatus postponed/suspended
huddle-data     gremio                        YES            present          yes
huddle-odds     gremio                        YES            present          yes
huddle-api      grêmio                        NO             absent           NO
huddle-engine   grêmio                        NO             absent           NO
huddle-live     grêmio                        NO             absent           NO
```

**Latent, not live.** All three have zero `normalizeTeamName` call sites, so nothing currently
derives an id from the stale implementation. Stated plainly so it is not read as a fifth
canonical defect — it is a loaded gun, not a fired one.

The one that already costs something is huddle-api's `EventStatus`: its pin predates ENG-520,
so `postponed` and `suspended` are not members of the union it compiles against. That reframes
part of ENG-522 from unwritten API code into an install from seven commits ago. Recorded there.

**The gap is not the check. It is that nobody ran it for a week.** ENG-472 deliberately reports
distance rather than gating, on the grounds that a consumer legitimately lags and a
permanently-red gate teaches people to ignore it. That reasoning still holds — this drift was
found by hand and the sweep reported exactly the same thing when finally run.

---

## Outstanding, with the issue that owns it

### Core's half is done, the consumers' half is not

| | |
|---|---|
| ENG-520 | `EventStatus` gained `postponed`/`suspended` in `bcf7e0a`; no service can record either until it is pinned and served — ENG-522, ENG-517 |
| ENG-554 | diacritic fold shipped in `22efc90`; huddle-api, huddle-live, huddle-engine do not have it |
| ENG-403 | launch scope gating shipped in `2bc5ac6` |

### Real work, open

| | |
|---|---|
| ENG-471 | `canonical_event_id` embeds the game date, so a postponed game orphans everything joined to it |
| ENG-431 | unresolved-entity failure path for canonicalization |
| ENG-460 | two writers put two stat shapes in `player_game_stats`; `mlbPlayerStats` is shared from here to keep huddle-data and huddle-live identical |

---

## Standing checks

```bash
npm run check-types              # tsc --noEmit
npm test                         # 412
npm run build && git diff --quiet -- dist   # what CI enforces; dist must not drift from src

cd .. && ./.audit/repo-sweep.sh  # includes huddle-core pin freshness (ENG-472)
```

The sweep needs every repo checked out in one tree, which is why it lives at the workspace
root rather than here.

---

## Invariants that look like bugs

Three things in this package read as defects on first inspection and are deliberate. Each cost
someone an investigation already.

**`canonicalEventId` sorts the two team ids.** `const [a, b] = [key.teamIdA, key.teamIdB].sort()`.
So away/home ordering inside the string is roughly 50/50 by chance, and a scan of canonicals
showing an ~870/853 split is the sort working, not a systemic ordering defect. Sorting is what
makes the id independent of which side the upstream feed calls home.

**`normalizeTeamName` does not apply `searchName`'s trailing `[^a-z0-9]` strip.** It looks like
an inconsistency between two functions that should agree. Applying it folds 7 dota and 3
valorant CJK/Cyrillic names to the empty string, which then collide with each other.

**`stripOrgSuffix` never mints an id.** It strips trailing org tokens (`esports`, `esport`,
`gaming`, `team`, `cs`) and never roster qualifiers (`academy`, `junior`, `nxt`, `prospects`,
`fe`) — because `paiN Gaming` and `paiN Gaming Academy` are different rosters. The contract is
that a caller looks up the stripped key and accepts **only on a hit**. A caller that minted an
id from the stripped name would merge two real teams.

---

## Failure modes this package actually has

A defect here does not look like a defect here. It looks like a defect in whichever service
noticed first — which is why all three of these were found somewhere else and fixed here.

- `normalizeTeamName` never folded diacritics, so one club got two ids. Found in huddle-data's
  CS2 backfill; the fix belongs to every consumer (ENG-554).
- the org-suffix strip existed in one writer and not the other, so one repo's fix was the
  other's gap. Shared here in `#26`.
- a stale pin has none of the usual symptoms — not a missing dependency, not a version
  conflict, not a type error. The code compiles, the tests pass, and the service runs correctly
  against configuration that is weeks out of date (ENG-472).

That last one is the shape to watch. **A green CI in a consumer proves nothing about which
version of this package it is green against.**
