// tests/printWebhook.test.ts
jest.mock("ioredis"); // use the Redis mock

import Redis from "ioredis";
import request from "supertest";
import app from "../src/server"; // ✅ import the app that includes /failed-jobs

beforeEach(() => {
  (Redis as any).reset();
});

describe("Print webhook replay protection with Redis mock", () => {
  it("processes first confirmation", async () => {
    const res = await request(app)
      .post("/webhook")
      .send({ jobId: "123", status: "confirmed" });

    expect(res.text).toBe("Confirmation processed");
  });

  it("ignores duplicate confirmation", async () => {
    await request(app)
      .post("/webhook")
      .send({ jobId: "456", status: "confirmed" });

    const res = await request(app)
      .post("/webhook")
      .send({ jobId: "456", status: "confirmed" });

    expect(res.text).toBe("Duplicate confirmation ignored");
  });

  it("rejects invalid payloads", async () => {
    const res = await request(app)
      .post("/webhook")
      .send({ status: "confirmed" });

    expect(res.status).toBe(400);
    expect(res.text).toBe("Invalid payload");
  });

  it("lists all failed jobs", async () => {
    // Add two failed jobs via webhook
    await request(app).post("/webhook").send({ jobId: "111", status: "failed" });
    await request(app).post("/webhook").send({ jobId: "222", status: "failed" });

    // Call the /failed-jobs endpoint
    const res = await request(app).get("/failed-jobs");

    // Verify the response contains both job IDs
    expect(res.status).toBe(200);
    expect(res.body.failedJobs).toEqual(expect.arrayContaining(["111", "222"]));
  });
});
