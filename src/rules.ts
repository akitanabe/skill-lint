import { createRiskRule } from "./shared/rule-adapter.js";
import {
  analyzeProgrammaticFlowDiscretion,
  analyzeProgrammaticFlowStructure
} from "./tugite/programmatic-flow.js";
import { createProgrammaticFlowRule } from "./tugite/rule-adapter.js";

export const historicalDefenseInstruction = createRiskRule("historical-defense-instruction");
export const nestedNormativeInstruction = createRiskRule("nested-normative-instruction");
export const excessiveConditionalBranches = createRiskRule("excessive-conditional-branches");
export const overloadedInstruction = createRiskRule("overloaded-instruction");
export const programmaticFlowFields = createProgrammaticFlowRule(analyzeProgrammaticFlowStructure);
export const programmaticFlowNoDiscretion = createProgrammaticFlowRule(analyzeProgrammaticFlowDiscretion);
