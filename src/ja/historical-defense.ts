import type { HistoricalDefenseSignal, InstructionSourceRange } from "../analyzer/types.js";
import {
  DEFENSIVE_ACTION_PATTERNS,
  HISTORICAL_ACTION_FIRST_CAUSAL_RELATIONS,
  HISTORICAL_CAUSAL_CONTINUATIONS,
  HISTORICAL_MARKER_FIRST_CAUSAL_RELATIONS,
  HISTORICAL_MARKER_PATTERNS,
  QUOTED_EXAMPLE_MARKERS
} from "./lexicon.js";

type HistoricalMarkerKind = "previous" | "legacy" | "removed";
type DefensiveActionKind = "prohibit" | "use" | "restore" | "return" | "absence";

type Match<Kind extends string> = {
  readonly kind: Kind;
  readonly range: InstructionSourceRange;
};

const englishMarkerPattern = HISTORICAL_MARKER_PATTERNS.at(-1);

const markerKind = (value: string): HistoricalMarkerKind => {
  if (/^(?:以前|previous)$/iu.test(value.replace(/[はの]$/u, ""))) {
    return "previous";
  }
  if (/^(?:削除|廃止|removed|deleted|abolished)/iu.test(value)) {
    return "removed";
  }
  return "legacy";
};

const actionKind = (value: string): DefensiveActionKind => {
  if (/禁止/u.test(value)) {
    return "prohibit";
  }
  if (/(?:use|使用|使)/iu.test(value)) {
    return "use";
  }
  if (/(?:restore|reintroduce|復活|復元|再導入)/iu.test(value)) {
    return "restore";
  }
  if (/(?:return|戻)/iu.test(value)) {
    return "return";
  }
  return "absence";
};

const hasIdentifierNeighbor = (text: string, start: number, end: number): boolean =>
  /\p{ID_Continue}$/u.test(text.slice(0, start)) ||
  /^\p{ID_Continue}/u.test(text.slice(end));

const matches = <Kind extends string>(
  text: string,
  patterns: readonly RegExp[],
  kindFor: (value: string) => Kind,
  requireIdentifierBoundary: (pattern: RegExp) => boolean = () => false
): readonly Match<Kind>[] => patterns.flatMap((pattern) =>
  [...text.matchAll(new RegExp(pattern.source, pattern.flags))].flatMap((match) => {
    const start = match.index;
    const end = start + match[0].length;
    if (requireIdentifierBoundary(pattern) && hasIdentifierNeighbor(text, start, end)) {
      return [];
    }
    return [{ kind: kindFor(match[0]), range: [start, end] as const }];
  })
);

const isQuotedExample = (text: string): boolean =>
  QUOTED_EXAMPLE_MARKERS.some((marker) => text.includes(marker)) && /[『「]/u.test(text);

const hasCausalRelation = (
  text: string,
  marker: Match<HistoricalMarkerKind>,
  action: Match<DefensiveActionKind>
): boolean => {
  const relationStart = Math.min(marker.range[1], action.range[1]);
  const relationEnd = Math.max(marker.range[0], action.range[0]);
  const between = text.slice(relationStart, relationEnd);
  const relationPatterns = marker.range[0] < action.range[0]
    ? HISTORICAL_MARKER_FIRST_CAUSAL_RELATIONS
    : HISTORICAL_ACTION_FIRST_CAUSAL_RELATIONS;
  return relationPatterns.some((pattern) => pattern.test(between));
};

const hasDirectRelation = (
  text: string,
  marker: Match<HistoricalMarkerKind>,
  action: Match<DefensiveActionKind>
): boolean => {
  if (marker.kind === "previous") {
    return false;
  }

  const markerText = text.slice(marker.range[0], marker.range[1]);
  const englishMarker = /^[a-z]/iu.test(markerText);
  if (action.range[0] < marker.range[0]) {
    const between = text.slice(action.range[1], marker.range[0]);
    return action.kind === "use" && englishMarker && /^\s+(?:(?:the|an?|this|that)\s+)?$/iu.test(between);
  }
  if (englishMarker) {
    return false;
  }

  const between = text.slice(marker.range[1], action.range[0]);
  if (/[、,；;]/u.test(between) || /(?:現在|現行|ではなく|一方|しかし|だが)/u.test(between)) {
    return false;
  }
  const targetParticle = {
    use: /(?:を|は)\s*$/u,
    restore: /(?:を|は)\s*$/u,
    return: /に\s*$/u,
    absence: /(?:が|は)\s*$/u,
    prohibit: /(?:を|は)\s*$/u
  }[action.kind];
  return targetParticle.test(between);
};

export const historicalDefenseSignal = (text: string): HistoricalDefenseSignal => {
  if (isQuotedExample(text)) {
    return {
      historicalMarkerRanges: [],
      defensiveActionRanges: [],
      hasLocalRelation: false,
      hasCausalContinuation: false
    };
  }

  const historicalMarkers = matches(
    text,
    HISTORICAL_MARKER_PATTERNS,
    markerKind,
    (pattern) => pattern === englishMarkerPattern
  );
  const defensiveActions = matches(text, DEFENSIVE_ACTION_PATTERNS, actionKind);
  const hasLocalRelation = historicalMarkers.some((marker) =>
    defensiveActions.some((action) =>
      hasCausalRelation(text, marker, action) || hasDirectRelation(text, marker, action)
    )
  );

  return {
    historicalMarkerRanges: historicalMarkers.map(({ range }) => range),
    defensiveActionRanges: defensiveActions.map(({ range }) => range),
    hasLocalRelation,
    hasCausalContinuation: HISTORICAL_CAUSAL_CONTINUATIONS.some((pattern) => pattern.test(text))
  };
};
