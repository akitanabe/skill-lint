import { describe, expect, it } from "vitest";
import { classifyInstructionRisks } from "../../src/analyzer/classify-risk.js";
import type { InstructionBlockSignals, SentenceSignal } from "../../src/analyzer/types.js";

const sentenceSignal = (
  id: string,
  range: readonly [number, number],
  actions: number,
  conditions = 0,
  exception = false,
  chains?: {
    readonly actions?: readonly string[];
    readonly branches?: readonly string[];
  }
): SentenceSignal => ({
  id,
  sentence: {
    text: "",
    normalizedRange: range,
    originalRange: range,
    contexts: []
  },
  actionChainIds: chains?.actions ?? Array.from({ length: actions }, (_, index) => `${id}:action:${index}`),
  branchActionChainIds: chains?.branches ?? Array.from({ length: actions }, (_, index) => `${id}:branch-action:${index}`),
  conditionCount: conditions,
  hasExceptionContinuation: exception,
  hasFallback: false
});

const blockSignals = (id: string, sentences: readonly SentenceSignal[]): InstructionBlockSignals => ({
  id,
  block: {
    node: {} as InstructionBlockSignals["block"]["node"],
    sourceRange: [sentences[0].sentence.originalRange[0], sentences.at(-1)?.sentence.originalRange[1] ?? 0],
    normalizedText: "",
    sourceMap: [],
    sentences: sentences.map(({ sentence }) => sentence)
  },
  sentences
});

describe("risk candidate selection", () => {
  it("selects the nested winner for overlapping candidates", () => {
    const block = blockSignals("block:0", [
      sentenceSignal("sentence:0", [0, 5], 1),
      sentenceSignal("sentence:1", [5, 20], 4, 2, true)
    ]);

    expect(classifyInstructionRisks([block]).map(({ ruleId }) => ruleId)).toEqual([
      "nested-normative-instruction"
    ]);
  });

  it("keeps touching but non-overlapping candidates as separate source-ordered loci", () => {
    const blocks = [
      blockSignals("block:0", [sentenceSignal("sentence:0", [0, 10], 4)]),
      blockSignals("block:1", [sentenceSignal("sentence:1", [10, 20], 4)])
    ];

    expect(classifyInstructionRisks(blocks).map(({ blockId, range }) => ({ blockId, range }))).toEqual([
      { blockId: "block:0", range: [0, 10] },
      { blockId: "block:1", range: [10, 20] }
    ]);
  });

  it("selects the conditional winner over an overloaded candidate", () => {
    const block = blockSignals("block:0", [sentenceSignal("sentence:0", [0, 20], 4, 3)]);

    expect(classifyInstructionRisks([block]).map(({ ruleId }) => ruleId)).toEqual([
      "excessive-conditional-branches"
    ]);
  });

  it("groups non-overlapping candidates that share an action chain", () => {
    const sharedChain = "block:0:shared";
    const block = blockSignals("block:0", [
      sentenceSignal("sentence:0", [0, 10], 3, 3, false, {
        branches: [sharedChain, "branch:1", "branch:2"]
      }),
      sentenceSignal("sentence:1", [10, 20], 4, 0, false, {
        actions: [sharedChain, "action:1", "action:2", "action:3"]
      })
    ]);

    expect(classifyInstructionRisks([block]).map(({ ruleId, range }) => ({ ruleId, range }))).toEqual([
      { ruleId: "excessive-conditional-branches", range: [0, 10] }
    ]);
  });

  it("does not group candidates from different instruction blocks", () => {
    const sharedChain = "shared";
    const blocks = [
      blockSignals("block:0", [sentenceSignal("sentence:0", [0, 10], 4, 0, false, {
        actions: [sharedChain, "left:1", "left:2", "left:3"]
      })]),
      blockSignals("block:1", [sentenceSignal("sentence:1", [10, 20], 4, 0, false, {
        actions: [sharedChain, "right:1", "right:2", "right:3"]
      })])
    ];

    expect(classifyInstructionRisks(blocks)).toHaveLength(2);
  });
});
