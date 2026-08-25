import { parse } from "@textlint/markdown-to-ast";
import { describe, expect, it } from "vitest";
import { runRiskAnalysis } from "../../src/analyzer/classify-risk.js";

const analyze = (source: string) => runRiskAnalysis(parse(source));

describe("instruction risk classification", () => {
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
