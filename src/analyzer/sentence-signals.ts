import { tokenize, type KuromojiToken } from "kuromojin";
import {
  canReachOverloadedThreshold,
  explicitActionClauseOffsets,
  proceduralActionOffsets
} from "../ja/action-predicates.js";
import { CONDITION_PATTERNS, EXCEPTION_MARKERS, FALLBACK_MARKERS } from "../ja/lexicon.js";
import type { InstructionBlock, InstructionBlockSignals, SentenceSignal } from "./types.js";

export type TokenizeSentence = (
  text: string
) => Promise<Readonly<Readonly<KuromojiToken>[]>>;

const countMatches = (text: string, pattern: RegExp): number => [...text.matchAll(pattern)].length;

const conditionCount = (text: string): number =>
  CONDITION_PATTERNS.reduce((count, pattern) => count + countMatches(text, pattern), 0);

const loadSentenceSignal = async (
  blockId: string,
  sentenceIndex: number,
  sentence: InstructionBlock["sentences"][number],
  tokenizeSentence: TokenizeSentence
): Promise<SentenceSignal> => {
  const tokens = canReachOverloadedThreshold(sentence.text)
    ? await tokenizeSentence(sentence.text)
    : [];
  const actionOffsets = proceduralActionOffsets(sentence.text, tokens);
  const branchActionOffsets = explicitActionClauseOffsets(sentence.text);
  const id = `${blockId}:sentence:${sentenceIndex}`;
  return {
    id,
    sentence,
    actionChainIds: actionOffsets.map((_, actionIndex) => `${id}:action:${actionIndex}`),
    branchActionChainIds: branchActionOffsets.map((_, actionIndex) => `${id}:branch-action:${actionIndex}`),
    conditionCount: conditionCount(sentence.text),
    hasExceptionContinuation: EXCEPTION_MARKERS.some((marker) => sentence.text.startsWith(marker)),
    hasFallback: FALLBACK_MARKERS.some((marker) => sentence.text.includes(marker))
  };
};

export const collectInstructionSignals = async (
  blocks: readonly InstructionBlock[],
  tokenizeSentence: TokenizeSentence = tokenize
): Promise<readonly InstructionBlockSignals[]> =>
  Promise.all(blocks.map(async (block, blockIndex) => {
    const id = `block:${blockIndex}`;
    return {
      id,
      block,
      sentences: await Promise.all(
        block.sentences.map((sentence, sentenceIndex) =>
          loadSentenceSignal(id, sentenceIndex, sentence, tokenizeSentence)
        )
      )
    };
  }));
