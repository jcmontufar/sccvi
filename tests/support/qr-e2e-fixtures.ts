import { createHash } from "node:crypto";
import { Pool } from "pg";

import {
  hashOpaqueToken,
  hashPin,
} from "../../src/modules/qr/services/qr-crypto";
import {
  requireIsolatedTestDatabase,
  verifyIsolatedTestDatabase,
} from "./test-environment";

const fixturePin = "654321";
const fixtureLabels = [
  "valid",
  "revoked",
  "expired",
  "pin",
  "lockout",
] as const;

function fixtureToken(label: (typeof fixtureLabels)[number]) {
  return createHash("sha256")
    .update(`sccvi-e2e-qr:${process.env.TEST_DATABASE_ID}:${label}`)
    .digest("base64url");
}

export async function provisionQrE2EFixtures() {
  const pool = new Pool({ connectionString: requireIsolatedTestDatabase() });
  const client = await pool.connect();
  const tokens = Object.fromEntries(
    fixtureLabels.map((label) => [label, fixtureToken(label)]),
  ) as Record<(typeof fixtureLabels)[number], string>;
  const tokenHashes = fixtureLabels.map((label) =>
    hashOpaqueToken(tokens[label]),
  );

  try {
    await verifyIsolatedTestDatabase(client);
    await client.query("BEGIN");
    const child = await client.query<{ id: string }>(
      'SELECT "id" FROM "Child" WHERE "id" = $1 AND "isActive" = TRUE',
      [process.env.E2E_EXISTING_CHILD_ID],
    );
    const user = await client.query<{ id: string }>(
      'SELECT "id" FROM "User" WHERE "email" = $1 AND "isActive" = TRUE',
      [process.env.E2E_USER_EMAIL],
    );
    if (child.rows.length !== 1 || user.rows.length !== 1) {
      throw new Error(
        "LIVE TEST EXECUTION BLOCKED: the fictional QR fixture identities are unavailable.",
      );
    }

    await client.query(
      'DELETE FROM "QRToken" WHERE "tokenHash" = ANY($1::text[])',
      [tokenHashes],
    );
    const pinHash = await hashPin(fixturePin);
    const common = [child.rows[0].id, user.rows[0].id];
    await client.query(
      `INSERT INTO "QRToken"
        ("id", "childId", "tokenHash", "createdByUserId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $3, $2, now(), now())`,
      [...common, hashOpaqueToken(tokens.valid)],
    );
    await client.query(
      `INSERT INTO "QRToken"
        ("id", "childId", "tokenHash", "revokedAt", "createdByUserId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $3, now(), $2, now(), now())`,
      [...common, hashOpaqueToken(tokens.revoked)],
    );
    await client.query(
      `INSERT INTO "QRToken"
        ("id", "childId", "tokenHash", "expiresAt", "createdByUserId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $3, now() - interval '1 day', $2, now(), now())`,
      [...common, hashOpaqueToken(tokens.expired)],
    );
    for (const label of ["pin", "lockout"] as const) {
      await client.query(
        `INSERT INTO "QRToken"
          ("id", "childId", "tokenHash", "pinHash", "createdByUserId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $3, $4, $2, now(), now())`,
        [...common, hashOpaqueToken(tokens[label]), pinHash],
      );
    }
    await client.query("COMMIT");
    client.release();
    await pool.end();
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
    throw error;
  }

  process.env.E2E_VALID_QR_TOKEN = tokens.valid;
  process.env.E2E_REVOKED_QR_TOKEN = tokens.revoked;
  process.env.E2E_EXPIRED_QR_TOKEN = tokens.expired;
  process.env.E2E_PIN_QR_TOKEN = tokens.pin;
  process.env.E2E_LOCKOUT_QR_TOKEN = tokens.lockout;
  process.env.E2E_QR_PIN = fixturePin;

  return async () => {
    const cleanupPool = new Pool({
      connectionString: requireIsolatedTestDatabase(),
    });
    const cleanupClient = await cleanupPool.connect();
    try {
      await verifyIsolatedTestDatabase(cleanupClient);
      await cleanupClient.query("BEGIN");
      await cleanupClient.query(
        'DELETE FROM "QRToken" WHERE "tokenHash" = ANY($1::text[])',
        [tokenHashes],
      );
      await cleanupClient.query("COMMIT");
    } catch (error) {
      await cleanupClient.query("ROLLBACK");
      throw error;
    } finally {
      cleanupClient.release();
      await cleanupPool.end();
    }
  };
}
