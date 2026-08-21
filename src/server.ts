// src/server.ts
import express from "express";
import Redis from "ioredis";
import { handlePrintWebhook } from "./printWebhook";

const app = express();
const redis = new Redis();

app.use(express.json());

// Existing webhook route
app.post("/webhook", handlePrintWebhook);

// ✅ New endpoint to list all failed jobs
app.get("/failed-jobs", async (req, res) => {
  try {
    const jobs = await redis.smembers("failedJobs");
    res.json({ failedJobs: jobs });
  } catch (error) {
    console.error("Error fetching failed jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

export default app;
