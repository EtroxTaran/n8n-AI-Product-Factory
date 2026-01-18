import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { getN8nConfig } from "@/lib/settings";
import {
  syncWorkflowRegistry,
  type SyncProgress,
} from "@/lib/workflow-importer";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

/**
 * POST /api/workflows/sync
 *
 * Sync workflow registry with actual n8n instance state.
 *
 * This endpoint checks which workflows are actually deployed and active
 * in the n8n instance and updates the dashboard registry to reflect
 * the true state.
 *
 * Use cases:
 * - User manually deleted a workflow from n8n UI
 * - User manually activated/deactivated a workflow in n8n UI
 * - Dashboard shows stale state after n8n changes
 *
 * Returns:
 * - SyncProgress with details of what changed
 */
export const Route = createFileRoute("/api/workflows/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "sync-workflows" });

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
              { error: "n8n is not configured" },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          log.info("Starting workflow registry sync");

          // Perform sync
          const syncResult: SyncProgress = await syncWorkflowRegistry({
            configOverride: config,
          });

          log.info("Workflow sync completed", {
            total: syncResult.total,
            synced: syncResult.synced,
            deleted: syncResult.deleted,
            stateChanged: syncResult.stateChanged,
            errors: syncResult.errors,
          });

          const response = Response.json({
            success: syncResult.errors === 0,
            ...syncResult,
          });

          logRequestComplete(ctx, 200, Date.now() - startTime);
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Failed to sync workflows", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to sync workflows",
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
