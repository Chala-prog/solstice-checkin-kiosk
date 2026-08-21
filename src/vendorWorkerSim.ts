import * as http from "http";
import { onPrintJob, PrintJob } from "./messageQueue";

// Stands in for Solstice's badge-printer vendor. This is deliberately
// modeled as an external actor calling back over real HTTP (not a
// direct function call) — the webhook path needs to be genuinely
// exercised, not simulated in-process, or the "out of order" and
// "correlate by jobId" requirements can't actually be tested.

const WEBHOOK_PORT = 4100;

function callbackWebhook(job: PrintJob): void {
  const body = JSON.stringify({ jobId: job.jobId, attendeeId: job.attendeeId, status: "success" });
  const req = http.request(
    {
      hostname: "localhost",
      port: WEBHOOK_PORT,
      path: "/webhooks/print-complete",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    },
    (res) => {
      res.on("data", () => {});
      res.on("end", () => {});
    }
  );
  req.on("error", (err) => console.error(`[vendor] webhook callback failed for ${job.jobId}:`, err.message));
  req.write(body);
  req.end();
}

export function startVendorWorker(): void {
  onPrintJob((job) => {
    // Randomized delay (300-1200ms) — deliberately variable so jobs
    // published in order can complete, and call back, out of order.
    const delay = 300 + Math.floor(Math.random() * 900);
    console.log(`[vendor] received job ${job.jobId}, printing (${delay}ms)...`);
    setTimeout(() => {
      console.log(`[vendor] job ${job.jobId} complete, calling back webhook`);
      callbackWebhook(job);
    }, delay);
  });
}
