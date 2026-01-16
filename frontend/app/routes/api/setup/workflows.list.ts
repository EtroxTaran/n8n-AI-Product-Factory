import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { getWorkflowStatus } from "@/lib/workflow-importer";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

/**
 * GET /api/setup/workflows/list
 *
 * List bundled workflows and their import status.
 * Requires authentication.
 */
export const Route = createFileRoute("/api/setup/workflows/list")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "list-workflows" });

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

          // Get workflow status
          const workflows = await getWorkflowStatus();

          log.info("Workflow list retrieved", {
            count: workflows.length,
            imported: workflows.filter((w) => w.importStatus === "imported").length,
          });

          const response = Response.json({
            workflows: workflows.map((w) => ({
              filename: w.filename,
              name: w.name,
              localVersion: w.localVersion,
              n8nWorkflowId: w.n8nWorkflowId,
              isActive: w.isActive,
              importStatus: w.importStatus,
              webhookPaths: w.webhookPaths,
              hasCredentials: w.hasCredentials,
              lastImportAt: w.lastImportAt?.toISOString() || null,
              lastError: w.lastError,
            })),
          });

          logRequestComplete(ctx, 200, Date.now() - startTime);
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Failed to list workflows", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to list workflows",
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
