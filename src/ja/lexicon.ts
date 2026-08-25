export const CONDITION_PATTERNS = [
  /(?:場合|とき|時)は/g,
  /なら(?:ば)?/g
] as const;

export const FALLBACK_MARKERS = ["それでも", "成立しない場合", "できない場合"] as const;
export const EXCEPTION_MARKERS = ["ただし", "一方で", "例外として"] as const;
export const QUOTED_EXAMPLE_MARKERS = ["例として", "例えば", "という文", "という例"] as const;
export const NON_PROCEDURAL_VERBS = new Set(["ある", "いる", "なる", "できる"]);
