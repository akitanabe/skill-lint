import { parse } from "@textlint/markdown-to-ast";
import { describe, expect, it } from "vitest";
import { normalizeInstructionBlocks } from "../../src/analyzer/instruction-block.js";

const parseDocument = (source: string) => parse(source);

describe("instruction block normalization", () => {
  it("keeps only prose blocks and excludes markdown containers and inline syntax", () => {
    const source = [
      "---",
      "title: ignored",
      "---",
      "# Heading is ignored",
      "",
      "Keep **bold** and `inline code` here. <!-- comment --> Next sentence.",
      "",
      "> Keep quoted prose.",
      ">",
      "> - Keep quoted list.",
      "",
      "```ts",
      "ignored code block.",
      "```",
      "",
      "| table | cell |",
      "| --- | --- |",
      "| ignored | ignored |",
      "",
      "- outer prose",
      "  - nested prose",
      "- second item"
    ].join("\n");

    const blocks = normalizeInstructionBlocks(parseDocument(source));

    expect(blocks.map(({ node, normalizedText }) => [node.type, normalizedText])).toEqual([
      ["Paragraph", "Keep bold and here. Next sentence."],
      ["Paragraph", "Keep quoted prose."],
      ["ListItem", "Keep quoted list."],
      ["ListItem", "outer prose"],
      ["ListItem", "nested prose"],
      ["ListItem", "second item"]
    ]);
    expect(blocks.map(({ node }) => node.type)).not.toContain("Header");
    expect(blocks.map(({ node }) => node.type)).not.toContain("TableCell");
    expect(blocks.every(({ normalizedText }) => !normalizedText.includes("inlinecode"))).toBe(true);
  });

  it("does not register a list item's paragraphs a second time", () => {
    const source = "- first paragraph\n\n  second paragraph\n\n  - nested item";
    const blocks = normalizeInstructionBlocks(parseDocument(source));

    expect(blocks).toHaveLength(2);
    expect(blocks.map(({ node, normalizedText }) => [node.type, normalizedText])).toEqual([
      ["ListItem", "first paragraph\nsecond paragraph"],
      ["ListItem", "nested item"]
    ]);
  });

  it("retains prose nested in a block quote even when the quote is inside a list item", () => {
    const source = "- item\n\n  > quoted item prose\n\n  - nested item";
    const blocks = normalizeInstructionBlocks(parseDocument(source));

    expect(blocks.map(({ node, normalizedText }) => [node.type, normalizedText])).toEqual([
      ["ListItem", "item"],
      ["Paragraph", "quoted item prose"],
      ["ListItem", "nested item"]
    ]);
  });

  it("keeps sentence ranges, source mappings, and quote contexts local to each block", () => {
    const source = "A first sentence. A second (quoted) sentence.";
    const [block] = normalizeInstructionBlocks(parseDocument(source));

    expect(block.sentences.map(({ text }) => text)).toEqual([
      "A first sentence.",
      "A second (quoted) sentence."
    ]);
    expect(block.sentences.map(({ normalizedRange }) => normalizedRange)).toEqual([
      [0, 17],
      [18, source.length]
    ]);
    expect(block.sentences.map(({ originalRange }) => originalRange)).toEqual([
      [0, 17],
      [18, source.length]
    ]);
    expect(block.sentences[1].contexts).toHaveLength(1);
    expect(block.sentences[1].contexts[0].range).toEqual([27, 34]);
    expect(block.sourceMap.map(({ normalizedRange, originalRange }) => [normalizedRange, originalRange])).toEqual([
      [[0, source.length], [0, source.length]]
    ]);
  });

  it("maps visible text after excluded inline syntax without concatenating it", () => {
    const source = "before`excluded`after and <!-- hidden -->done.";
    const [block] = normalizeInstructionBlocks(parseDocument(source));

    expect(block.normalizedText).toBe("before after and done.");
    expect(block.sourceMap.map(({ normalizedRange, originalRange }) => [normalizedRange, originalRange])).toEqual([
      [[0, 6], [0, 6]],
      [[6, 7], [6, 16]],
      [[7, 17], [16, 26]],
      [[17, 22], [41, 46]]
    ]);
  });

  it("does not combine separate prose blocks", () => {
    const source = "First paragraph.\n\n# Heading\n\nSecond paragraph.";
    const blocks = normalizeInstructionBlocks(parseDocument(source));

    expect(blocks.map(({ normalizedText }) => normalizedText)).toEqual([
      "First paragraph.",
      "Second paragraph."
    ]);
    expect(blocks[0].sourceRange).toEqual([0, 16]);
    expect(blocks[1].sourceRange).toEqual([29, 46]);
  });
});
