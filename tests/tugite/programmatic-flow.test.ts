import { parse } from "@textlint/markdown-to-ast";
import { describe, expect, it } from "vitest";
import {
  analyzeProgrammaticFlowDiscretion,
  analyzeProgrammaticFlowStructure
} from "../../src/tugite/programmatic-flow.js";

const validFlow = (name = "dependency-routing", procedure = "入力 Data に対して固定条件を評価する。") => [
  "## Programmatic Flows",
  "",
  `### ${name}`,
  "",
  "Trigger: 親が固定判定を要求したとき。",
  "Inputs: 親確定 Data。",
  `Procedure: ${procedure}`,
  "Outcomes: `ready` または `blocked`。"
].join("\n");

const analyzeStructure = (source: string) =>
  analyzeProgrammaticFlowStructure(parse(source), source);

const analyzeDiscretion = (source: string) =>
  analyzeProgrammaticFlowDiscretion(parse(source), source);

describe("Programmatic Flow structure", () => {
  it("accepts each required field exactly once in canonical order", () => {
    expect(analyzeStructure(validFlow())).toEqual([]);
  });

  it.each([
    [
      "missing",
      validFlow().replace("Inputs: 親確定 Data。\n", ""),
      "不足: Inputs"
    ],
    [
      "duplicate",
      validFlow().replace("Procedure:", "Procedure: first\nProcedure:"),
      "重複: Procedure"
    ],
    [
      "misordered",
      validFlow().replace(
        "Trigger: 親が固定判定を要求したとき。\nInputs: 親確定 Data。",
        "Inputs: 親確定 Data。\nTrigger: 親が固定判定を要求したとき。"
      ),
      "順序"
    ]
  ])("reports a local %s reason", (_name, source, reason) => {
    const [finding] = analyzeStructure(source);

    expect(analyzeStructure(source)).toHaveLength(1);
    expect(finding.message).toContain(reason);
    expect(source.slice(...finding.range)).toBe("### dependency-routing");
  });

  it("does not complete one flow with fields from another flow", () => {
    const source = [
      validFlow("complete"),
      "",
      "### incomplete",
      "",
      "Trigger: x",
      "Inputs: y",
      "Outcomes: z"
    ].join("\n");

    const findings = analyzeStructure(source);

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("incomplete");
    expect(findings[0].message).toContain("不足: Procedure");
  });

  it("ignores intro prose and closes flows at section boundaries", () => {
    const source = [
      "## Programmatic Flows",
      "",
      "Trigger: intro is not a flow",
      "",
      "### valid",
      "",
      "Trigger: x",
      "Inputs: y",
      "Procedure: z",
      "Outcomes: o",
      "",
      "## Other",
      "",
      "### not-a-flow",
      "",
      "Trigger: x"
    ].join("\n");

    expect(analyzeStructure(source)).toEqual([]);
  });

  it("recognizes only direct paragraph fields", () => {
    const source = [
      "## Programmatic Flows",
      "",
      "### nested-fields",
      "",
      "> Trigger: quoted",
      "",
      "- Inputs: listed",
      "",
      "```text",
      "Procedure: code",
      "```",
      "",
      "Outcomes: direct"
    ].join("\n");

    const [finding] = analyzeStructure(source);

    expect(finding.message).toContain("不足: Trigger, Inputs, Procedure");
  });

  it("recognizes four physical field lines in one paragraph", () => {
    expect(analyzeStructure(validFlow())).toEqual([]);
  });

  it("requires exact H2 and H3 section structure", () => {
    const sources = [
      validFlow().replace("## Programmatic Flows", "## Programmatic Flow"),
      validFlow().replace("### dependency-routing", "#### dependency-routing")
    ];

    expect(sources.map(analyzeStructure)).toEqual([[], []]);
  });

  it("does not treat indented or spaced labels as field occurrences", () => {
    const source = validFlow()
      .replace("Trigger:", " Trigger:")
      .replace("Inputs:", "Inputs :");

    expect(analyzeStructure(source)[0].message).toContain("不足: Trigger, Inputs");
  });
});

describe("Programmatic Flow discretion", () => {
  it.each([
    "必要に応じて方法を選ぶ。",
    "適切な方法を選択する。",
    "状況を見て判断する。",
    "Agent が妥当と考える場合は実行する。",
    "任意に候補を追加する。",
    "望ましい場合は候補を変更する。",
    "最適なものを選ぶ。"
  ])("reports explicit local discretion: %s", (procedure) => {
    const source = validFlow("discretion", procedure);
    const [finding] = analyzeDiscretion(source);

    expect(analyzeDiscretion(source)).toHaveLength(1);
    expect(finding.message).toContain("Procedure");
    expect(procedure).toContain(source.slice(...finding.range));
  });

  it.each([
    "finding の意味的な採否を Flow 内で決めず、Agentic な親へ返す。",
    "複数の妥当な Action が残る場合は Human へ返す。",
    "必要に応じて方法を選ぶかは Agentic な親へ返す。",
    "必要に応じて方法を選ぶかを Flow 内で決めず、固定条件を評価する。",
    "判断結果を Data として返す。",
    "採否と裁定は親の責務である。",
    "Agent と Human を入力 Data に含める。"
  ])("does not report handoff, negation, or generic vocabulary: %s", (procedure) => {
    expect(analyzeDiscretion(validFlow("boundary", procedure))).toEqual([]);
  });

  it("checks only Procedure field prose", () => {
    const source = validFlow().replace(
      "Trigger: 親が固定判定を要求したとき。",
      "Trigger: 必要に応じて方法を選ぶ。"
    );

    expect(analyzeDiscretion(source)).toEqual([]);
  });

  it("excludes inline code and fenced code while retaining visible prose", () => {
    const inline = validFlow("inline", "`必要に応じて方法を選ぶ` と記録する。");
    const fenced = [
      validFlow("fenced"),
      "",
      "```text",
      "Procedure: 必要に応じて方法を選ぶ。",
      "```"
    ].join("\n");
    const visible = validFlow("visible", "必要に応じて方法を選ぶ。");

    expect(analyzeDiscretion(inline)).toEqual([]);
    expect(analyzeDiscretion(fenced)).toEqual([]);
    expect(analyzeDiscretion(visible)).toHaveLength(1);
  });

  it("excludes HTML comments from Procedure prose", () => {
    const commented = validFlow("commented", "<!-- 必要に応じて方法を選ぶ。 --> 固定結果を返す。");
    const visible = validFlow("visible", "必要に応じて方法を選ぶ。");

    expect(analyzeDiscretion(commented)).toEqual([]);
    expect(analyzeDiscretion(visible)).toHaveLength(1);
  });

  it("checks each Procedure occurrence independently in a malformed flow", () => {
    const source = validFlow("duplicate-procedure", "必要に応じて方法を選ぶ。")
      .replace("Outcomes:", "Procedure: 任意に候補を追加する。\nOutcomes:");

    expect(analyzeStructure(source)[0].message).toContain("重複: Procedure");
    expect(analyzeDiscretion(source)).toHaveLength(2);
  });
});
