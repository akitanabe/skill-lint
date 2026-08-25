import { parse } from "@textlint/markdown-to-ast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeInstructionBlocks } from "../../src/analyzer/instruction-block.js";
import { collectInstructionSignals } from "../../src/analyzer/sentence-signals.js";

const tokenize = vi.fn(async () => []);

describe("sentence signal collection", () => {
  beforeEach(() => {
    tokenize.mockClear();
  });

  it.each([
    "通常の説明文です。",
    "A の場合は B する。ただし C の場合は D し、それでも成立しない場合は E とする。",
    "A する。ただし B の場合は C し、D なら E する。"
  ])("does not tokenize a sentence that cannot be overloaded: %s", async (source) => {
    await collectInstructionSignals(normalizeInstructionBlocks(parse(source)), tokenize);

    expect(tokenize).not.toHaveBeenCalled();
  });

  it("tokenizes a coordinated sentence that can reach the overloaded threshold", async () => {
    const source = "確認し、比較して、必要なら修正し、結果を報告する。";

    await collectInstructionSignals(normalizeInstructionBlocks(parse(source)), tokenize);

    expect(tokenize).toHaveBeenCalledOnce();
    expect(tokenize).toHaveBeenCalledWith(source);
  });
});
