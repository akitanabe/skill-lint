import { basename } from "node:path";
import type { TxtDocumentNode } from "@textlint/ast-node-types";
import type {
  TextlintRuleContext,
  TextlintRuleOptions,
  TextlintRuleReportHandler,
  TextlintRuleReporter
} from "@textlint/types";
import { runRiskAnalysis } from "../analyzer/classify-risk.js";
import type { RiskRuleId } from "../analyzer/types.js";

const isSkillFile = (filePath: string | undefined): boolean =>
  filePath !== undefined && basename(filePath) === "SKILL.md";

export const createRiskRule = (ruleId: RiskRuleId): TextlintRuleReporter => {
  return (
    context: Readonly<TextlintRuleContext>,
    _options?: TextlintRuleOptions
  ): TextlintRuleReportHandler => {
    if (!isSkillFile(context.getFilePath())) {
      return {};
    }

    return {
      [context.Syntax.Document]: async (node: TxtDocumentNode) => {
        const findings = await runRiskAnalysis(node);
        for (const finding of findings) {
          if (finding.ruleId === ruleId) {
            context.report(
              node,
              new context.RuleError(finding.message, {
                padding: context.locator.range(finding.range)
              })
            );
          }
        }
      }
    };
  };
};
