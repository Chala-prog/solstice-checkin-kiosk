import { EventEmitter } from "events";

// Simulates the vendor's message queue. Publishing returns immediately
// with no result — this is the core inversion from the sync model,
// where the call didn't return until the vendor was done. Here, the
// vendor consumes asynchronously and we find out later, via webhook.

export interface PrintJob {
  jobId: string;
  attendeeId: string;
}

const bus = new EventEmitter();

export function publishPrintJob(job: PrintJob): void {
  console.log(`[queue] published print job ${job.jobId} for ${job.attendeeId}`);
  bus.emit("job", job);
}

export function onPrintJob(handler: (job: PrintJob) => void): void {
  bus.on("job", handler);
}
