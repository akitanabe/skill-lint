import type { TxtNode } from "@textlint/ast-node-types";
import type { TextlintRuleContext } from "@textlint/types";
import { createRuleAdapter, type RuleFinding } from "./shared/rule-adapter.js";

const noFindings = (
  _node: TxtNode,
  _context: Readonly<TextlintRuleContext>
): readonly RuleFinding[] => [];

export const nestedNormativeInstruction = createRuleAdapter(noFindings);
export const excessiveConditionalBranches = createRuleAdapter(noFindings);
export const overloadedInstruction = createRuleAdapter(noFindings);
