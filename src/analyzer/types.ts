import type { TxtListItemNode, TxtNodeRange, TxtParagraphNode } from "@textlint/ast-node-types";
import type { SentencePairMarkContext } from "sentence-splitter";

export type InstructionSourceRange = TxtNodeRange;

export type InstructionTextMap = {
  readonly normalizedRange: InstructionSourceRange;
  readonly originalRange: InstructionSourceRange;
};

export type InstructionSentence = {
  readonly text: string;
  readonly normalizedRange: InstructionSourceRange;
  readonly originalRange: InstructionSourceRange;
  readonly contexts: readonly SentencePairMarkContext[];
};

export type InstructionBlockNode = TxtParagraphNode | TxtListItemNode;

export type InstructionBlock = {
  readonly node: InstructionBlockNode;
  readonly sourceRange: InstructionSourceRange;
  readonly normalizedText: string;
  readonly sourceMap: readonly InstructionTextMap[];
  readonly sentences: readonly InstructionSentence[];
};

export type RiskRuleId =
  | "nested-normative-instruction"
  | "excessive-conditional-branches"
  | "overloaded-instruction";

export type SentenceSignal = {
  readonly id: string;
  readonly sentence: InstructionSentence;
  readonly actionChainIds: readonly string[];
  readonly branchActionChainIds: readonly string[];
  readonly conditionCount: number;
  readonly hasExceptionContinuation: boolean;
  readonly hasFallback: boolean;
};

export type InstructionBlockSignals = {
  readonly id: string;
  readonly block: InstructionBlock;
  readonly sentences: readonly SentenceSignal[];
};

export type RiskCandidate = {
  readonly id: string;
  readonly ruleId: RiskRuleId;
  readonly message: string;
  readonly range: InstructionSourceRange;
  readonly blockId: string;
  readonly chainIds: readonly string[];
};
