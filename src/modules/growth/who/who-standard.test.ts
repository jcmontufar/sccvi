import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseWhoReferenceCsv,
  sha256,
  WHO_MAX_AGE_DAYS,
  whoReferenceFiles,
} from "@/modules/growth/who/who-standard";

describe("WHO 2006 reference files", () => {
  for (const [indicator, metadata] of Object.entries(whoReferenceFiles)) {
    it(`validates ${metadata.fileName}`, async () => {
      const text = await readFile(
        resolve("prisma/data/who-2006", metadata.fileName),
        "utf8",
      );
      expect(sha256(text)).toBe(metadata.sha256);
      const rows = parseWhoReferenceCsv(
        text,
        indicator as keyof typeof whoReferenceFiles,
      );
      expect(rows).toHaveLength(3714);
      expect(rows[0]).toMatchObject({ sex: "MALE", ageDays: 0 });
      expect(rows.at(-1)).toMatchObject({
        sex: "FEMALE",
        ageDays: WHO_MAX_AGE_DAYS,
      });
      expect(
        rows.some((row) => row.sex === "MALE" && row.ageDays === 1827),
      ).toBe(true);
    });
  }

  it("rejects malformed, duplicate or mixed-version source data", async () => {
    const metadata = whoReferenceFiles.WEIGHT_FOR_AGE;
    const text = await readFile(
      resolve("prisma/data/who-2006", metadata.fileName),
      "utf8",
    );
    expect(() =>
      parseWhoReferenceCsv(
        text.replace("standardName", "name"),
        "WEIGHT_FOR_AGE",
      ),
    ).toThrow();
    expect(() =>
      parseWhoReferenceCsv(
        `${text}${text.split(/\r?\n/)[1]}\n`,
        "WEIGHT_FOR_AGE",
      ),
    ).toThrow();
    expect(() =>
      parseWhoReferenceCsv(text.replace(",2006,", ",2007,"), "WEIGHT_FOR_AGE"),
    ).toThrow();
  });
});
