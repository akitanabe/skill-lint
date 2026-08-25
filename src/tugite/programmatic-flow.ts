import type {
  TxtDocumentNode,
  TxtHeaderNode,
  TxtNode,
  TxtNodeRange,
  TxtParagraphNode,
  TxtParentNode,
  TxtStrNode
} from "@textlint/ast-node-types";

const requiredFields = ["Trigger", "Inputs", "Procedure", "Outcomes"] as const;

type ProgrammaticFlowFieldLabel = typeof requiredFields[number];

type ProgrammaticFlowField = {
  readonly label: ProgrammaticFlowFieldLabel;
  readonly range: TxtNodeRange;
  readonly proseRange: TxtNodeRange;
  readonly paragraph: TxtParagraphNode;
};

type ProgrammaticFlow = {
  readonly name: string;
  readonly headingRange: TxtNodeRange;
  readonly fields: readonly ProgrammaticFlowField[];
};

export type ProgrammaticFlowFinding = {
  readonly message: string;
  readonly range: TxtNodeRange;
};

const hasChildren = (node: TxtNode): node is TxtParentNode => "children" in node;

const isHeader = (node: TxtNode): node is TxtHeaderNode => node.type === "Header";

const isParagraph = (node: TxtNode): node is TxtParagraphNode => node.type === "Paragraph";

const isStr = (node: TxtNode): node is TxtStrNode => node.type === "Str";

const collectVisibleText = (node: TxtNode): string => {
  if (isStr(node)) {
    return node.value;
  }
  if (!hasChildren(node)) {
    return "";
  }
  return node.children.map(collectVisibleText).join("");
};

const fieldLabelAt = (line: string): ProgrammaticFlowFieldLabel | undefined =>
  requiredFields.find((label) => line.startsWith(`${label}:`));

const fieldsInParagraph = (
  paragraph: TxtParagraphNode,
  source: string
): readonly ProgrammaticFlowField[] => {
  const paragraphSource = source.slice(...paragraph.range);
  const fields: ProgrammaticFlowField[] = [];
  const linePattern = /[^\r\n]*(?:\r?\n|$)/g;

  for (const match of paragraphSource.matchAll(linePattern)) {
    if (match[0].length === 0) {
      continue;
    }
    const line = match[0].replace(/\r?\n$/, "");
    const label = fieldLabelAt(line);
    if (label === undefined) {
      continue;
    }
    const lineStart = paragraph.range[0] + (match.index ?? 0);
    const physicalLineStart = source.lastIndexOf("\n", lineStart - 1) + 1;
    if (physicalLineStart !== lineStart) {
      continue;
    }
    const lineEnd = lineStart + line.length;
    fields.push({
      label,
      range: [lineStart, lineEnd],
      proseRange: [lineStart + label.length + 1, lineEnd],
      paragraph
    });
  }

  return fields;
};

const extractProgrammaticFlows = (
  document: TxtDocumentNode,
  source: string
): readonly ProgrammaticFlow[] => {
  const flows: ProgrammaticFlow[] = [];
  let inProgrammaticFlows = false;
  let currentFlow: {
    name: string;
    headingRange: TxtNodeRange;
    fields: ProgrammaticFlowField[];
  } | undefined;

  const finishCurrentFlow = (): void => {
    if (currentFlow !== undefined) {
      flows.push(currentFlow);
      currentFlow = undefined;
    }
  };

  for (const node of document.children) {
    if (isHeader(node) && node.depth <= 2) {
      finishCurrentFlow();
      inProgrammaticFlows = node.depth === 2 && collectVisibleText(node) === "Programmatic Flows";
      continue;
    }
    if (!inProgrammaticFlows) {
      continue;
    }
    if (isHeader(node) && node.depth === 3) {
      finishCurrentFlow();
      currentFlow = {
        name: collectVisibleText(node),
        headingRange: node.range,
        fields: []
      };
      continue;
    }
    if (currentFlow !== undefined && isParagraph(node)) {
      currentFlow.fields.push(...fieldsInParagraph(node, source));
    }
  }
  finishCurrentFlow();

  return flows;
};

const structureMessage = (flow: ProgrammaticFlow): string | undefined => {
  const counts = new Map<ProgrammaticFlowFieldLabel, number>(
    requiredFields.map((label) => [label, 0])
  );
  for (const field of flow.fields) {
    counts.set(field.label, (counts.get(field.label) ?? 0) + 1);
  }
  const missing = requiredFields.filter((label) => counts.get(label) === 0);
  const duplicate = requiredFields.filter((label) => (counts.get(label) ?? 0) > 1);
  const sequence = flow.fields.map(({ label }) => label);
  const hasCanonicalSequence = sequence.length === requiredFields.length
    && sequence.every((label, index) => label === requiredFields[index]);
  if (missing.length === 0 && duplicate.length === 0 && hasCanonicalSequence) {
    return undefined;
  }

  const reasons = [
    missing.length > 0 ? `不足: ${missing.join(", ")}` : undefined,
    duplicate.length > 0 ? `重複: ${duplicate.join(", ")}` : undefined,
    !hasCanonicalSequence && missing.length === 0 && duplicate.length === 0
      ? `順序: ${sequence.join(" → ")}`
      : undefined
  ].filter((reason): reason is string => reason !== undefined);
  return `Programmatic Flow "${flow.name}" の field 構造が不正です（${reasons.join(" / ")}）。`;
};

