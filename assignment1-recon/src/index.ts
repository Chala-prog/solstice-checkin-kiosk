import { sign, verify } from "./webhookVerify";

function main() {
  const body = JSON.stringify({ attendeeId: "ATTENDEE-1", status: "printed" });
  const validSig = sign(body);

  console.log("--- valid signature ---");
  console.log("verify(body, validSig):", verify(body, validSig));

  console.log("--- tampered body, original signature ---");
  const tamperedBody = JSON.stringify({ attendeeId: "ATTENDEE-1", status: "REFUNDED" });
  console.log("verify(tamperedBody, validSig):", verify(tamperedBody, validSig));

  console.log("--- wrong signature entirely ---");
  console.log("verify(body, 'deadbeef'):", verify(body, "deadbeef"));
}

main();
