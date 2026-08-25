import type { TxtDocumentNode, TxtListItemNode, TxtNode, TxtParagraphNode, TxtParentNode } from "@textlint/ast-node-types";
import { splitAST, type TxtSentenceNode } from "sentence-splitter";
import type {
  InstructionBlock,
  InstructionBlockNode,
  InstructionSentence,
  InstructionTextMap
} from "./types.js";

type TextToken =
  | {
      readonly kind: "text";
      readonly text: string;
      readonly originalRange: readonly [number, number];
    }
  | { readonly kind: "excluded" };

type ParagraphResult = {
  readonly text: string;
  readonly sourceMap: readonly InstructionTextMap[];
  readonly sentences: readonly InstructionSentence[];
};

const excludedInlineTypes = new Set([
  "Code",
  "Html",
  "Comment",
  "HtmlBlock",
  "CodeBlock",
  "Image",
  "ImageReference"
]);
const excludedContainerTypes = new Set(["Header", "Table", "TableRow", "TableCell", "HorizontalRule"]);

const hasChildren = (node: TxtNode): node is TxtParentNode => "children" in node;

const isParagraph = (node: TxtNode): node is TxtParagraphNode => node.type === "Paragraph";

const isListItem = (node: TxtNode): node is TxtListItemNode => node.type === "ListItem";

const isSentence = (node: TxtNode | { readonly type: string }): node is TxtSentenceNode =>
  node.type === "Sentence";

const appendTokenText = (tokens: TextToken[], node: TxtNode, text: string): void => {
  if (text.length > 0) {
    tokens.push({
      kind: "text",
      text,
      originalRange: node.range
    });
  }
};

const collectTextTokens = (node: TxtNode, tokens: TextToken[]): void => {
  if (excludedInlineTypes.has(node.type)) {
    tokens.push({ kind: "excluded" });
    return;
  }

  if (node.type === "Str") {
    appendTokenText(tokens, node, "value" in node && typeof node.value === "string" ? node.value : node.raw);
    return;
  }

  if (node.type === "Break") {
    appendTokenText(tokens, node, node.raw || "\n");
    return;
  }

  if (hasChildren(node)) {
    for (const child of node.children) {
      collectTextTokens(child, tokens);
    }
  }
};

const addMapEntry = (
  sourceMap: InstructionTextMap[],
  normalizedStart: number,
  text: string,
  originalRange: readonly [number, number]
): number => {
  const normalizedEnd = normalizedStart + text.length;
  if (text.length > 0) {
    sourceMap.push({
      normalizedRange: [normalizedStart, normalizedEnd],
      originalRange
    });
  }
  return normalizedEnd;
};

const normalizeTokens = (tokens: readonly TextToken[]): {
  readonly text: string;
  readonly sourceMap: readonly InstructionTextMap[];
} => {
  const sourceMap: InstructionTextMap[] = [];
  let text = "";
  let pendingExcluded = false;
  let previousTextToken: Extract<TextToken, { kind: "text" }> | undefined;

  for (const token of tokens) {
    if (token.kind === "excluded") {
      pendingExcluded = true;
      continue;
    }

    const previousToken = previousTextToken;
    const normalizedToken =
      pendingExcluded &&
      previousToken !== undefined &&
      /\s$/.test(previousToken.text) &&
      /^\s/.test(token.text)
        ? {
            ...token,
            text: token.text.slice(1),
            originalRange: [token.originalRange[0] + 1, token.originalRange[1]] as readonly [number, number]
          }
        : token;
    const shouldSeparate =
      pendingExcluded &&
      previousToken !== undefined &&
      !/\s$/.test(previousToken.text) &&
      !/^\s/.test(normalizedToken.text);
    if (shouldSeparate) {
      const previousEnd = previousToken.originalRange[1];
      text += " ";
      addMapEntry(sourceMap, text.length - 1, " ", [previousEnd, token.originalRange[0]]);
    }

    const normalizedStart = text.length;
    text += normalizedToken.text;
    addMapEntry(
      sourceMap,
      normalizedStart,
      normalizedToken.text,
      normalizedToken.originalRange
    );
    pendingExcluded = false;
    previousTextToken = normalizedToken;
  }

  return { text, sourceMap };
};