export const analyzeProgrammaticFlowStructure = (
  document: TxtDocumentNode,
  source: string
): readonly ProgrammaticFlowFinding[] => extractProgrammaticFlows(document, source)
  .flatMap((flow) => {
    const message = structureMessage(flow);
    return message === undefined ? [] : [{ message, range: flow.headingRange }];
  });

const visibleProse = (
  paragraph: TxtParagraphNode,
  range: TxtNodeRange,
  source: string
): string => {
  const visibleRanges: TxtNodeRange[] = [];
  const collect = (node: TxtNode): void => {
    if (isStr(node)) {
      const start = Math.max(node.range[0], range[0]);
      const end = Math.min(node.range[1], range[1]);
      if (start < end) {
        visibleRanges.push([start, end]);
      }
      return;
    }
    if (hasChildren(node)) {
      node.children.forEach(collect);
    }
  };
  paragraph.children.forEach(collect);
  visibleRanges.sort((left, right) => left[0] - right[0]);

  let cursor = range[0];
  let visible = "";
  for (const [start, end] of visibleRanges) {
    if (start < cursor) {
      continue;
    }
    visible += " ".repeat(start - cursor);
    visible += source.slice(start, end);
    cursor = end;
  }
  return visible + " ".repeat(range[1] - cursor);
};

const discretionPatterns = [
  /必要に応じて.{0,32}?(?:選ぶ|選択する|決める|決定する|判断する|採用する)/g,
  /(?:適切|最適)(?:な|に)?.{0,32}?(?:選ぶ|選択する|決める|決定する|判断する|採用する)/g,
  /状況を見て.{0,32}?(?:判断する|選ぶ|選択する|決める)/g,
  /Agent\s*が妥当と考える場合/g,
  /(?:任意に|望ましい場合(?:は)?).{0,32}?(?:実行する|選ぶ|選択する|決める|判断する|採用する|変更する|追加する|省略する)/g
] as const;

const sentenceAround = (text: string, start: number, end: number): string => {
  const previousStops = ["。", "！", "？"].map((mark) => text.lastIndexOf(mark, start - 1));
  const sentenceStart = Math.max(...previousStops) + 1;
  const nextStops = ["。", "！", "？"]
    .map((mark) => text.indexOf(mark, end))
    .filter((index) => index >= 0);
  const sentenceEnd = nextStops.length === 0 ? text.length : Math.min(...nextStops) + 1;
  return text.slice(sentenceStart, sentenceEnd);
};

const returnsDiscretion = (sentence: string): boolean =>
  /(?:(?:Agentic\s*な)?親|Human|人間).{0,16}(?:へ|に).{0,12}(?:返す|委ねる|確認を求める)/.test(sentence);

const negatesLocalDiscretion = (sentence: string): boolean =>
  /(?:決め|判断せ|判断し|選ば|選択せ|裁定せ|採用せ)(?:ず|ない)/.test(sentence);

const discretionRanges = (field: ProgrammaticFlowField, source: string): readonly TxtNodeRange[] => {
  const prose = visibleProse(field.paragraph, field.proseRange, source);
  const ranges: TxtNodeRange[] = [];

  for (const pattern of discretionPatterns) {
    pattern.lastIndex = 0;
    for (const match of prose.matchAll(pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const sentence = sentenceAround(prose, start, end);
      if (!returnsDiscretion(sentence) && !negatesLocalDiscretion(sentence)) {
        ranges.push([field.proseRange[0] + start, field.proseRange[0] + end]);
      }
    }
  }

  return ranges
    .sort((left, right) => left[0] - right[0] || left[1] - right[1])
    .filter((range, index, sorted) => index === 0 || range[0] >= sorted[index - 1][1]);
};

export const analyzeProgrammaticFlowDiscretion = (
  document: TxtDocumentNode,
  source: string
): readonly ProgrammaticFlowFinding[] => extractProgrammaticFlows(document, source)
  .flatMap(({ fields }) => fields
    .filter(({ label }) => label === "Procedure")
    .flatMap((field) => discretionRanges(field, source)))
  .map((range) => ({
    message: "Programmatic Flow の Procedure に autonomous な裁量が含まれています。",
    range
  }));
