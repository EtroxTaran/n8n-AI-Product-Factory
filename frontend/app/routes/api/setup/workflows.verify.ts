import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { getWorkflowStatus } from "@/lib/workflow-importer";
import { comprehensiveHealthCheck, getWorkflowWebhooks } from "@/lib/n8n-api";
import { getN8nConfig, updateHealthCheck } from "@/lib/settings";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

interface WorkflowVerificationResult {
  workflowName: string;
  filename: string;
  n8nWorkflowId: string | null;
  active: boolean;
  webhooksReachable: boolean;
  webhookUrls: string[];
  error?: string;
}

/**
 * POST /api/setup/workflows/verify
 *
 * Verify that imported workflows are working correctly.
 * Tests n8n connectivity and webhook accessibility.
 * Requires authentication.
 */
export const Route = createFileRoute("/api/setup/workflows/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "verify-workflows" });

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

          // Get n8n configuration
          const config = await getN8nConfig();
          if (!config) {
            const response = Response.json(
              { error: "n8n is not configured" },
              { status: 400 }
            );
            logRequestComplete(ctx, 400, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          log.info("Starting workflow verification");

          // Run comprehensive health check
          const healthCheck = await comprehensiveHealthCheck(config);

          // Update health check status in database
          await updateHealthCheck(healthCheck.healthy);

          // Get workflow status from registry
          const workflows = await getWorkflowStatus();
          const results: WorkflowVerificationResult[] = [];

          // Verify each imported workflow
          for (const workflow of workflows) {
            if (workflow.importStatus !== "imported" || !workflow.n8nWorkflowId) {
              results.push({
                workflowName: workflow.name,
                filename: workflow.filename,
                n8nWorkflowId: workflow.n8nWorkflowId,
                active: false,
                webhooksReachable: false,
                webhookUrls: [],
                error: workflow.importStatus === "failed"
                  ? workflow.lastError || "Import failed"
                  : "Not imported",
              });
              continue;
            }

            try {
              // Get webhook URLs from n8n
              const webhookUrls = await getWorkflowWebhooks(
                workflow.n8nWorkflowId,
                config
              );

              // Test webhook reachability (HEAD request to see if endpoint responds)
              let webhooksReachable = true;
              for (const url of webhookUrls) {
                try {
                  // Use HEAD to check if endpoint exists without triggering workflow
                  const testResponse = await fetch(url, {
                    method: "HEAD",
                    signal: AbortSignal.timeout(5000),
                  });
                  // Any response (including 4xx) means the endpoint is reachable
                  // 404 would mean workflow not active, but endpoint exists
                  webhooksReachable = webhooksReachable && testResponse.status !== 404;
                } catch {
                  // Network error means not reachable
                  webhooksReachable = false;
                }
              }

              results.push({
                workflowName: workflow.name,
                filename: workflow.filename,
                n8nWorkflowId: workflow.n8nWorkflowId,
                active: workflow.isActive,
                webhooksReachable: webhookUrls.length === 0 || webhooksReachable,
                webhookUrls,
              });
            } catch (error) {
              results.push({
                workflowName: workflow.name,
                filename: workflow.filename,
                n8nWorkflowId: workflow.n8nWorkflowId,
                active: workflow.isActive,
                webhooksReachable: false,
                webhookUrls: workflow.webhookPaths.map(
                  (p) => `${config.webhookBaseUrl}${p}`
                ),
                error: error instanceof Error ? error.message : "Verification failed",
              });
            }
          }

          const allHealthy =
            healthCheck.healthy &&
            results.every(
              (r) =>
                !r.error &&
                r.active &&
                (r.webhookUrls.length === 0 || r.webhooksReachable)
            );

          log.info("Workflow verification complete", {
            healthy: allHealthy,
            results: results.length,
            errors: results.filter((r) => r.error).length,
          });

          const response = Response.json({
            success: allHealthy,
            n8nHealth: {
              healthy: healthCheck.healthy,
              healthEndpoint: healthCheck.healthEndpoint,
              apiAccess: healthCheck.apiAccess,
              workflowCount: healthCheck.workflowCount,
              activeWorkflows: healthCheck.activeWorkflows,
            },
            results,
          });

          logRequestComplete(ctx, 200, Date.now() - startTime);
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Workflow verification failed", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Verification failed",
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
