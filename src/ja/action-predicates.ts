import type { KuromojiToken } from "kuromojin";
import { NON_PROCEDURAL_VERBS, QUOTED_EXAMPLE_MARKERS } from "./lexicon.js";

const isQuotedExample = (text: string): boolean =>
  QUOTED_EXAMPLE_MARKERS.some((marker) => text.includes(marker)) && /[『「]/.test(text);

const isExplanatoryProse = (text: string): boolean =>
  /(?:という|といった)(?:文|例|流れ|手順|ケース|設計).*(?:説明|紹介|例示|記述)する/.test(text);

const isProceduralVerb = (token: Readonly<KuromojiToken>): boolean =>
  token.pos === "動詞" &&
  token.pos_detail_1 !== "非自立" &&
  token.conjugated_form !== "連体形" &&
  !NON_PROCEDURAL_VERBS.has(token.basic_form);

const clauseBoundaries = (text: string): readonly [number, number][] => {
  const ranges: [number, number][] = [];
  let start = 0;
  for (const match of text.matchAll(/[、。；;]/g)) {
    const end = (match.index ?? 0) + match[0].length;
    ranges.push([start, end]);
    start = end;
  }
  if (start < text.length) {
    ranges.push([start, text.length]);
  }
  return ranges;
};

export const explicitActionClauseOffsets = (text: string): readonly number[] => {
  if (isQuotedExample(text) || isExplanatoryProse(text)) {
    return [];
  }
  return clauseBoundaries(text).flatMap(([start, end]) => {
    const clause = text.slice(start, end).replace(/[、。；;\s]+$/g, "");
    return /(?:する|し|して|してください|せよ|すること)$/.test(clause) ? [start] : [];
  });
};

export const canReachOverloadedThreshold = (text: string): boolean =>
  explicitActionClauseOffsets(text).length >= 4;

const closesAsDirectAction = (
  text: string,
  tokens: readonly Readonly<KuromojiToken>[]
): boolean => {
  const lastVerb = [...tokens].reverse().find(isProceduralVerb);
  return lastVerb !== undefined && (
    lastVerb.conjugated_form === "基本形" ||
    lastVerb.conjugated_form.startsWith("命令") ||
    /(?:してください|すること|せよ)[。.!！]?$/.test(text)
  );
};

export const proceduralActionOffsets = (
  text: string,
  tokens: readonly Readonly<KuromojiToken>[]
): readonly number[] => {
  if (isQuotedExample(text) || isExplanatoryProse(text)) {
    return [];
  }
  if (!closesAsDirectAction(text, tokens)) {
    return [];
  }

  const offsets: number[] = [];
  for (const [start, end] of clauseBoundaries(text)) {
    const clauseTokens = tokens.filter((token) => {
      const offset = token.word_position - 1;
      return start <= offset && offset < end;
    });
    const verbs = clauseTokens.filter(isProceduralVerb);
    if (verbs.length > 0) {
      offsets.push(verbs[verbs.length - 1].word_position - 1);
    }
  }
  return offsets;
};
