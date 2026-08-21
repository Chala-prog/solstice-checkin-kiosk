# Reprioritized Backlog — Post-Pivot

**Phase:** Refactor & Review (produced alongside the Scope Delta
Analysis, after the pivot shipped)

## P0 — Next up

### 1. Pending-forever handling
- **Originated:** pivot. Flagged in Scope Delta Analysis §5 as the
  biggest conceptual risk — the sync model couldn't get stuck; this one
  can, if a webhook is dropped or never sent.
- **Why P0:** an attendee who never gets confirmed is stuck showing
  "pending" on a kiosk screen with a line of people behind them — a
  visible, immediate operational problem during a live conference, not
  a background data-quality issue.
- **Shape of the fix:** a staleness check on `PENDING` records (already
  have `jobId` and could add a `pendingSince` timestamp) surfaced to
  kiosk staff with a manual override/retry option after N seconds.

## P1 — Soon after

### 2. Webhook authentication
- **Originated:** pivot, explicitly scoped out to stay focused on the
  ordering/dedupe correctness the 48h deadline was actually about.
- **Why P1, not P0:** requires someone with network access to the
  kiosk's endpoint to exploit, not a passive failure mode like pending-
  forever above.
- **Shape of the fix:** same pattern as the Northstar pivot — HMAC
  signature verification on the webhook payload, shared secret with
  the vendor.

### 3. Durable state
- **Originated:** pivot. `AttendeeStore` is an in-memory `Map`.
- **Why P1:** a kiosk restart mid-conference loses all check-in state,
  including anyone mid-`PENDING`. Real risk, but conference kiosks are
  typically low-churn processes once running, so likelihood is lower
  than the two items above.
- **Shape of the fix:** SQLite, same approach as the Northstar sprint's
  equivalent hardening pass.

## P2 — Cleanup, no urgency

### 4. Replace the simulated vendor worker with the real integration
- **Originated:** pivot — `vendorWorkerSim.ts` exists only to make the
  webhook path testable without Solstice's actual vendor.
- **Why P2:** not a defect, it's a placeholder by design. Becomes P0
  the moment there's a real vendor contract to integrate against.

### 5. Automated regression tests
- **Originated:** Refactor & Review. All verification (original spec,
  the 4 required pivot behaviors) was manual curl runs captured in
  this conversation, not a repeatable suite.
- **Shape of the fix:** the test cases already exist as curl commands
  in the Scope Delta Analysis and README — turning them into an
  automated suite is mostly transcription, not new design work.

---

## What's deliberately not on this list

Reverting to the synchronous print API. Per the non-negotiable rules,
the pivot is final — this backlog hardens the new architecture, it
doesn't reopen the decision to move to it.
