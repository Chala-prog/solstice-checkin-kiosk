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
    const res = await request(app)
      .post("/webhook")
      .send({ jobId: "123", status: "duplicate" });

    expect(res.text).toBe("Duplicate confirmation ignored");
  });
});
