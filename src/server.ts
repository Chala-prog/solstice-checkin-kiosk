import * as http from "http";
import { AttendeeStore } from "./attendeeStore";
import { checkInAsync } from "./checkInServiceAsync";

const PORT = 4100;

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

interface WebhookPayload {
  jobId: string;
  attendeeId: string;
  status: string;
}

function isWebhookPayload(v: unknown): v is WebhookPayload {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.jobId === "string" && typeof o.attendeeId === "string" && typeof o.status === "string";
}

export function startServer(store: AttendeeStore): http.Server {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    // Kiosk staff scans a badge — triggers check-in.
    const checkinMatch = url.pathname.match(/^\/checkin\/([^/]+)$/);
    if (req.method === "POST" && checkinMatch) {
      const attendeeId = decodeURIComponent(checkinMatch[1]);
      const result = checkInAsync(store, attendeeId);
      if (result.outcome === "duplicate_scan") {
        sendJson(res, 409, { outcome: "duplicate_scan", attendeeId, message: "Already checked in or in progress — no badge printed." });
      } else {
        sendJson(res, 202, { outcome: "pending", attendeeId: result.attendeeId, jobId: result.jobId });
      }
      return;
    }

    // UI polls this to know when to stop showing "pending" and show "Checked In".
    const statusMatch = url.pathname.match(/^\/status\/([^/]+)$/);
    if (req.method === "GET" && statusMatch) {
      const attendeeId = decodeURIComponent(statusMatch[1]);
      sendJson(res, 200, { attendeeId, status: store.getStatus(attendeeId) });
      return;
    }

    // Vendor calls this back once a print job actually completes —
    // possibly out of order relative to when jobs were published.
    if (req.method === "POST" && url.pathname === "/webhooks/print-complete") {
      readBody(req).then((raw) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          sendJson(res, 400, { error: "invalid_json" });
          return;
        }
        if (!isWebhookPayload(parsed)) {
          sendJson(res, 400, { error: "invalid_payload" });
          return;
        }

        const record = store.getRecord(parsed.attendeeId);

        // Idempotency / correlation check — this is the crux of the
        // real refactor. A webhook must only move the attendee to
        // CHECKED_IN if it's confirming the job we're actually
        // waiting on right now. Without this check, a stale or
        // duplicate callback (e.g. a retry from the vendor, or a
        // confirmation for a job that's already been superseded)
        // could double-confirm an already-checked-in attendee, or
        // worse, resurrect a stale job's result over a newer one.
        if (record.status === "PENDING" && record.jobId === parsed.jobId) {
          store.markCheckedIn(parsed.attendeeId);
          console.log(`[webhook] ${parsed.attendeeId} confirmed via job ${parsed.jobId} -> CHECKED_IN`);
        } else {
          console.log(`[webhook] ignored stale/duplicate confirmation for ${parsed.attendeeId} (job ${parsed.jobId}, current status ${record.status})`);
        }

        sendJson(res, 200, { received: true });
      });
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  });

  server.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });

  return server;
}
