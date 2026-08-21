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

  it("lists both confirmed and failed jobs with counts", async () => {
    // Add jobs via webhook
    await request(app).post("/webhook").send({ jobId: "101", status: "confirmed" });
    await request(app).post("/webhook").send({ jobId: "202", status: "failed" });

    // Call the /jobs endpoint
    const res = await request(app).get("/jobs");

    // Verify the response structure and values
    expect(res.status).toBe(200);

    // Confirmed jobs should include "101"
    expect(res.body.confirmedJobs).toEqual(expect.arrayContaining(["101"]));

    // Failed jobs should include "202"
    expect(res.body.failedJobs).toEqual(expect.arrayContaining(["202"]));

    // Counts should reflect the number of jobs
    expect(typeof res.body.confirmedCount).toBe("number");
    expect(typeof res.body.failedCount).toBe("number");
    expect(res.body.confirmedCount).toBeGreaterThanOrEqual(1);
    expect(res.body.failedCount).toBeGreaterThanOrEqual(1);
  }); // ✅ closing brace for the test
}); // ✅ closing brace for the describe
