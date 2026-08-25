import { describe, expect, it } from "vitest";
import { historicalDefenseSignal } from "../../src/ja/historical-defense.js";

describe("historical defense signal", () => {
  it.each([
    "以前は X だったため、Y を禁止する。",
    "旧版の X を使用してはいけない。",
    "削除した X を復活させない。",
    "旧構造 X に戻さない。",
    "廃止した X が存在しないことを確認する。",
    "Do not use the old API.",
    "Do not use this setting because old versions accepted it."
  ])("recognizes an explicit local relation: %s", (source) => {
    const signal = historicalDefenseSignal(source);

    expect(signal.historicalMarkerRanges.length).toBeGreaterThan(0);
    expect(signal.defensiveActionRanges.length).toBeGreaterThan(0);
    expect(signal.hasLocalRelation).toBe(true);
  });

  it.each(["old", "OLD", "legacy", "deprecated", "former", "deleted"])(
    "matches an independent English historical marker: %s",
    (marker) => {
      const source = `Do not use the ${marker} API.`;

      expect(historicalDefenseSignal(source).hasLocalRelation).toBe(true);
    }
  );

  it.each(["folder", "αoldβ", "old_value", "old2", "old\u0301"])(
    "does not treat an identifier substring as an old marker: %s",
    (target) => {
      const source = `Do not use the ${target} API.`;
      const signal = historicalDefenseSignal(source);

      expect(signal.historicalMarkerRanges).toEqual([]);
      expect(signal.hasLocalRelation).toBe(false);
    }
  );

  it("keeps marker-only and action-only evidence separate", () => {
    const markerOnly = historicalDefenseSignal("旧版の X を説明する。");
    expect(markerOnly.historicalMarkerRanges.length).toBeGreaterThan(0);
    expect(markerOnly.defensiveActionRanges).toEqual([]);
    expect(markerOnly.hasLocalRelation).toBe(false);

    const actionOnly = historicalDefenseSignal("X の使用を禁止する。");
    expect(actionOnly.historicalMarkerRanges).toEqual([]);
    expect(actionOnly.defensiveActionRanges.length).toBeGreaterThan(0);
    expect(actionOnly.hasLocalRelation).toBe(false);
  });

  it.each([
    "旧版の X を説明し、現在の Y を使用してはいけない。",
    "旧版の X ではなく、現行の Y を使用しない。",
    "Do not use this setting, and old versions are documented separately.",
    "現在の X を禁止するため、旧版の Y を参照する。"
  ])("does not infer a relation from same-sentence co-occurrence: %s", (source) => {
    const signal = historicalDefenseSignal(source);

    expect(signal.historicalMarkerRanges.length).toBeGreaterThan(0);
    expect(signal.defensiveActionRanges.length).toBeGreaterThan(0);
    expect(signal.hasLocalRelation).toBe(false);
  });

  it("marks only an explicit causal continuation for adjacent-sentence classification", () => {
    expect(historicalDefenseSignal("そのため、Y を禁止する。").hasCausalContinuation).toBe(true);
    expect(historicalDefenseSignal("Y を禁止する。").hasCausalContinuation).toBe(false);
  });
});
