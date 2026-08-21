import { printBadgeSync } from "./badgePrinterSync";
import { AttendeeStore } from "./attendeeStore";

// DEPRECATED — Phase 4 pivot. Superseded by checkInServiceAsync.ts.
// Not called by the running service. Kept so the before/after diff is
// visible in the repo rather than silently rewritten in place.

/** @deprecated Superseded by checkInServiceAsync.ts. Not called. */
export type CheckInResult =
  | { outcome: "checked_in"; attendeeId: string }
  | { outcome: "duplicate_scan"; attendeeId: string };

/** @deprecated Superseded by checkInServiceAsync.ts. Not called. */
export async function checkInSync(
  store: AttendeeStore,
  attendeeId: string
): Promise<CheckInResult> {
  if (store.getStatus(attendeeId) === "CHECKED_IN") {
    // Already checked in — do NOT print a second badge.
    return { outcome: "duplicate_scan", attendeeId };
  }

  const result = await printBadgeSync(attendeeId);
  if (result.success) {
    store.markCheckedIn(attendeeId);
  }
  return { outcome: "checked_in", attendeeId };
}
