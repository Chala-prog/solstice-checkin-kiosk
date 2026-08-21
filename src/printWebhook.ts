// tests/printWebhook.test.ts
import request from "supertest";
import express from "express";
import { handlePrintWebhook } from "../src/printWebhook";

const app = express();
app.use(express.json());
app.post("/webhook", handlePrintWebhook);

describe("Print webhook replay protection", () => {
  it("processes first confirmation and ignores duplicate", async () => {
    const first = await request(app)
      .post("/webhook")
      .send({ jobId: "123", status: "confirmed" });
    expect(first.text).toBe("Confirmation processed");

    const second = await request(app)
      .post("/webhook")
      .send({ jobId: "123", status: "duplicate" });
    expect(second.text).toBe("Duplicate confirmation ignored");
  });
});
