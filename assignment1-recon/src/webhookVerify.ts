import * as crypto from "crypto";

// Days 1-2 solo recon. Tool: webhook verification (one of the sprint's
// five named example tools). Genuinely new to me going in — prior
// experience is calling APIs, not receiving signed unsolicited
// requests and having to prove they're legitimate before trusting them.

const SECRET = "recon-demo-secret";

export function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("hex");
}

export function verify(body: string, signature: string): boolean {
  const expected = sign(body);
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signature, "hex");

  // timingSafeEqual throws on mismatched lengths rather than
  // returning false -- an attacker sending a short/malformed
  // signature would crash the process, not just fail verification.
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
