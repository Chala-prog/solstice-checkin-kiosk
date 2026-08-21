// ORIGINAL synchronous badge-printer client.
// Simulates the vendor's synchronous REST API — the caller sends a
// request and blocks until the printer has actually finished, then
// gets a definitive success/failure response in the same call.

export interface PrintResult {
  success: boolean;
  attendeeId: string;
}

export function printBadgeSync(attendeeId: string): Promise<PrintResult> {
  return new Promise((resolve) => {
    // Simulates real printer latency — the call doesn't return until
    // the physical badge has actually printed.
    setTimeout(() => {
      resolve({ success: true, attendeeId });
    }, 300);
  });
}