const sourceMapForSentence = (
  sentence: TxtSentenceNode,
  sourceMap: readonly InstructionTextMap[],
  text: string
): InstructionSentence | undefined => {
  const sentenceEntries = sourceMap.filter(
    ({ originalRange }) => originalRange[0] < sentence.range[1] && sentence.range[0] < originalRange[1]
  );
  if (sentenceEntries.length === 0) {
    return undefined;
  }

  const firstEntry = sentenceEntries[0];
  const lastEntry = sentenceEntries[sentenceEntries.length - 1];
  const projectOriginalOffset = (
    entry: InstructionTextMap,
    originalOffset: number,
    round: "down" | "up"
  ): number => {
    const originalLength = entry.originalRange[1] - entry.originalRange[0];
    const normalizedLength = entry.normalizedRange[1] - entry.normalizedRange[0];
    if (originalLength === 0) {
      return entry.normalizedRange[0];
    }
    const boundedOriginalOffset = Math.min(
      Math.max(originalOffset, entry.originalRange[0]),
      entry.originalRange[1]
    );
    const ratio = (boundedOriginalOffset - entry.originalRange[0]) / originalLength;
    const projected = entry.normalizedRange[0] + ratio * normalizedLength;
    return round === "down" ? Math.floor(projected) : Math.ceil(projected);
  };
  const normalizedStart = projectOriginalOffset(firstEntry, sentence.range[0], "down");
  const normalizedEnd = projectOriginalOffset(lastEntry, sentence.range[1], "up");
  return {
    text: text.slice(normalizedStart, normalizedEnd),
    normalizedRange: [normalizedStart, normalizedEnd],
    originalRange: sentence.range,
    contexts: sentence.contexts
  };
};

const normalizeParagraph = (paragraph: TxtParagraphNode): ParagraphResult => {
  const tokens: TextToken[] = [];
  for (const child of paragraph.children) {
    collectTextTokens(child, tokens);
  }

  const normalized = normalizeTokens(tokens);
  const sentenceNodes = splitAST(paragraph as unknown as Parameters<typeof splitAST>[0]).children.filter(isSentence);
  const sentences = sentenceNodes
    .map((sentence) => sourceMapForSentence(sentence, normalized.sourceMap, normalized.text))
    .filter((sentence): sentence is InstructionSentence => sentence !== undefined);

  return {
    text: normalized.text,
    sourceMap: normalized.sourceMap,
    sentences
  };
};

const combineParagraphs = (
  blockNode: InstructionBlockNode,
  paragraphs: readonly TxtParagraphNode[]
): InstructionBlock | undefined => {
  const results = paragraphs.map(normalizeParagraph).filter(({ text }) => text.length > 0);
  if (results.length === 0) {
    return undefined;
  }

  const sourceMap: InstructionTextMap[] = [];
  const sentences: InstructionSentence[] = [];
  let normalizedText = "";
  let previousResult: ParagraphResult | undefined;

  for (const result of results) {
    if (previousResult !== undefined) {
      const previousEntry = previousResult.sourceMap[previousResult.sourceMap.length - 1];
      const firstEntry = result.sourceMap[0];
      if (previousEntry !== undefined && firstEntry !== undefined) {
        const separatorStart = normalizedText.length;
        normalizedText += "\n";
        sourceMap.push({
          normalizedRange: [separatorStart, separatorStart + 1],
          originalRange: [previousEntry.originalRange[1], firstEntry.originalRange[0]]
        });
      }
    }

    const normalizedOffset = normalizedText.length;
    normalizedText += result.text;
    sourceMap.push(
      ...result.sourceMap.map((entry) => ({
        ...entry,
        normalizedRange: [
          entry.normalizedRange[0] + normalizedOffset,
          entry.normalizedRange[1] + normalizedOffset
        ] as readonly [number, number]
      }))
    );
    sentences.push(
      ...result.sentences.map((sentence) => ({
        ...sentence,
        normalizedRange: [
          sentence.normalizedRange[0] + normalizedOffset,
          sentence.normalizedRange[1] + normalizedOffset
        ] as readonly [number, number],
        text: normalizedText.slice(
          sentence.normalizedRange[0] + normalizedOffset,
          sentence.normalizedRange[1] + normalizedOffset
        )
      }))
    );
    previousResult = result;
  }

  return {
    node: blockNode,
    sourceRange: blockNode.range,
    normalizedText,
    sourceMap,
    sentences
  };
};

const directParagraphs = (node: TxtListItemNode): readonly TxtParagraphNode[] =>
  node.children.filter(isParagraph);

export const normalizeInstructionBlock = (
  node: TxtParagraphNode | TxtListItemNode
): InstructionBlock | undefined =>
  combineParagraphs(node, isParagraph(node) ? [node] : directParagraphs(node));

const visit = (node: TxtNode, insideListItem: boolean, blocks: InstructionBlock[]): void => {
  if (isListItem(node)) {
    const block = normalizeInstructionBlock(node);
    if (block !== undefined) {
      blocks.push(block);
    }
    for (const child of node.children) {
      visit(child, child.type === "BlockQuote" ? false : true, blocks);
    }
    return;
  }

  if (isParagraph(node)) {
    if (!insideListItem) {
      const block = normalizeInstructionBlock(node);
      if (block !== undefined) {
        blocks.push(block);
      }
    }
    return;
  }

  if (excludedContainerTypes.has(node.type)) {
    return;
  }

  if (hasChildren(node)) {
    for (const child of node.children) {
      visit(child, insideListItem, blocks);
    }
  }
};

export const normalizeInstructionBlocks = (document: TxtDocumentNode): readonly InstructionBlock[] => {
  const blocks: InstructionBlock[] = [];
  visit(document, false, blocks);
  return blocks;
};

export type { InstructionBlock, InstructionBlockNode, InstructionSentence, InstructionTextMap } from "./types.js";
