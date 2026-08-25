import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const readRepositoryFile = (path: string): Promise<string> =>
  readFile(resolve(repositoryRoot, path), "utf8");

describe("consumer and repository verification contract", () => {
  it("documents GitHub dependency installation and textlint configuration", async () => {
    const [readme, packageJsonText] = await Promise.all([
      readRepositoryFile("README.md"),
      readRepositoryFile("package.json")
    ]);
    const packageJson = JSON.parse(packageJsonText) as {
      readonly name: string;
      readonly engines: { readonly node: string };
      readonly peerDependencies: { readonly textlint: string };
    };

    expect(readme).toContain(packageJson.name);
    expect(readme).toContain("github:akitanabe/skill-lint#<tag-or-commit>");
    expect(readme).toContain('"preset-skill-lint": true');
    expect(readme).toContain(packageJson.engines.node);
    expect(readme).toContain(packageJson.peerDependencies.textlint);
    for (const ruleId of [
      "historical-defense-instruction",
      "nested-normative-instruction",
      "excessive-conditional-branches",
      "overloaded-instruction"
    ]) {
      expect(readme).toContain(ruleId);
    }
  });

  it("states the report, configuration, and analysis boundaries", async () => {
    const readme = await readRepositoryFile("README.md");

    expect(readme).toContain("SKILL.md");
    expect(readme).toContain("no-fallback");
    expect(readme).toContain("severity");
    expect(readme).toContain("report-only");
    expect(readme).toContain("corpus");
    expect(readme).not.toContain("npm publish");
  });

  it("runs the same verification entrypoint for every supported Node line", async () => {
    const [workflow, packageJsonText] = await Promise.all([
      readRepositoryFile(".github/workflows/ci.yml"),
      readRepositoryFile("package.json")
    ]);
    const packageJson = JSON.parse(packageJsonText) as {
      readonly scripts: Record<string, string>;
    };

    expect(packageJson.scripts.verify).toContain("npm run typecheck");
    expect(packageJson.scripts.verify).toContain("npm test");
    expect(packageJson.scripts.verify).toContain("npm run build");
    expect(packageJson.scripts.verify).toContain("npm run verify:package");
    expect(workflow).toMatch(/node-version:\s*\[20, 22, 24\]/);
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run verify");
  });
});
