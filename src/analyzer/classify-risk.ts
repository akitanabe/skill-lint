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

const priority = (ruleId: RiskRuleId): number => [
  "nested-normative-instruction",
  "excessive-conditional-branches",
  "overloaded-instruction"
].indexOf(ruleId);

export const classifyInstructionRisks = (
  blocks: readonly InstructionBlockSignals[]
): readonly RiskCandidate[] => {
  const candidatesByBlock = blocks.map((block) => [
    ...classifyNested(block),
    ...classifyConditional(block),
    ...classifyOverloaded(block)
  ]);
  const winners: RiskCandidate[] = [];

  for (const candidates of candidatesByBlock) {
    winners.push(...selectBlockWinners(candidates));
  }

  return winners.sort((left, right) => left.range[0] - right.range[0]);
};

const selectBlockWinners = (
  candidates: readonly RiskCandidate[]
): readonly RiskCandidate[] => {
  const parent = candidates.map((_, index) => index);
  const root = (index: number): number => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };
  const unite = (left: number, right: number): void => {
    parent[root(right)] = root(left);
  };

  const sourceOrdered = candidates
    .map((_, index) => index)
    .sort((left, right) => candidates[left].range[0] - candidates[right].range[0]);
  let overlapRepresentative: number | undefined;
  let overlapEnd = -1;
  for (const index of sourceOrdered) {
    if (
      overlapRepresentative !== undefined &&
      candidates[index].range[0] < overlapEnd
    ) {
      unite(overlapRepresentative, index);
      overlapEnd = Math.max(overlapEnd, candidates[index].range[1]);
    } else {
      overlapRepresentative = index;
      overlapEnd = candidates[index].range[1];
    }
  }

  const chainRepresentatives = new Map<string, number>();
  candidates.forEach((item, index) => {
    for (const chainId of item.chainIds) {
      const representative = chainRepresentatives.get(chainId);
      if (representative === undefined) {
        chainRepresentatives.set(chainId, index);
      } else {
        unite(representative, index);
      }
    }
  });

  const winnerByLocus = new Map<number, RiskCandidate>();
  candidates.forEach((item, index) => {
    const locus = root(index);
    const current = winnerByLocus.get(locus);
    if (current === undefined || priority(item.ruleId) < priority(current.ruleId)) {
      winnerByLocus.set(locus, item);
    }
  });
  return [...winnerByLocus.values()];
};

export const runRiskAnalysis = async (
  document: TxtDocumentNode
): Promise<readonly RiskCandidate[]> => {
  const blocks = normalizeInstructionBlocks(document);
  const signals = await collectInstructionSignals(blocks);
  return classifyInstructionRisks(signals);
};
