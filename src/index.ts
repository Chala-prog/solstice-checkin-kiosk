// Phase 4 pivot — service entry point.
//
// The vendor is killing the synchronous print API in 48 hours. This is
// no longer a blocking-call service: checkInSync() is not called.
// Kiosk scans now publish a print job to the message queue and return
// immediately with a PENDING state; "Checked In" only appears once the
// vendor's webhook confirms the job actually completed.
//
// The sync call site from the Original Build has been removed here,
// not commented out or left running alongside the async path — see
// checkInServiceSync.ts's deprecation notice, and git history for the
// pre-pivot version.

import { AttendeeStore } from "./attendeeStore";
import { startServer } from "./server";
import { startVendorWorker } from "./vendorWorkerSim";

function main() {
  const store = new AttendeeStore();

  const server = startServer(store);
  startVendorWorker();

  const shutdown = () => {
    console.log("\n[main] shutting down...");
    server.close(() => {
      console.log("[main] server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
