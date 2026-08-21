// src/printWebhook.ts
import { Request, Response } from "express";

// In-memory store of confirmed job IDs
const confirmedJobs = new Set<string>();

export function handlePrintWebhook(req: Request, res: Response) {
  const { jobId, status } = req.body;

  if (!jobId || !status) {
    return res.status(400).send("Invalid payload");
  }

  if (status === "confirmed") {
    if (confirmedJobs.has(jobId)) {
      return res.send("Duplicate confirmation ignored");
    } else {
      confirmedJobs.add(jobId);
      return res.send("Confirmation processed");
    }
  }

  return res.send("Unhandled status");
}
