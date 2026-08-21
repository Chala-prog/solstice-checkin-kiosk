jest.mock("ioredis");
import Redis from "ioredis";
import request from "supertest";
import express from "express";
import { handlePrintWebhook } from "../src/printWebhook";

const app = express();
app.use(express.json());
app.post("/webhook", handlePrintWebhook);

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
});
