export const CONDITION_PATTERNS = [
  /(?:場合|とき|時)は/g,
  /なら(?:ば)?/g
] as const;

export const FALLBACK_MARKERS = ["それでも", "成立しない場合", "できない場合"] as const;
export const EXCEPTION_MARKERS = ["ただし", "一方で", "例外として"] as const;
export const QUOTED_EXAMPLE_MARKERS = ["例として", "例えば", "という文", "という例"] as const;
export const NON_PROCEDURAL_VERBS = new Set(["ある", "いる", "なる", "できる"]);

export const HISTORICAL_MARKER_PATTERNS = [
  /以前(?:は|の)?/gu,
  /旧(?:版|構造|名称|名|式|設定|API)/gu,
  /(?:削除|廃止)(?:した|された|済み(?:の)?)/gu,
  /previous|old|legacy|deprecated|former|removed|deleted|abolished/giu
] as const;

export const DEFENSIVE_ACTION_PATTERNS = [
  /禁止する/gu,
  /(?:使用しない|使用してはいけない|使わない|使ってはいけない)/gu,
  /(?:復活|復元|再導入)させない/gu,
  /戻さない/gu,
  /存在しないことを確認する/gu,
  /(?:do|must|should)\s+not\s+(?:use|restore|reintroduce|return)/giu,
  /verify\b[^.!?。]*(?:is\s+)?(?:absent|not\s+present|does\s+not\s+exist)/giu
] as const;

export const HISTORICAL_MARKER_FIRST_CAUSAL_RELATIONS = [
  /(?:ため|ので|から)/u,
  /\btherefore\b/iu
] as const;

export const HISTORICAL_ACTION_FIRST_CAUSAL_RELATIONS = [
  /\b(?:because|due\s+to)\b/iu
] as const;

export const HISTORICAL_CAUSAL_CONTINUATIONS = [
  /^(?:そのため|このため|したがって|従って)[、,\s]*/u,
  /^(?:therefore|for\s+this\s+reason)[,\s]*/iu
] as const;
