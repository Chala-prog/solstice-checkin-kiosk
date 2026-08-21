// DEPRECATED — Phase 4 pivot. The vendor is killing this synchronous
// API with no extension. Kept for reference only; not called by the
// running service (see checkInServiceAsync.ts + messageQueue.ts).

/** @deprecated Vendor's synchronous print API killed in the pivot. Not called. */
export interface PrintResult {
  success: boolean;
  attendeeId: string;
}

/** @deprecated Vendor's synchronous print API killed in the pivot. Not called. */
export function printBadgeSync(attendeeId: string): Promise<PrintResult> {
  return new Promise((resolve) => {
    // Simulates real printer latency — the call doesn't return until
    // the physical badge has actually printed.
    setTimeout(() => {
      resolve({ success: true, attendeeId });
    }, 300);
  });
}
