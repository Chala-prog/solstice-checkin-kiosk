// tests/printWebhook.test.ts
import request from "supertest";
import express from "express";
import { handlePrintWebhook } from "../src/printWebhook";

const app = express();
app.use(express.json());
app.post("/webhook", handlePrintWebhook);

describe("Print webhook replay protection", () => {
  it("processes first confirmation", async () => {
    const res = await request(app)
      .post("/webhook")
      .send({ jobId: "123", status: "confirmed" });

    expect(res.text).toBe("Confirmation processed");
  });

  it("ignores duplicate confirmation", async () => {
    // First confirmation
    await request(app)
      .post("/webhook")
      .send({ jobId: "456", status: "confirmed" });

    // Duplicate confirmation
    const res = await request(app)
      .post("/webhook")
      .send({ jobId: "456", status: "confirmed" });

    expect(res.text).toBe("Duplicate confirmation ignored");
  });

  it("rejects invalid payloads", async () => {
    const res = await request(app)
      .post("/webhook")
      .send({ status: "confirmed" }); // missing jobId

    expect(res.status).toBe(400);
    expect(res.text).toBe("Invalid payload");
  });
});
