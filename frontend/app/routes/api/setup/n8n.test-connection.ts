import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { testConnection } from "@/lib/n8n-api";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

interface TestConnectionRequest {
  apiUrl: string;
  apiKey: string;
}

/**
 * POST /api/setup/n8n/test-connection
 *
 * Test connection to n8n instance with provided credentials.
 * Requires authentication.
 */
export const Route = createFileRoute("/api/setup/n8n/test-connection")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "test-n8n-connection" });

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
          const body = (await request.json()) as TestConnectionRequest;

          // Validate required fields
          if (!body.apiUrl || !body.apiUrl.trim()) {
            const response = Response.json(
              { error: "n8n API URL is required" },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          if (!body.apiKey || !body.apiKey.trim()) {
            const response = Response.json(
              { error: "n8n API key is required" },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Normalize URL (remove trailing slash)
          const apiUrl = body.apiUrl.trim().replace(/\/+$/, "");

          log.info("Testing n8n connection", { apiUrl, userId: session.user.id });

          // Test the connection
          const result = await testConnection(apiUrl, body.apiKey.trim());

          if (result.success) {
            log.info("n8n connection test successful", {
              apiUrl,
              version: result.version,
            });

            const response = Response.json({
              success: true,
              version: result.version,
              instanceId: result.instanceId,
            });

            logRequestComplete(ctx, 200, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          } else {
            log.warn("n8n connection test failed", {
              apiUrl,
              error: result.error,
            });

            const response = Response.json({
              success: false,
              error: result.error,
            });

            logRequestComplete(ctx, 200, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }
        } catch (error) {
          log.error("Failed to test n8n connection", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );

          return withCorrelationId(response, ctx.correlationId);
        }
      },
    },
  },
});
