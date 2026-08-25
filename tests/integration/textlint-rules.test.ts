import { TextlintKernel, type TextlintKernelRule } from "@textlint/kernel";
import markdownPlugin from "@textlint/textlint-plugin-markdown";
import { describe, expect, it } from "vitest";
import preset from "../../src/index.js";

const kernel = new TextlintKernel();

const configuredRules = (
  enabled: readonly string[] = Object.keys(preset.rules),
  options: TextlintKernelRule["options"] = true
): TextlintKernelRule[] => enabled.map((ruleId) => ({
  ruleId,
  rule: preset.rules[ruleId as keyof typeof preset.rules],
  options
}));

const lint = (source: string, filePath = "/repo/SKILL.md", rules = configuredRules()) =>
  kernel.lintText(source, {
    ext: ".md",
    filePath,
    plugins: [{ pluginId: "markdown", plugin: markdownPlugin }],
    rules
  });

describe("textlint risk rule integration", () => {
  it.each([
    [
      "確認し、比較して、必要なら修正し、結果を報告する。",
      "overloaded-instruction",
      "1文に独立したアクションが詰め込まれています。"
    ],
    [
      "A の場合は B する。ただし C の場合は D し、それでも成立しない場合は E とする。",
      "excessive-conditional-branches",
      "同じ指示ブロックに結果を選ぶ条件分岐が集中しています。"
    ],
    [
      "A する。ただし B の場合は C し、D なら E する。",
      "nested-normative-instruction",
      "条件のスコープ内に規範的な判断が入れ子になっています。"
    ]
  ])("reports %s with the expected rule id, message, and absolute range", async (source, ruleId, message) => {
    const result = await lint(source);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({ ruleId, message, range: [0, source.length], severity: 2 });
    expect(result.messages[0].fix).toBeUndefined();
  });

  it("preserves the original range through Markdown syntax exclusions", async () => {
    const instruction = "確認し、比較して、必要なら `下書き` を修正し、結果を報告する。";
    const source = `# 手順\n\n- ${instruction}`;
    const expectedStart = source.indexOf("確認");
    const expectedEnd = source.length;

    expect((await lint(source)).messages[0]).toMatchObject({
      ruleId: "overloaded-instruction",
      message: "1文に独立したアクションが詰め込まれています。",
      range: [expectedStart, expectedEnd]
    });
  });

  it("does not lint files other than SKILL.md", async () => {
    expect((await lint("確認し、比較して、修正し、報告する。", "/repo/README.md")).messages).toEqual([]);
  });

  it("allows each rule to be disabled independently", async () => {
    const cases = [
      ["確認し、比較して、修正し、報告する。", "overloaded-instruction"],
      ["A の場合は B する。ただし C の場合は D し、それでも成立しない場合は E する。", "excessive-conditional-branches"],
      ["A する。ただし B の場合は C し、D なら E する。", "nested-normative-instruction"]
    ] as const;
    for (const [source, disabled] of cases) {
      const enabled = Object.keys(preset.rules).filter((ruleId) => ruleId !== disabled);
      expect((await lint(source, "/repo/SKILL.md", configuredRules(enabled))).messages).toEqual([]);
    }
  });

  it("does not fall back when the winning rule is disabled", async () => {
    const source = "A する。ただし B の場合は C し、D なら E し、F を確認して、G を比較して、H を修正し、I を報告する。";
    const lowerRules = configuredRules(["excessive-conditional-branches", "overloaded-instruction"]);
    expect((await lint(source, "/repo/SKILL.md", lowerRules)).messages).toEqual([]);
  });

  it("does not fall back from a conditional winner to an overloaded rule", async () => {
    const source = "A の場合は B し、C の場合は D し、E の場合は F し、G を報告する。";

    expect((await lint(source)).messages.map(({ ruleId }) => ruleId)).toEqual([
      "excessive-conditional-branches"
    ]);
    expect((await lint(
      source,
      "/repo/SKILL.md",
      configuredRules(["overloaded-instruction"])
    )).messages).toEqual([]);
  });

  it("preserves a host warning severity", async () => {
    const source = "確認し、比較して、修正し、報告する。";
    const warningRule = configuredRules(["overloaded-instruction"], { severity: "warning" });
    expect((await lint(source, "/repo/SKILL.md", warningRule)).messages[0].severity).toBe(1);
  });

  it("does not interpret skill-lint-specific threshold or severity options", async () => {
    const source = "確認し、比較して、修正し、報告する。";
    const rule = configuredRules(["overloaded-instruction"], {
      threshold: 99,
      skillLintSeverity: "off"
    });

    expect((await lint(source, "/repo/SKILL.md", rule)).messages[0]).toMatchObject({
      ruleId: "overloaded-instruction",
      severity: 2
    });
  });

  it("does not alter input during a fix run", async () => {
    const source = "確認し、比較して、修正し、報告する。";
    const result = await kernel.fixText(source, {
      ext: ".md",
      filePath: "/repo/SKILL.md",
      plugins: [{ pluginId: "markdown", plugin: markdownPlugin }],
      rules: configuredRules()
    });
    expect(result.output).toBe(source);
    expect(result.applyingMessages).toEqual([]);
  });
});
