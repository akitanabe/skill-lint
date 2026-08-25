import { basename } from "node:path";
import type { TxtNode } from "@textlint/ast-node-types";
import type {
  TextlintRuleContext,
  TextlintRuleOptions,
  TextlintRuleReportHandler,
  TextlintRuleReporter
} from "@textlint/types";

export type RuleFinding = {
  message: string;
  range?: readonly [number, number];
};

export type RuleClassifier = (
  node: TxtNode,
  context: Readonly<TextlintRuleContext>
) => readonly RuleFinding[];

const isSkillFile = (filePath: string | undefined): boolean =>
  filePath !== undefined && basename(filePath) === "SKILL.md";

export const createRuleAdapter = (classify: RuleClassifier): TextlintRuleReporter => {
  return (
    context: Readonly<TextlintRuleContext>,
    _options?: TextlintRuleOptions
  ): TextlintRuleReportHandler => {
    if (!isSkillFile(context.getFilePath())) {
      return {};
    }

    return {
      [context.Syntax.Str]: async (node: TxtNode) => {
        for (const finding of classify(node, context)) {
          const details = finding.range === undefined
            ? undefined
            : { padding: context.locator.range(finding.range) };
          context.report(node, new context.RuleError(finding.message, details));
        }
      }
    };
  };
};
