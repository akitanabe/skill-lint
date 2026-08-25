import { createRiskRule } from "./shared/rule-adapter.js";

export const historicalDefenseInstruction = createRiskRule("historical-defense-instruction");
export const nestedNormativeInstruction = createRiskRule("nested-normative-instruction");
export const excessiveConditionalBranches = createRiskRule("excessive-conditional-branches");
export const overloadedInstruction = createRiskRule("overloaded-instruction");
