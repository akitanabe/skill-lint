import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@textlint/markdown-to-ast";
import { describe, expect, it } from "vitest";
import { runRiskAnalysis } from "../src/analyzer/classify-risk.js";

type ExpectedFinding = {
  readonly ruleId: string;
  readonly message: string;
  readonly range: readonly [number, number];
};

type CorpusEntry = {
  readonly id: string;
  readonly source: {
    readonly repository: string;
    readonly path: string;
    readonly revision?: string;
    readonly version?: string;
  };
  readonly snapshot: string;
  readonly sha256: string;
  readonly expectedFindings: readonly ExpectedFinding[];
};

type CorpusManifest = {
  readonly retrievedAt: string;
  readonly entries: readonly CorpusEntry[];
};

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/corpus");
const manifestPath = resolve(fixturesRoot, "manifest.json");
const stableSourceOrder = [
  "clarify-it",
  "tugite-plan-agent",
  "tugite-impl-lead",
  "tugite-review-refine"
] as const;

const readManifest = async (): Promise<CorpusManifest> =>
  JSON.parse(await readFile(manifestPath, "utf8")) as CorpusManifest;

const findingProjection = (finding: {
  readonly ruleId: string;
  readonly message: string;
  readonly range: readonly [number, number];
}): ExpectedFinding => ({
  ruleId: finding.ruleId,
  message: finding.message,
  range: finding.range
});

describe("immutable skill corpus", () => {
  it("keeps the manifest source order and retrieval date", async () => {
    const manifest = await readManifest();

    expect(manifest.retrievedAt).toBe("2026-08-25");
    expect(manifest.entries.map(({ id }) => id)).toEqual(stableSourceOrder);
    for (const entry of manifest.entries) {
      expect(entry.source.repository).toMatch(/^https:\/\/github\.com\//);
      expect(isAbsolute(entry.source.path)).toBe(false);
      expect(entry.source.path).not.toMatch(/^\.\.(?:[\\/]|$)/);
      expect(entry.source.path.endsWith("/SKILL.md")).toBe(true);
      expect(entry.source.revision ?? entry.source.version).toBeTruthy();
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("verifies snapshot paths, hashes, and expected findings without live source access", async () => {
    const manifest = await readManifest();

    for (const entry of manifest.entries) {
      const snapshotPath = resolve(fixturesRoot, entry.snapshot);
      expect(isAbsolute(entry.snapshot)).toBe(false);
      expect(relative(fixturesRoot, snapshotPath)).not.toMatch(/^\.\.(?:[\\/]|$)/);
      expect(snapshotPath.startsWith(`${fixturesRoot}/`)).toBe(true);
      expect(snapshotPath.endsWith("/SKILL.md")).toBe(true);

      const source = await readFile(snapshotPath, "utf8");
      expect(createHash("sha256").update(source).digest("hex")).toBe(entry.sha256);

      const actualFindings = await runRiskAnalysis(parse(source));
      expect(actualFindings.map(findingProjection)).toEqual(entry.expectedFindings);
    }
  });
});
