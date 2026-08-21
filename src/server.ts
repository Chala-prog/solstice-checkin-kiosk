// src/server.ts
import express from "express";
import Redis from "ioredis";
import { handlePrintWebhook } from "./printWebhook";

const app = express();
const redis = new Redis();

app.use(express.json());

// Existing webhook route
app.post("/webhook", handlePrintWebhook);

// Existing endpoints
app.get("/failed-jobs", async (req, res) => {
  try {
    const jobs = await redis.smembers("failedJobs");
    res.json({ failedJobs: jobs });
  } catch (error) {
    console.error("Error fetching failed jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

app.get("/confirmed-jobs", async (req, res) => {
  try {
    const jobs = await redis.smembers("confirmedJobs");
    res.json({ confirmedJobs: jobs });
  } catch (error) {
    console.error("Error fetching confirmed jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// ✅ New combined endpoint
app.get("/jobs", async (req, res) => {
  try {
    const [confirmed, failed] = await Promise.all([
      redis.smembers("confirmedJobs"),
      redis.smembers("failedJobs"),
    ]);

    res.json({
      confirmedJobs: confirmed,
      failedJobs: failed,
      confirmedCount: confirmed.length,
      failedCount: failed.length,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

export default app;
