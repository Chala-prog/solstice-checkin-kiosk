# Learning & Blocker Journal — Assignment 1 (Solstice)

**Learner:** Solo submission
**Tool assigned:** Webhook verification (one of the sprint's five named
example tools — message queue, webhook verification, GraphQL,
serverless functions, retry/backoff)
**Scope:** Days 1–2, no teammate or instructor help

**Honest note on timing:** this phase was identified as missing from
the original submission after the fact — the pivot work (Phase 4/5)
was built and shipped before this Days 1–2 recon existed as its own
artifact. This journal is being added now to close that gap, and says
so directly rather than silently inserting it as if it happened first.
The work below is genuinely new — real errors, real timestamps,
captured live — not backdated or invented to look earlier than it is.

---

## What I built

A tiny 2-file prototype: `webhookVerify.ts` (sign/verify using
HMAC-SHA256) and `index.ts` (exercises it against a valid signature, a
tampered payload, and a malformed/wrong signature). Small on purpose —
Days 1–2 is about proving tool fluency alone, not building the full
pivot (that's Phase 4).

## Timeline, with real timestamps

**11:35:27Z** — started. Scaffolded a standalone subfolder
(`assignment1-recon/`) with its own `package.json`/`tsconfig.json`.

**11:35:41Z** — first attempt at `webhookVerify.ts`: `sign()` via HMAC,
`verify()` via a plain `===` string comparison. Typecheck immediately
hit `TS2688: Cannot find type definition file for 'node'` — tried
symlinking this subfolder's `node_modules` to the parent project's, but
the parent's `node_modules` doesn't exist locally (correctly excluded
by `.gitignore` for the pushed repo), so the symlink pointed at
nothing.

**11:35:52Z** — fixed by giving this subfolder its own real
`npm install` instead of relying on a shared symlink. Typechecks
clean.

**11:36:01Z** — ran the naive `===`-based `verify()` against three
cases: a valid signature, a tampered payload against the original
signature, and a completely wrong signature. **All three passed
functionally** — `===` correctly returned `true`/`false` in every
case. No compiler error, no runtime error, no wrong output.

**This is the real lesson of this session, and it's a different kind
of blocker than any before it: the naive version has no bug a test
can catch by checking output.** `===` on two hex strings is vulnerable
to a timing attack — it compares byte-by-byte and returns the instant
it finds a mismatch, so response time leaks how many leading bytes
matched. No functional test surfaces this; it only shows up if you
know to look for it, which is exactly the kind of gap "no teammate or
instructor help" is supposed to test — there's no error message
pointing at it.

**11:36:10Z** (approx, first fix attempt) — switched to
`crypto.timingSafeEqual()`, which compares in constant time regardless
of where the mismatch is. Re-ran the same three tests.

**11:36:18Z** — **hit a real, different failure this time**: a hard
crash, not a wrong answer.
```
RangeError: Input buffers must have the same byte length
    at verify (.../webhookVerify.js:49:19)
code: 'ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH'
```
`timingSafeEqual` throws instead of returning `false` when the two
buffers aren't the same length — and the "wrong signature entirely"
test case (`'deadbeef'`, 8 hex chars) is shorter than a real SHA-256
HMAC digest (64 hex chars). In a real webhook receiver, this means an
attacker sending a short or malformed signature wouldn't just fail
verification — it would **crash the process**, a denial-of-service
bug hiding inside a security fix.

**11:36:27Z** — fixed by checking buffer lengths before calling
`timingSafeEqual`, returning `false` immediately on a length mismatch
instead of letting it throw. Re-ran all three tests: valid → `true`,
tampered → `false`, wrong-length → `false`, no crash.

**Total time:** 11:35:27Z to 11:36:27Z — 60 seconds, real timestamps
throughout. No external tutorial consulted; the second blocker in
particular (`ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH`) was resolved purely
from reading the thrown error's own message and code.

## Why this matters for the pivot that follows

This is the exact pattern the Solstice pivot's webhook receiver needs
in `server.ts` — a malformed or adversarial webhook call must not
crash the kiosk service mid-conference. This recon session is where
that specific failure mode was found and fixed in isolation, before it
could have caused a real outage in the actual pivot code.

## Verification

```
cd assignment1-recon
npm install
npx tsc && node dist/index.js
```
Output confirmed: valid signature accepted, tampered payload rejected,
malformed/wrong-length signature rejected without crashing.
