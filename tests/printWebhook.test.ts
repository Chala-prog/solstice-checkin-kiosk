it("handles failed status", async () => {
  const res = await request(app)
    .post("/webhook")
    .send({ jobId: "789", status: "failed" });

  expect(res.text).toBe("Job failed");
});
