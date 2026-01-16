import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { completeSetup, skipSetup, isN8nConfigured } from "@/lib/settings";
import { getWorkflowStatus } from "@/lib/workflow-importer";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

interface CompleteSetupRequest {
  skip?: boolean; // If true, marks wizard as skipped instead of completed
}

/**
 * POST /api/setup/complete
 *
 * Mark setup wizard as complete (or skipped).
 * Requires authentication.
 */
export const Route = createFileRoute("/api/setup/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "complete-setup" });

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

          // Parse request body
          let body: CompleteSetupRequest = {};
          try {
            body = (await request.json()) as CompleteSetupRequest;
          } catch {
            // Empty body is OK
          }

          if (body.skip) {
            // Mark as skipped
            await skipSetup(session.user.id);

            log.info("Setup wizard skipped", { userId: session.user.id });

            const response = Response.json({
              success: true,
              message: "Setup wizard skipped",
              redirectTo: "/projects",
            });

            logRequestComplete(ctx, 200, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Validate that setup is actually complete
          const n8nConfigured = await isN8nConfigured();
          if (!n8nConfigured) {
            const response = Response.json(
              {
                error: "Cannot complete setup: n8n is not configured",
                hint: "Please configure n8n connection first",
              },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Check workflow import status
          const workflows = await getWorkflowStatus();
          const importedCount = workflows.filter(
            (w) => w.importStatus === "imported"
          ).length;

          if (importedCount === 0) {
            const response = Response.json(
              {
                error: "Cannot complete setup: no workflows imported",
                hint: "Please import at least one workflow",
              },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Mark setup as complete
          await completeSetup(session.user.id);

          log.info("Setup wizard completed", {
            userId: session.user.id,
            workflowsImported: importedCount,
          });

          const response = Response.json({
            success: true,
            message: "Setup wizard completed successfully",
            redirectTo: "/projects",
            summary: {
              n8nConfigured: true,
              workflowsImported: importedCount,
              workflowsTotal: workflows.length,
            },
          });

          logRequestComplete(ctx, 200, Date.now() - startTime);
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Failed to complete setup", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to complete setup",
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
