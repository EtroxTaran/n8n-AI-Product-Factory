import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { importWorkflow, importAllWorkflows } from "@/lib/workflow-importer";
import { getN8nConfig } from "@/lib/settings";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

interface ImportWorkflowsRequest {
  filename?: string; // Specific file, or omit for all
  forceUpdate?: boolean;
}

/**
 * POST /api/setup/workflows/import
 *
 * Import one or all workflows to n8n.
 * Requires authentication and n8n to be configured.
 */
export const Route = createFileRoute("/api/setup/workflows/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "import-workflows" });

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

          // Check n8n is configured
          const config = await getN8nConfig();
          if (!config) {
            const response = Response.json(
              { error: "n8n is not configured. Please configure n8n first." },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Parse request body
          const body = (await request.json()) as ImportWorkflowsRequest;
          const forceUpdate = body.forceUpdate || false;

          if (body.filename) {
            // Import single workflow
            log.info("Importing single workflow", {
              filename: body.filename,
              forceUpdate,
            });

            const result = await importWorkflow(body.filename, {
              forceUpdate,
              configOverride: config,
            });

            const response = Response.json({
              success: result.status !== "failed",
              results: [result],
              webhookBaseUrl: config.webhookBaseUrl,
            });

            logRequestComplete(ctx, 200, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          } else {
            // Import all workflows
            log.info("Importing all workflows", { forceUpdate });

            const progress = await importAllWorkflows(undefined, {
              forceUpdate,
              configOverride: config,
            });

            const failedCount = progress.results.filter(
              (r) => r.status === "failed"
            ).length;

            const response = Response.json({
              success: failedCount === 0,
              results: progress.results,
              summary: {
                total: progress.total,
                imported: progress.results.filter((r) => r.status === "imported")
                  .length,
                updated: progress.results.filter((r) => r.status === "updated")
                  .length,
                skipped: progress.results.filter((r) => r.status === "skipped")
                  .length,
                failed: failedCount,
              },
              webhookBaseUrl: config.webhookBaseUrl,
            });

            logRequestComplete(ctx, 200, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }
        } catch (error) {
          log.error("Failed to import workflows", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to import workflows",
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
