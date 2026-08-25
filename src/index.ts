import {
  excessiveConditionalBranches,
  nestedNormativeInstruction,
  overloadedInstruction
} from "./rules.js";

const preset = {
  rules: {
    "nested-normative-instruction": nestedNormativeInstruction,
    "excessive-conditional-branches": excessiveConditionalBranches,
    "overloaded-instruction": overloadedInstruction
  },
  rulesConfig: {
    "nested-normative-instruction": true,
    "excessive-conditional-branches": true,
    "overloaded-instruction": true
  }
};

export default preset;
