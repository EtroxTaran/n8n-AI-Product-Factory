import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { getN8nConfig } from "@/lib/settings";
import {
  enhancedSyncWorkflowRegistry,
  type EnhancedSyncProgress,
} from "@/lib/workflow-importer";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

/**
 * Request body for the sync endpoint.
 */
interface SyncRequest {
  /**
   * Sync mode:
   * - detect (default): Read-only, report orphans and conflicts
   * - pull: Add orphaned workflows that match bundled names to registry
   * - reconcile: Pull + update registry to match n8n state
   */
  mode?: "detect" | "pull" | "reconcile";

  /**
   * Whether to detect orphaned workflows in n8n (default: true).
   * Orphans are workflows in n8n that are not tracked in the registry.
   */
  includeOrphans?: boolean;
}

/**
 * POST /api/workflows/sync
 *
 * Sync workflow registry with actual n8n instance state.
 *
 * This endpoint checks which workflows are actually deployed and active
 * in the n8n instance and updates the dashboard registry to reflect
 * the true state.
 *
 * Modes:
 * - detect (default): Read-only sync that reports:
 *   - State changes (active/inactive)
 *   - Deleted workflows (exist in registry but not in n8n)
 *   - Orphaned workflows (exist in n8n but not in registry)
 *   - Conflicts (content mismatches, name conflicts)
 *
 * - pull: Same as detect, but also adds orphaned workflows that match
 *   bundled workflow names to the registry.
 *
 * - reconcile: Same as pull, but also updates registry entries for
 *   deleted workflows (marks them as pending for re-import).
 *
 * Use cases:
 * - User manually deleted a workflow from n8n UI
 * - User manually activated/deactivated a workflow in n8n UI
 * - Dashboard shows stale state after n8n changes
 * - Workflows exist in n8n from previous installation
 *
 * Returns:
 * - EnhancedSyncProgress with details of what changed, orphans, and conflicts
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

          // Parse request body (optional - defaults to detect mode)
          let body: SyncRequest = {};
          try {
            const text = await request.text();
            if (text) {
              body = JSON.parse(text) as SyncRequest;
            }
          } catch {
            // Empty body or invalid JSON - use defaults
          }

          const mode = body.mode || "detect";
          const includeOrphans = body.includeOrphans !== false; // Default true

          log.info("Starting workflow registry sync", { mode, includeOrphans });

          // Perform enhanced sync
          const syncResult: EnhancedSyncProgress =
            await enhancedSyncWorkflowRegistry({
              mode,
              includeOrphans,
              configOverride: config,
            });

          log.info("Workflow sync completed", {
            mode: syncResult.mode,
            total: syncResult.total,
            synced: syncResult.synced,
            deleted: syncResult.deleted,
            stateChanged: syncResult.stateChanged,
            orphans: syncResult.orphans.length,
            conflicts: syncResult.conflicts.length,
            pulled: syncResult.pulled,
            errors: syncResult.errors,
          });

          const response = Response.json({
            success: syncResult.errors === 0,
            mode: syncResult.mode,
            total: syncResult.total,
            synced: syncResult.synced,
            deleted: syncResult.deleted,
            stateChanged: syncResult.stateChanged,
            orphans: syncResult.orphans,
            conflicts: syncResult.conflicts,
            pulled: syncResult.pulled,
            errors: syncResult.errors,
            results: syncResult.results,
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
