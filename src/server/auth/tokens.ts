import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
