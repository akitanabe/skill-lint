import type { TxtDocumentNode } from "@textlint/ast-node-types";
import type {
  TextlintRuleContext,
  TextlintRuleOptions,
  TextlintRuleReportHandler,
  TextlintRuleReporter
} from "@textlint/types";
import type { ProgrammaticFlowFinding } from "./programmatic-flow.js";

type ProgrammaticFlowAnalyzer = (
  document: TxtDocumentNode,
  source: string
) => readonly ProgrammaticFlowFinding[];

export const createProgrammaticFlowRule = (
  analyze: ProgrammaticFlowAnalyzer
): TextlintRuleReporter => (
  context: Readonly<TextlintRuleContext>,
  _options?: TextlintRuleOptions
): TextlintRuleReportHandler => ({
  [context.Syntax.Document]: (node: TxtDocumentNode) => {
    for (const finding of analyze(node, context.getSource(node))) {
      context.report(
        node,
        new context.RuleError(finding.message, {
          padding: context.locator.range(finding.range)
        })
      );
    }
  }
});
