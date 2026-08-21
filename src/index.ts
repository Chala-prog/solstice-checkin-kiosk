import { AttendeeStore } from "./attendeeStore";
import { checkInSync } from "./checkInServiceSync";

async function main() {
  const store = new AttendeeStore();

  console.log("--- Original (synchronous) check-in flow ---\n");

  // 3 test attendees, including one duplicate-scan case, per spec.
  const scans = ["ATTENDEE-1", "ATTENDEE-2", "ATTENDEE-1", "ATTENDEE-3"];

  for (const attendeeId of scans) {
    const result = await checkInSync(store, attendeeId);
    if (result.outcome === "checked_in") {
      console.log(`[kiosk] ${attendeeId}: badge printed, screen shows "Checked In"`);
    } else {
      console.log(`[kiosk] ${attendeeId}: DUPLICATE SCAN — no second badge printed`);
    }
  }

  console.log("\nFinal statuses:");
  for (const attendeeId of ["ATTENDEE-1", "ATTENDEE-2", "ATTENDEE-3"]) {
    console.log(`  ${attendeeId}: ${store.getStatus(attendeeId)}`);
  }
}

main();
