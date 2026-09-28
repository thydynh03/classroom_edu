import "server-only";
import { hash, verify } from "@node-rs/argon2";

// argon2id, tham số theo khuyến nghị OWASP (m=19MiB, t=2, p=1)
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(plain: string) {
  return hash(plain, OPTS);
}

export async function verifyPassword(hashValue: string, plain: string) {
  try {
    return await verify(hashValue, plain);
  } catch {
    return false;
  }
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function generateTempPassword(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
