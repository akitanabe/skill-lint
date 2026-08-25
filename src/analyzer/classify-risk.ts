import type { TxtDocumentNode } from "@textlint/ast-node-types";
import { normalizeInstructionBlocks } from "./instruction-block.js";
import { collectInstructionSignals } from "./sentence-signals.js";
import type { InstructionBlockSignals, RiskCandidate, RiskRuleId } from "./types.js";

const THRESHOLDS = {
  nestedConditionDepth: 2,
  conditionalBranches: 3,
  overloadedActions: 4
} as const;

const MESSAGES: Readonly<Record<RiskRuleId, string>> = {
  "nested-normative-instruction": "条件のスコープ内に規範的な判断が入れ子になっています。",
  "excessive-conditional-branches": "同じ指示ブロックに結果を選ぶ条件分岐が集中しています。",
  "overloaded-instruction": "1文に独立したアクションが詰め込まれています。"
};

const candidate = (
  ruleId: RiskRuleId,
  block: InstructionBlockSignals,
  index: number,
  range: readonly [number, number],
  chainIds: readonly string[]
): RiskCandidate => ({
  id: `${block.id}:${ruleId}:${index}`,
  ruleId,
  message: MESSAGES[ruleId],
  range,
  blockId: block.id,
  chainIds
});

const classifyNested = (block: InstructionBlockSignals): readonly RiskCandidate[] => {
  const candidates: RiskCandidate[] = [];
  block.sentences.forEach((sentence, index) => {
    if (
      index > 0 &&
      sentence.hasExceptionContinuation &&
      !sentence.hasFallback &&
      sentence.conditionCount >= THRESHOLDS.nestedConditionDepth &&
      sentence.branchActionChainIds.length >= THRESHOLDS.nestedConditionDepth
    ) {
      const previous = block.sentences[index - 1];
      candidates.push(candidate(
        "nested-normative-instruction",
        block,
        index,
        [previous.sentence.originalRange[0], sentence.sentence.originalRange[1]],
        [...previous.branchActionChainIds, ...sentence.branchActionChainIds]
      ));
    }
  });
  return candidates;
};

const classifyConditional = (block: InstructionBlockSignals): readonly RiskCandidate[] => {
  const branchSentences = block.sentences.filter(
    (sentence) => sentence.conditionCount > 0 && sentence.branchActionChainIds.length > 0
  );
  const branches = branchSentences.reduce(
    (count, sentence) => count + Math.min(sentence.conditionCount, sentence.branchActionChainIds.length),
    0
  );
  if (branches < THRESHOLDS.conditionalBranches) {
    return [];
  }
  const first = branchSentences[0];
  const last = branchSentences[branchSentences.length - 1];
  return [candidate(
    "excessive-conditional-branches",
    block,
    0,
    [first.sentence.originalRange[0], last.sentence.originalRange[1]],
    branchSentences.flatMap(({ branchActionChainIds }) => branchActionChainIds)
  )];
};

const classifyOverloaded = (block: InstructionBlockSignals): readonly RiskCandidate[] =>
  block.sentences.flatMap((sentence, index) =>
    sentence.actionChainIds.length >= THRESHOLDS.overloadedActions
      ? [candidate(
          "overloaded-instruction",
          block,
          index,
          sentence.sentence.originalRange,
          sentence.actionChainIds
        )]
      : []
  );

const overlaps = (left: RiskCandidate, right: RiskCandidate): boolean =>
  left.range[0] < right.range[1] && right.range[0] < left.range[1];

const sharesChain = (left: RiskCandidate, right: RiskCandidate): boolean =>
  left.chainIds.some((id) => right.chainIds.includes(id));

const priority = (ruleId: RiskRuleId): number => [
  "nested-normative-instruction",
  "excessive-conditional-branches",
  "overloaded-instruction"
].indexOf(ruleId);

export const classifyInstructionRisks = (
  blocks: readonly InstructionBlockSignals[]
): readonly RiskCandidate[] => {
  const all = blocks.flatMap((block) => [
    ...classifyNested(block),
    ...classifyConditional(block),
    ...classifyOverloaded(block)
  ]);
  const parent = all.map((_, index) => index);
  const root = (index: number): number => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };
  for (let left = 0; left < all.length; left += 1) {
    for (let right = left + 1; right < all.length; right += 1) {
      if (overlaps(all[left], all[right]) || sharesChain(all[left], all[right])) {
        parent[root(right)] = root(left);
      }
    }
  }
  const winners = new Map<number, RiskCandidate>();
  all.forEach((item, index) => {
    const locus = root(index);
    const current = winners.get(locus);
    if (current === undefined || priority(item.ruleId) < priority(current.ruleId)) {
      winners.set(locus, item);
    }
  });
  return [...winners.values()].sort((left, right) => left.range[0] - right.range[0]);
};

export const runRiskAnalysis = async (
  document: TxtDocumentNode
): Promise<readonly RiskCandidate[]> => {
  const blocks = normalizeInstructionBlocks(document);
  const signals = await collectInstructionSignals(blocks);
  return classifyInstructionRisks(signals);
};
