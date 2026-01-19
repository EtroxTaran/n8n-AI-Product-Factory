import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { getN8nConfig } from "@/lib/settings";
import {
  performFullReset,
  type ResetResult,
} from "@/lib/workflow-importer";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

/**
 * Request body for the reset endpoint.
 */
interface ResetRequest {
  /**
   * Reset mode:
   * - soft: Clear registry and settings only (workflows remain in n8n)
   * - full: Delete workflows from n8n, then clear registry and settings
   */
  mode: "soft" | "full";

  /**
   * Confirmation string - must be "RESET" to proceed.
   * This is a safety measure to prevent accidental resets.
   */
  confirmation: string;

  /**
   * Keep n8n API URL/key after reset (default: false for full, true for soft).
   * Useful if you want to re-import to the same n8n instance.
   */
  preserveN8nConfig?: boolean;
}

/**
 * Response body for the reset endpoint.
 */
interface ResetResponse {
  success: boolean;
  mode: "soft" | "full";
  deletedFromN8n: number;
  clearedFromRegistry: number;
  settingsReset: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * POST /api/setup/reset
 *
 * Reset the workflow setup, optionally deleting all workflows from n8n.
 *
 * This is a destructive operation that requires a confirmation string.
 *
 * Modes:
 * - soft: Clears the workflow registry and setup wizard state, but leaves
 *         workflows in the n8n instance. Use this to re-import workflows
 *         from scratch without deleting them from n8n.
 *
 * - full: Deactivates and deletes all Product Factory workflows from n8n,
 *         then clears the registry and setup wizard state. Use this to
 *         completely remove all traces of the Product Factory from n8n.
 *
 * After a reset, the user will need to go through the setup wizard again.
 */
export const Route = createFileRoute("/api/setup/reset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "reset-setup" });

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
          let body: ResetRequest;
          try {
            body = (await request.json()) as ResetRequest;
          } catch {
            const response = Response.json(
              { error: "Invalid JSON in request body" },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Validate required fields
          if (!body.mode || !["soft", "full"].includes(body.mode)) {
            const response = Response.json(
              { error: "Invalid mode. Must be 'soft' or 'full'" },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Validate confirmation string
          if (body.confirmation !== "RESET") {
            const response = Response.json(
              { error: "Confirmation string must be 'RESET'" },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          log.info("Starting setup reset", {
            mode: body.mode,
            preserveN8nConfig: body.preserveN8nConfig,
            userId: session.user.id,
          });

          // Get n8n config for full reset
          let config;
          if (body.mode === "full") {
            config = await getN8nConfig();
            if (!config) {
              log.warn("n8n not configured, full reset will skip n8n deletion");
            }
          }

          // Perform the reset
          const result: ResetResult = await performFullReset({
            mode: body.mode,
            preserveN8nConfig: body.preserveN8nConfig,
            configOverride: config ?? undefined,
          });

          log.info("Setup reset complete", {
            mode: result.mode,
            success: result.success,
            deletedFromN8n: result.deletedFromN8n,
            clearedFromRegistry: result.clearedFromRegistry,
            settingsReset: result.settingsReset,
            errors: result.errors.length,
            warnings: result.warnings.length,
          });

          const responseBody: ResetResponse = {
            success: result.success,
            mode: result.mode,
            deletedFromN8n: result.deletedFromN8n,
            clearedFromRegistry: result.clearedFromRegistry,
            settingsReset: result.settingsReset,
            errors: result.errors,
            warnings: result.warnings,
          };

          const response = Response.json(responseBody, {
            status: result.success ? 200 : 500,
          });

          logRequestComplete(
            ctx,
            result.success ? 200 : 500,
            Date.now() - startTime
          );
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Failed to reset setup", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to reset setup",
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
