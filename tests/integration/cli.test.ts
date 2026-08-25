import { mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageLink = resolve(packageRoot, "node_modules/textlint-rule-preset-skill-lint");
let createdPackageLink = false;
let cli: { execute(args: string[], text?: string): Promise<number> };
const cliArguments = (...args: string[]): string[] => ["node", "textlint", ...args];

beforeAll(async () => {
  try {
    await symlink("..", packageLink);
    createdPackageLink = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
  const cliPath = resolve(packageRoot, "node_modules/textlint/lib/src/cli.js");
  cli = ((await import(pathToFileURL(cliPath).href)) as { cli: typeof cli }).cli;
});

afterAll(async () => {
  if (createdPackageLink) {
    await unlink(packageLink);
  }
});

describe("textlint CLI contract", () => {
  it("exits 1 for a default preset violation", async () => {
    const status = await cli.execute(cliArguments(
      "--stdin",
      "--stdin-filename", "SKILL.md",
      "--config", "tests/fixtures/cli-default.textlintrc.json",
      "--format", "json"
    ), "確認し、比較して、修正し、報告する。");

    expect(status).toBe(1);
  });

  it("exits 0 when the host lowers the violation to warning", async () => {
    const status = await cli.execute(cliArguments(
      "--stdin",
      "--stdin-filename", "SKILL.md",
      "--config", "tests/fixtures/cli-warning.textlintrc.json",
      "--format", "json"
    ), "確認し、比較して、修正し、報告する。");

    expect(status).toBe(0);
  });

  it("leaves the source unchanged when fix is requested", async () => {
    const source = "確認し、比較して、修正し、報告する。";
    const fixtureDirectory = await mkdtemp(resolve(packageRoot, ".skill-lint-cli-"));
    const skillPath = resolve(fixtureDirectory, "SKILL.md");
    try {
      await writeFile(skillPath, source, "utf8");
      const status = await cli.execute(cliArguments(
        "--fix",
        "--config", "tests/fixtures/cli-default.textlintrc.json",
        skillPath
      ));

      expect(status).toBe(0);
      expect(await readFile(skillPath, "utf8")).toBe(source);
    } finally {
      await rm(fixtureDirectory, { recursive: true, force: true });
    }
  });

  it("keeps Tugite rules disabled in the default preset and enables them explicitly", async () => {
    const source = [
      "## Programmatic Flows",
      "",
      "### invalid",
      "",
      "Trigger: x",
      "Outcomes: z"
    ].join("\n");
    const defaultStatus = await cli.execute(cliArguments(
      "--stdin",
      "--stdin-filename", "references/execution.md",
      "--config", "tests/fixtures/cli-default.textlintrc.json",
      "--format", "json"
    ), source);
    const tugiteStatus = await cli.execute(cliArguments(
      "--stdin",
      "--stdin-filename", "references/execution.md",
      "--config", "tests/fixtures/cli-tugite.textlintrc.json",
      "--format", "json"
    ), source);

    expect(defaultStatus).toBe(0);
    expect(tugiteStatus).toBe(1);
  });
});
