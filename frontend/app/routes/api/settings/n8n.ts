import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import {
  getN8nConfig,
  clearN8nConfig,
  getSettingForDisplay,
} from "@/lib/settings";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

/**
 * /api/settings/n8n
 *
 * GET - Retrieve n8n configuration (masked)
 * DELETE - Clear n8n configuration
 */
export const Route = createFileRoute("/api/settings/n8n")({
  server: {
    handlers: {
      /**
       * GET /api/settings/n8n
       * Get current n8n configuration with masked API key.
       */
      GET: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "get-n8n-settings" });

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

          // Get configuration
          const config = await getN8nConfig();

          if (!config) {
            const response = Response.json({
              configured: false,
              apiUrl: null,
              webhookBaseUrl: null,
              apiKeyMasked: null,
            });
            logRequestComplete(ctx, 200, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Get masked API key for display
          const apiKeySetting = await getSettingForDisplay("n8n.api_key");

          log.info("Retrieved n8n settings", { userId: session.user.id });

          const response = Response.json({
            configured: true,
            apiUrl: config.apiUrl,
            webhookBaseUrl: config.webhookBaseUrl,
            apiKeyMasked: apiKeySetting?.displayValue || "********",
          });

          logRequestComplete(ctx, 200, Date.now() - startTime);
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Failed to get n8n settings", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to get settings",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );

          return withCorrelationId(response, ctx.correlationId);
        }
      },

      /**
       * DELETE /api/settings/n8n
       * Clear all n8n configuration.
       */
      DELETE: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "delete-n8n-settings" });

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

          // Clear configuration
          await clearN8nConfig();

          log.info("n8n configuration cleared", { userId: session.user.id });

          const response = Response.json({
            success: true,
            message: "n8n configuration cleared",
          });

          logRequestComplete(ctx, 200, Date.now() - startTime);
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Failed to clear n8n settings", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to clear settings",
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
