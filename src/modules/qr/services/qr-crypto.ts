import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function generateOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function hashPin(pin: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(pin, salt, 32)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPin(pin: string, encodedHash: string) {
  const [algorithm, saltValue, expectedValue] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltValue || !expectedValue) return false;
  const expected = Buffer.from(expectedValue, "base64url");
  const actual = (await scrypt(
    pin,
    Buffer.from(saltValue, "base64url"),
    expected.length,
  )) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
