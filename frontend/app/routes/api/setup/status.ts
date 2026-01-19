import { createFileRoute } from "@tanstack/react-router";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";
import { getSetupStatus, getN8nConfig } from "@/lib/settings";

/**
 * GET /api/setup/status
 *
 * Public endpoint to check setup wizard status.
 * Used by frontend to determine whether to show setup wizard.
 */
export const Route = createFileRoute("/api/setup/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "setup-status" });

        logRequestStart(ctx);

        try {
          const status = await getSetupStatus();
          const n8nConfig = await getN8nConfig();

          const response = Response.json({
            wizardCompleted: status.wizardCompleted,
            wizardSkipped: status.wizardSkipped,
            n8nConfigured: status.n8nConfigured,
            workflowsImported: status.workflowsImported,
            workflowsTotal: status.workflowsTotal,
            workflowsPending: status.workflowsPending,
            workflowsFailed: status.workflowsFailed,
            lastHealthCheck: status.lastHealthCheck,
            apiUrl: n8nConfig?.apiUrl || null,
            webhookBaseUrl: n8nConfig?.webhookBaseUrl || null,
          });

          logRequestComplete(ctx, 200, Date.now() - startTime);
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Failed to get setup status", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to get setup status",
              message:
                error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );

          return withCorrelationId(response, ctx.correlationId);
        }
      },
    },
  },
});
