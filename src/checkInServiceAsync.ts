import { randomUUID } from "crypto";
import { AttendeeStore } from "./attendeeStore";
import { publishPrintJob } from "./messageQueue";

export type CheckInResult =
  | { outcome: "pending"; attendeeId: string; jobId: string }
  | { outcome: "duplicate_scan"; attendeeId: string };

// Duplicate-scan protection now has to happen BEFORE publishing, not
// after a response comes back — there is no "after," in the
// synchronous sense, anymore. If an attendee is already CHECKED_IN or
// already has a job PENDING, a second scan must not publish a second
// print job, full stop — the UI's pending state depends on this being
// correct, since there's no way to "un-print" a badge once it's queued.
export function checkInAsync(store: AttendeeStore, attendeeId: string): CheckInResult {
  const status = store.getStatus(attendeeId);

  if (status === "CHECKED_IN" || status === "PENDING") {
    return { outcome: "duplicate_scan", attendeeId };
  }

  const jobId = randomUUID();
  store.markPending(attendeeId, jobId);
  publishPrintJob({ jobId, attendeeId });

  return { outcome: "pending", attendeeId, jobId };
}
