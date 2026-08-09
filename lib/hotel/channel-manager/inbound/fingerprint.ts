import { createHash } from "node:crypto";

export function createReservationFingerprint(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}
