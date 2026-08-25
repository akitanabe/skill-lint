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
