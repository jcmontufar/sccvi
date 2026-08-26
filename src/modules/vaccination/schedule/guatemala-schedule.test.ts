import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  guatemalaScheduleArtifact,
  parseGuatemalaScheduleArtifact,
  sha256,
} from "@/modules/vaccination/schedule/guatemala-schedule";

const artifactText = readFileSync(
  resolve("prisma/data/vaccination", guatemalaScheduleArtifact.fileName),
  "utf8",
);

describe("Guatemala routine vaccination schedule artifact", () => {
  it("matches the pinned normalized artifact and expected row count", () => {
    expect(sha256(artifactText)).toBe(guatemalaScheduleArtifact.sha256);
    const artifact = parseGuatemalaScheduleArtifact(artifactText);
    expect(artifact.version.code).toBe("GT-MSPAS-2026-01-12");
    expect(artifact.doses).toHaveLength(21);
  });

  it("rejects duplicate schedule dose codes", () => {
    const source = JSON.parse(artifactText) as {
      doses: Array<Record<string, unknown>>;
    };
    source.doses.push({ ...source.doses[0] });
    expect(() =>
      parseGuatemalaScheduleArtifact(JSON.stringify(source)),
    ).toThrow(/duplicado/i);
  });

  it("rejects malformed or undocumented vaccine references", () => {
    const source = JSON.parse(artifactText) as {
      doses: Array<Record<string, unknown>>;
    };
    source.doses[0] = {
      ...source.doses[0],
      vaccineCode: "UNSUPPORTED_VACCINE",
    };
    expect(() =>
      parseGuatemalaScheduleArtifact(JSON.stringify(source)),
    ).toThrow(/vacuna inexistente/i);
  });
});
