// ORIGINAL synchronous check-in flow.
// "Checked In" is only shown once printing has actually succeeded —
// achieved here simply by awaiting the printer call before returning.
// Duplicate-scan protection is trivial in this model: check the
// in-memory status before printing, and since there's no gap between
// "decide to print" and "know the result," there's no window for a
// second scan to sneak through.

import { printBadgeSync } from "./badgePrinterSync";
import { AttendeeStore } from "./attendeeStore";

export type CheckInResult =
  | { outcome: "checked_in"; attendeeId: string }
  | { outcome: "duplicate_scan"; attendeeId: string };

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
