import { parse } from "@textlint/markdown-to-ast";
import { describe, expect, it } from "vitest";
import { runRiskAnalysis } from "../../src/analyzer/classify-risk.js";

const analyze = (source: string) => runRiskAnalysis(parse(source));

const historicalDefenseMessage =
  "過去の状態を根拠とする恒久的な防御規則になっています。現在の invariant、responsibility、boundary として記述してください。";

describe("instruction risk classification", () => {
  it.each([
    "以前は X だったため、Y を禁止する。",
    "旧版の X を使用してはいけない。",
    "削除した X を復活させない。",
    "旧構造 X に戻さない。",
    "廃止した X が存在しないことを確認する。",
    "Do not use the OLD API.",
    "Do not use this setting because old versions accepted it."
  ])("reports an explicit historical defense: %s", async (source) => {
    expect(await analyze(source)).toEqual([{
      id: expect.any(String),
      ruleId: "historical-defense-instruction",
      message: historicalDefenseMessage,
      range: [0, source.length],
      blockId: "block:0",
      chainIds: expect.any(Array)
    }]);
  });

  it("reports an explicitly causal adjacent sentence pair as one locus", async () => {
    const source = "以前は X だった。そのため、Y を禁止する。";

    expect(await analyze(source)).toEqual([{
      id: expect.any(String),
      ruleId: "historical-defense-instruction",
      message: historicalDefenseMessage,
      range: [0, source.length],
      blockId: "block:0",
      chainIds: expect.any(Array)
    }]);
  });

  it.each([
    "安全のため、危険な入力の使用を禁止する。",
    "以前は X だった。現在は Y を使用する。",
    "以前は X だった。Y を禁止する。",
    "旧版の X は 2020 年に廃止された。",
    "旧版の X を説明し、現在の Y を使用してはいけない。",
    "旧版の X ではなく、現行の Y を使用しない。",
    "Do not restore the folder.",
    "Do not use this setting, and old versions are documented separately.",
    "Do not use the αoldβ API.",
    "Do not use the old_value API.",
    "Do not use the old2 API.",
    "Do not use the old\u0301 API.",
    "現在の X を禁止するため、旧版の Y を参照する。",
    "過去の結論ではなく、現在の根拠に従う。",
    "例として「旧版の X を使用してはいけない」という文がある。",
    "`旧版` の X を使用してはいけない。"
  ])("does not report a current constraint, description, example, or substring: %s", async (source) => {
    expect(await analyze(source)).toEqual([]);
  });

  it("does not connect historical evidence across instruction blocks", async () => {
    const source = "以前は X だった。\n\nそのため、Y を禁止する。";

    expect(await analyze(source)).toEqual([]);
  });

  it("reports the original text range inside a list item", async () => {
    const instruction = "旧版の X を使用してはいけない。";
    const source = `# 手順\n\n- ${instruction}`;

    expect(await analyze(source)).toEqual([{
      id: expect.any(String),
      ruleId: "historical-defense-instruction",
      message: historicalDefenseMessage,
      range: [source.indexOf(instruction), source.length],
      blockId: "block:0",
      chainIds: expect.any(Array)
    }]);
  });

  it.each([
    "# 旧版の X を使用してはいけない。",
    "```text\n旧版の X を使用してはいけない。\n```",
    "| Rule |\n| --- |\n| 旧版の X を使用してはいけない。 |",
    "- 以前は X だった。\n- そのため、Y を禁止する。"
  ])("does not use excluded syntax or separate list items as historical evidence: %s", async (source) => {
    expect(await analyze(source)).toEqual([]);
  });

  it("keeps independent historical-defense loci separate and source ordered", async () => {
    const first = "旧版の X を使用してはいけない。";
    const second = "削除した Y を復活させない。";
    const source = `${first} ${second}`;

    expect((await analyze(source)).map(({ ruleId, range }) => ({ ruleId, range }))).toEqual([
      { ruleId: "historical-defense-instruction", range: [0, first.length] },
      { ruleId: "historical-defense-instruction", range: [first.length + 1, source.length] }
    ]);
  });

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
  ])("reports the minimal source range for %s", async (source, ruleId, message) => {
    const findings = await analyze(source);

    expect(findings).toEqual([{
      id: expect.any(String),
      ruleId,
      message,
      range: [0, source.length],
      blockId: "block:0",
      chainIds: expect.any(Array)
    }]);
  });

  it.each([
    "確認し、比較して、結果を報告する。",
    "A の場合は B する。ただし C の場合は D する。",
    "A する。ただし B の場合は C する。"
  ])("does not report immediately below a threshold: %s", async (source) => {
    expect(await analyze(source)).toEqual([]);
  });

  it.each([
    "確認し、比較して、修正し、報告する。",
    "A の場合は B する。ただし C の場合は D し、それでも成立しない場合は E する。",
    "A する。ただし B の場合は C し、D なら E する。"
  ])("reports when a threshold is reached: %s", async (source) => {
    expect(await analyze(source)).toHaveLength(1);
  });

  it.each([
    "設定を確認して報告する。",
    "ファイルを読み込んで解析する。",
    "例として『確認し、比較し、修正し、報告する』という文がある。",
    "選択肢は A、B、C、D です。",
    "条件が多い設計は理解しにくい場合がある。",
    "確認し、比較し、修正し、報告したという流れを説明する。",
    "確認し、比較し、修正し、報告した。",
    "A する。ただし B の場合や C の場合を説明する。",
    "`確認し、比較し、修正し、報告する。`"
  ])("does not report prose, compound predicates, enumeration, or excluded syntax: %s", async (source) => {
    expect(await analyze(source)).toEqual([]);
  });

  it("keeps non-overlapping loci in the same block independent and source ordered", async () => {
    const source = "確認し、比較して、修正し、報告する。 A の場合は B する。ただし C の場合は D し、それでも成立しない場合は E する。";
    const findings = await analyze(source);

    expect(findings.map(({ ruleId }) => ruleId)).toEqual([
      "overloaded-instruction",
      "excessive-conditional-branches"
    ]);
    expect(findings[0].range[1]).toBeLessThanOrEqual(findings[1].range[0]);
  });

  it("reports only the highest-priority taxonomy for one locus", async () => {
    const source = "A する。ただし B の場合は C し、D なら E し、F を確認して、G を比較して、H を修正し、I を報告する。";

    expect((await analyze(source)).map(({ ruleId }) => ruleId)).toEqual([
      "nested-normative-instruction"
    ]);
  });

  it("does not continue a branch chain across a block boundary", async () => {
    const source = "A の場合は B する。\n\nただし C の場合は D する。\n\nそれでも成立しない場合は E する。";

    expect(await analyze(source)).toEqual([]);
  });
});
