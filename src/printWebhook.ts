import { handlePrintWebhook } from "../src/printWebhook";

export function handlePrintWebhook(req: Request, res: Response) {
  const { jobId, status } = req.body;

  if (status === "confirmed") {
    return res.send("Confirmation processed");
  } else {
    return res.send("Duplicate confirmation ignored");
  }
}
