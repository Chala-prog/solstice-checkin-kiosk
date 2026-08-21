// src/printWebhook.ts
import { Request, Response } from "express";
import Redis from "ioredis";

const redis = new Redis();

export async function handlePrintWebhook(req: Request, res: Response) {
  const { jobId, status } = req.body;

  if (!jobId || !status) {
    return res.status(400).send("Invalid payload");
  }

  if (status === "confirmed") {
    const alreadyConfirmed = await redis.sismember("confirmedJobs", jobId);

    if (alreadyConfirmed) {
      return res.send("Duplicate confirmation ignored");
    } else {
      await redis.sadd("confirmedJobs", jobId);
      return res.send("Confirmation processed");
    }
  }

  if (status === "failed") {
    return res.send("Job failed");
  }

  return res.send("Unhandled status");
}
