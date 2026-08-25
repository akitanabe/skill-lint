import {
  excessiveConditionalBranches,
  historicalDefenseInstruction,
  nestedNormativeInstruction,
  overloadedInstruction
} from "./rules.js";

const preset = {
  rules: {
    "historical-defense-instruction": historicalDefenseInstruction,
    "nested-normative-instruction": nestedNormativeInstruction,
    "excessive-conditional-branches": excessiveConditionalBranches,
    "overloaded-instruction": overloadedInstruction
  },
  rulesConfig: {
    "historical-defense-instruction": true,
    "nested-normative-instruction": true,
    "excessive-conditional-branches": true,
    "overloaded-instruction": true
  }
};

export default preset;
