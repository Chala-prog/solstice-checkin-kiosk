import request from "supertest";
import express from "express";
import { handlePrintWebhook } from "../src/printWebhook";

const app = express();
app.use(express.json());
app.post("/print-webhook", handlePrintWebhook);

describe("Print webhook replay protection", () => {
  it("processes first confirmation and ignores duplicate", async () => {
    const jobId = "job-001";

    const first = await request(app)
      .post("/print-webhook")
      .set("x-job-id", jobId)
      .send({ attendee: "John Doe" });

    expect(first.text).toBe("Confirmation processed");

    const second = await request(app)
      .post("/print-webhook")
      .set("x-job-id", jobId)
      .send({ attendee: "John Doe" });

    expect(second.text).toBe("Duplicate confirmation ignored");
  });
});
