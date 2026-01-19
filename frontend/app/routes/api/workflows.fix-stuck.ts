import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { resetStuckImports } from "@/lib/workflow-importer";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

/**
 * POST /api/workflows/fix-stuck
 *
 * Reset workflows stuck in "importing" or "updating" state.
 *
 * This endpoint handles the case where a container restart or timeout
 * left workflows in an intermediate state. It resets them to "pending"
 * so they can be re-imported.
 *
 * This is a safe operation - it only changes workflow registry state,
 * not the actual workflows in n8n.
 */
export const Route = createFileRoute("/api/workflows/fix-stuck")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "fix-stuck-imports" });

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

          log.info("Fixing stuck workflow imports");

          // Reset stuck imports
          const resetCount = await resetStuckImports();

          log.info("Fixed stuck imports", { resetCount });

          const response = Response.json({
            success: true,
            resetCount,
            message:
              resetCount > 0
                ? `Reset ${resetCount} stuck workflow(s) to pending state`
                : "No stuck workflows found",
          });

          logRequestComplete(ctx, 200, Date.now() - startTime);
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Failed to fix stuck imports", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to fix stuck imports",
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
