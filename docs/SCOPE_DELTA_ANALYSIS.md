# Scope Delta Analysis — Sync Print API → Async Message Queue + Webhook

**Client:** Solstice Events Co.
**Author:** Solo submission
**Baseline compared:** commit `86b730d` (Original Build, spec-complete) →
`9b5d7df` (Pivot complete, incl. README)
**Raw diff:** 8 files changed, 351 insertions, 30 deletions, 4 new files

---

## 1. What was dropped

| Item | Why it's gone | Where it lives now |
|---|---|---|
| Live call to `printBadgeSync()` | The vendor is killing this synchronous API in 48h — non-negotiable, no fallback | Marked `@deprecated` in `badgePrinterSync.ts`, unreachable from `index.ts` (confirmed by grep — zero live call sites) |
| Live use of `checkInSync()` | Only existed to drive the blocking flow, which no longer runs | Marked `@deprecated` in `checkInServiceSync.ts`, unreachable from the running service |
| "Instant success" as a UI guarantee | The sync model could show "Checked In" the moment the call returned, because the call didn't return until printing was done. That guarantee is structurally gone. | Replaced by the `PENDING` state — see Modified, below |

Nothing was silently deleted. Both deprecated files remain in the repo
with explicit `@deprecated` headers, per the pivot's non-negotiable
rule — verifiable by inspection, not just by claim.

## 2. What was modified

| Item | Before (Original Build) | After (Pivot) | Breaking for the client's requirements? |
|---|---|---|---|
| `AttendeeStatus` | `NOT_CHECKED_IN` \| `CHECKED_IN` | `NOT_CHECKED_IN` \| `PENDING` \| `CHECKED_IN` | No — additive. Required by the pivot memo directly. |
| Duplicate-scan check timing | At print-call time (before the blocking call) | At **publish** time (before the job even reaches the vendor) | No — same guarantee, moved earlier because the async model has a real gap between "decided to print" and "know the result" that the sync model never had |
| "Checked In" trigger | Function return, after `await printBadgeSync()` | Webhook confirmation, correlated by `jobId` | No — client's underlying requirement ("only show Checked In once printing has actually succeeded") still holds; only the *mechanism* changed, and the pivot memo explicitly directs this change |

Regression-checked live, post-pivot: 3 fresh attendees (`REG-1`,
`REG-2`, `REG-3`) all correctly reached `CHECKED_IN`, and re-scanning
`REG-1` after confirmation correctly returned `duplicate_scan` — the
client's original minimum test case (3 attendees + 1 duplicate) still
passes under the new architecture, not just under the old one.

## 3. What was added

| Item | Why it had to exist |
|---|---|
| `messageQueue.ts` | The core of the pivot — publish-only, no synchronous response, which is the entire point of the architecture change |
| `vendorWorkerSim.ts` | Needed to actually exercise the webhook path end-to-end. Modeled as a real HTTP caller with a *variable* delay specifically so out-of-order confirmations happen naturally in testing, not just in theory |
| `checkInServiceAsync.ts` | Dedupe-before-publish logic — a genuinely new responsibility the sync model's dedupe-before-call logic couldn't just be renamed into |
| `server.ts`'s `/webhooks/print-complete` handler | A new failure surface that didn't exist before: incoming, unsolicited, possibly-stale-or-duplicate confirmations that have to be correlated by `jobId`, not just trusted |
| `GET /status/:attendeeId` | The UI needs a way to poll for the `PENDING` → `CHECKED_IN` transition, since it can no longer just trust its own button-press to mean success |

## 4. Regression check — did the pivot break the client's stated requirements?

**No breaking changes to the client's actual requirements found.**
Going bullet by bullet against the original ask:

- *"Handle at least 3 test attendees, including one duplicate-scan
  case"* — ✅ still passes, verified live post-pivot (see above), and
  additionally verified against two harder cases the client's pivot
  memo specifically added: a duplicate scan while still `PENDING`, and
  a stale/duplicate webhook redelivery. Both correctly rejected/ignored.
- *"'Checked In' shown only once printing has actually succeeded"* —
  ✅ still holds; the mechanism enforcing it changed from "the call
  blocked" to "the webhook confirmed," per the pivot memo's own
  instruction.
- *"Calls the vendor synchronously"* / *"waits for the print job's
  response before doing anything else"* — intentionally not preserved.
  These describe the exact architecture the client's pivot memo
  ordered killed. Treating them as still-binding would mean refusing
  to pivot at all.

## 5. Trade-offs and risks introduced by the pivot

- **Confirmation is no longer guaranteed to arrive.** The sync model
  couldn't get "stuck" — it either succeeded or the awaited promise
  rejected. The async model can leave an attendee in `PENDING`
  indefinitely if the vendor's webhook is dropped, retried by the
  vendor's own infrastructure in a way this service doesn't handle, or
  simply never sent. **Not addressed in this pivot** — flagged here
  rather than quietly ignored. A staff-facing "still pending after Ns,
  offer manual override" path is the natural next addition, out of
  scope for the 48-hour window.
- **In-memory-only state.** `AttendeeStore` is a `Map`, same limitation
  flagged in the Northstar sprint's equivalent pivot — a kiosk service
  restart mid-conference would lose every attendee's status, including
  anyone stuck in `PENDING`.
- **No webhook authentication.** Unlike the Northstar pivot (which
  added HMAC signature verification), this webhook endpoint accepts
  any POST to `/webhooks/print-complete` with a well-formed body. For
  a real deployment, anyone who can reach the kiosk's network could
  falsely confirm (or fail to confirm) a check-in. Deliberately scoped
  out here to keep the pivot focused on the stated deadline pressure
  (queue + webhook + ordering correctness), not security hardening —
  but it's a real gap, not an oversight.
- **Vendor worker is simulated, not real.** `vendorWorkerSim.ts`
  exists specifically so the webhook path could be tested at all. A
  real deployment would remove this file entirely and point at
  Solstice's actual vendor's real queue/webhook contract, which may
  have different retry, ordering, or payload-format behavior than
  simulated here.

## 6. Time cost

Original Build (baseline): ~15 minutes, verified end-to-end before the
pivot began, so the "before" state was a real working system, not a
stub. Pivot itself: ~20 minutes across 5 commits (state/queue → vendor
worker → async service/webhook → deprecation → entry point rewire),
including live testing of all 4 required behaviors (3 attendees +
duplicate, out-of-order confirmation, pending-state duplicate scan,
stale webhook redelivery). No external help used, consistent with the
sprint's rules.
