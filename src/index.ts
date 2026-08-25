import {
  excessiveConditionalBranches,
  historicalDefenseInstruction,
  nestedNormativeInstruction,
  overloadedInstruction,
  programmaticFlowFields,
  programmaticFlowNoDiscretion
} from "./rules.js";

const preset = {
  rules: {
    "historical-defense-instruction": historicalDefenseInstruction,
    "nested-normative-instruction": nestedNormativeInstruction,
    "excessive-conditional-branches": excessiveConditionalBranches,
    "overloaded-instruction": overloadedInstruction,
    "programmatic-flow-fields": programmaticFlowFields,
    "programmatic-flow-no-discretion": programmaticFlowNoDiscretion
  },
  rulesConfig: {
    "historical-defense-instruction": true,
    "nested-normative-instruction": true,
    "excessive-conditional-branches": true,
    "overloaded-instruction": true,
    "programmatic-flow-fields": false,
    "programmatic-flow-no-discretion": false
  }
};

export default preset;
