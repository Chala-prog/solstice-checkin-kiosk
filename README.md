![Run Jest Tests](https://github.com/Chala-prog/solstice-checkin-kiosk/actions/workflows/test.yml/badge.svg)

# Phase 4 — Pivot Event: Solstice Events Co. Check-In Kiosk

**Client:** Solstice Events Co. — multi-day tech conference, staff-run
attendee check-in kiosks
**Phase:** Pivot (non-negotiable, 48h, no scope negotiation)
**Type:** Individual submission

---

## The pivot, as given

Solstice's badge-printer vendor is deprecating the synchronous print
API with no extension. The kiosk service has to move from calling the
printer and waiting for an immediate response, to publishing a print
request onto the vendor's message queue and receiving a webhook
callback once printing actually completes. The UI can no longer show
"Checked In" instantly — it must reflect a pending state until the
webhook confirms. Duplicate-scan protection has to hold even though
confirmations may now arrive out of order.

## Why this is a real refactor, not a cosmetic one

Diff between the Original Build and the pivot: **7 files touched, 234
insertions, 30 deletions, 3 new files.** More importantly than the line
count — the *shape* of the problem changed:

- **Control flow inverted.** The original `checkInSync()` returned only
  after the print actually finished. `checkInAsync()` returns
  immediately with a `PENDING` result — the success/failure is no
  longer knowable at the point the function returns at all.
- **A new state had to be introduced.** `AttendeeStatus` gained
  `PENDING`, which didn't need to exist in the sync model — there was
  never a moment where the system had "asked but not yet heard back."
- **Duplicate-scan protection had to move.** In the sync model, checking
  status before printing was sufficient — there was no gap between
  deciding to print and knowing the result. In the async model, the gap
  is the entire point, so the check has to happen at *publish* time
  (before the job even reaches the vendor), not just at *confirmation*
  time.
- **A genuinely new failure mode appeared: stale/duplicate
  confirmations.** The sync model could never receive two answers for
  one print job. The async model can — a vendor retry, a duplicate
  webhook delivery — and the webhook handler has to correlate by
  `jobId` and ignore anything that doesn't match the attendee's
  *current* pending job, or a stale confirmation could corrupt state.

None of this is a renamed function or a moved file — it's a different
correctness model.

## 🧩 System Architecture
The Solstice Check‑in Kiosk follows an asynchronous webhook model:

![Architecture Diagram](docs/architecture-diagram.png.png)

## What's here

```
src/
  attendeeStore.ts        — shared state (NOT_CHECKED_IN / PENDING / CHECKED_IN)
  badgePrinterSync.ts      — DEPRECATED (vendor's sync API, killed by the pivot)
  checkInServiceSync.ts    — DEPRECATED (Original Build's blocking flow)
  messageQueue.ts          — publish-only, no synchronous response
  vendorWorkerSim.ts        — simulates the vendor: consumes the queue,
                               calls back over real HTTP after a variable
                               delay (deliberately creates out-of-order
                               confirmations, not just in theory)
  checkInServiceAsync.ts    — dedupe moved to publish-time
  server.ts                — POST /checkin/:id, GET /status/:id,
                               POST /webhooks/print-complete (correlates
                               by jobId, rejects stale/duplicate confirmations)
  index.ts                 — entry point: server + vendor worker.
                               Sync call site removed, not commented out.
```

## Run it

```bash
npm install
npm run build && npm start
```
Then, e.g.:
```bash
curl -X POST http://localhost:4100/checkin/ATTENDEE-1
curl http://localhost:4100/status/ATTENDEE-1   # PENDING, then CHECKED_IN once the vendor confirms
```

## Verified — all three required behaviors, live, not just typechecked

**1. The spec's required case: 3 attendees + duplicate scan after check-in.**
All three checked in and confirmed; re-scanning `ATTENDEE-1` after
confirmation correctly returned `duplicate_scan`, no second job
published.

**2. Out-of-order confirmation — occurred naturally in Test 1's own run**,
not staged: `ATTENDEE-2`'s job was published *second* but had a
shorter simulated print time, so its webhook confirmation arrived
*before* `ATTENDEE-1`'s — and both attendees still ended up correctly
`CHECKED_IN`, because each webhook is correlated independently by
`jobId`, not by arrival order.

**3. Duplicate scan while still `PENDING`** (before any webhook has
arrived) — re-scanning `ATTENDEE-4` immediately after the first scan
correctly returned `duplicate_scan`, with no second print job
published, before the vendor had even responded.

**4. Stale/duplicate webhook delivery** — manually re-sent a webhook
confirmation for a job that had already completed and confirmed. The
handler correctly logged `ignored stale/duplicate confirmation` and
left the attendee's status untouched at `CHECKED_IN`, rather than
double-processing or corrupting state.

## Non-negotiable rules observed

- Real, committed progress — 6 commits, in dependency order (store +
  queue → vendor worker → async service + webhook → sync code
  deprecated → entry point rewired), not one dump-all commit.
- Old code visibly deprecated, not deleted or left running
  side-by-side — `badgePrinterSync.ts` and `checkInServiceSync.ts` are
  `@deprecated` and unreachable from `index.ts`, verifiable by the
  import graph, not just by claim.
- The pivot is treated as final — no fallback to the sync path, no
  negotiating the duplicate-scan or ordering requirements away.

## Assignment 1 — Days 1-2 Solo Recon (added as a gap fix)

`assignment1-recon/` — a standalone mini-prototype for
**webhook verification**, one of the sprint's five named example
tools, learned in isolation before it was used in the actual pivot.
Includes `LEARNING_AND_BLOCKER_JOURNAL.md` with real timestamps and
two genuine blockers: a `TS2688` config issue, and a subtler one no
compiler catches — a naive `===` signature comparison that's
functionally correct but timing-attack-vulnerable, whose fix
(`crypto.timingSafeEqual`) then introduced a real crash on
mismatched-length input, fixed by checking lengths first.

**Honesty note:** this phase was identified as missing after the pivot
work (below) was already built and shipped. It's added here as a
genuine backfill — real work, real timestamps, done now — not
pretended to have happened before the pivot.

## Refactor & Review docs

- `docs/SCOPE_DELTA_ANALYSIS.md` — Dropped/Modified/Added, a regression
  check against the client's original 4 bullets, and honestly-stated
  trade-offs
- `docs/BACKLOG.md` — what's still open, ranked by real risk
- `docs/ADAPTABILITY_INDEX.md` — confidential self-assessment; states
  its own limitation as a self-rating rather than a peer rating

