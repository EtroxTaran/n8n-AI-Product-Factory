import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { getN8nConfig } from "@/lib/settings";
import {
  validatePreImport,
  type PreImportValidationResult,
} from "@/lib/workflow-importer";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

/**
 * GET /api/workflows/validate
 *
 * Run pre-import validation on bundled workflows.
 *
 * This endpoint validates:
 * 1. Node compatibility - checks if all node types exist in n8n instance
 * 2. Circular dependencies - detects any cycles in workflow dependencies
 *
 * Returns:
 * - valid: boolean - overall validation result
 * - nodeValidation: Node compatibility details
 * - dependencyValidation: Circular dependency check results
 * - errors: Array of error messages
 * - warnings: Array of warning messages
 *
 * Use this before importing to catch issues early.
 */
export const Route = createFileRoute("/api/workflows/validate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "validate-workflows" });

        logRequestStart(ctx);

        try {
          // Check authentication
          const session = await getServerSession(request.headers);
          if (!session?.user) {
            const response = Response.json(
              { error: "Authentication required" },
              { status: 401 }
            );
            logRequestComplete(ctx, 401, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Check n8n is configured (needed for node validation)
          const config = await getN8nConfig();
          if (!config) {
            const response = Response.json(
              { error: "n8n is not configured. Please configure n8n first." },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          log.info("Running pre-import validation");

          // Run validation
          const result: PreImportValidationResult = await validatePreImport(
            undefined, // Use default workflows dir
            config
          );

          log.info("Pre-import validation complete", {
            valid: result.valid,
            errors: result.errors.length,
            warnings: result.warnings.length,
            missingNodes: result.nodeValidation.missingNodes.length,
            hasCycles: result.dependencyValidation.hasCycle,
          });

          const response = Response.json({
            ...result,
            // Add summary for easy consumption
            summary: {
              totalNodes: result.nodeValidation.totalNodes,
              missingNodeTypes: result.nodeValidation.missingNodes.length,
              hasCycles: result.dependencyValidation.hasCycle,
              cycleCount: result.dependencyValidation.cycles.length,
              importOrder: result.dependencyValidation.dependencyOrder,
            },
          });

          logRequestComplete(ctx, 200, Date.now() - startTime);
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Failed to validate workflows", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to validate workflows",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );

          return withCorrelationId(response, ctx.correlationId);
        }
      },
    },
  },
});
