import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = resolve(packageRoot, "package.json");

async function readPackageJson(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(packageJsonPath, "utf8")) as Record<string, unknown>;
}

describe("Skill Lint textlint preset package", () => {
  it("declares the GitHub dependency contract", async () => {
    const packageJson = await readPackageJson();

    expect(packageJson.private).toBe(true);
    expect(packageJson.type).toBe("module");
    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(packageJson.exports).toEqual({
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
        default: "./dist/index.js"
      }
    });
    expect(packageJson.files).toEqual(["dist"]);
    expect(packageJson.bin).toBeUndefined();
    expect(packageJson.engines).toEqual({ node: "20.x || 22.x || 24.x" });
    expect(packageJson.peerDependencies).toEqual({ textlint: "15.8.x" });
    expect(Object.keys(packageJson.dependencies as Record<string, string>).sort()).toEqual([
      "kuromojin",
      "sentence-splitter"
    ]);
    expect((packageJson.dependencies as Record<string, string>).kuromojin).toMatch(/^3\./);
    expect((packageJson.dependencies as Record<string, string>)["sentence-splitter"]).toMatch(/^5\./);
    expect((packageJson.devDependencies as Record<string, string>)["@textlint/kernel"]).toBe("15.8.0");
    expect((packageJson.devDependencies as Record<string, string>)["@textlint/textlint-plugin-markdown"]).toBe("15.8.0");
    expect((packageJson.scripts as Record<string, string>).prepare).toBe("npm run build");
  });

  it.each([20, 22, 24])("accepts Node %s under the declared engine range", async (major) => {
    const packageJson = await readPackageJson();
    const engine = (packageJson.engines as Record<string, string>).node;

    expect(engine.split(" || ")).toContain(`${major}.x`);
  });

  it.each([21, 23, 25])("rejects Node %s under the declared engine range", async (major) => {
    const packageJson = await readPackageJson();
    const engine = (packageJson.engines as Record<string, string>).node;

    expect(engine.split(" || ")).not.toContain(`${major}.x`);
  });

  it("publishes three independently configurable rule creators", async () => {
    const entry = (await import(pathToFileURL(resolve(packageRoot, "dist/index.js")).href)) as {
      default: {
        rules: Record<string, unknown>;
        rulesConfig: Record<string, unknown>;
      };
    };
    const { rules, rulesConfig } = entry.default;

    expect(Object.keys(rules)).toEqual([
      "nested-normative-instruction",
      "excessive-conditional-branches",
      "overloaded-instruction"
    ]);
    expect(Object.values(rules).every((creator) => typeof creator === "function")).toBe(true);
    expect(new Set(Object.values(rules)).size).toBe(3);
    expect(rulesConfig).toEqual({
      "nested-normative-instruction": true,
      "excessive-conditional-branches": true,
      "overloaded-instruction": true
    });
  });

  it("applies the SKILL.md basename gate to every rule visitor", async () => {
    const entry = (await import(pathToFileURL(resolve(packageRoot, "dist/index.js")).href)) as {
      default: { rules: Record<string, (context: unknown) => Record<string, unknown>> };
    };
    const contexts = (filePath: string) => ({
      Syntax: { Document: "Document" },
      getFilePath: () => filePath,
      report: () => undefined,
      RuleError: class RuleError extends Error {},
      locator: { range: () => ({}) }
    });

    for (const creator of Object.values(entry.default.rules)) {
      expect(Object.keys(creator(contexts("/repo/README.md")))).toEqual([]);
      expect(Object.keys(creator(contexts("/repo/SKILL.md")))).toEqual(["Document"]);
    }
  });

  it("keeps the built entrypoint importable as ESM", async () => {
    const entry = await import(pathToFileURL(resolve(packageRoot, "dist/index.js")).href);

    expect(entry.default).toBeDefined();
    expect(basename(resolve(packageRoot, "dist/index.js"))).toBe("index.js");
  });
});
