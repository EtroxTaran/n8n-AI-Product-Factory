import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { getN8nConfig } from "@/lib/settings";
import {
  getBundledWorkflows,
  importWorkflow,
  validatePreImport,
  type BundledWorkflow,
  type ImportResult,
} from "@/lib/workflow-importer";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

/**
 * SSE event types for import progress
 */
type ImportEventType =
  | "start"
  | "validation"
  | "workflow_start"
  | "workflow_complete"
  | "phase_change"
  | "complete"
  | "error";

interface ImportEvent {
  type: ImportEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Format SSE event
 */
function formatSSE(event: ImportEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * POST /api/workflows/import-stream
 *
 * Stream workflow import progress via Server-Sent Events (SSE).
 *
 * This endpoint provides real-time progress updates during workflow import:
 * - start: Import process begins
 * - validation: Pre-import validation results
 * - phase_change: Moving between Phase 1 (create) and Phase 2 (activate)
 * - workflow_start: Individual workflow import starts
 * - workflow_complete: Individual workflow import completes
 * - complete: All workflows imported
 * - error: An error occurred
 *
 * Request body:
 * - forceUpdate?: boolean - Force update even if unchanged
 * - validateFirst?: boolean - Run validation before import (default: true)
 *
 * Client usage:
 * ```javascript
 * const eventSource = new EventSource('/api/workflows/import-stream');
 * eventSource.addEventListener('workflow_complete', (e) => {
 *   const data = JSON.parse(e.data);
 *   console.log(`Imported: ${data.data.name}`);
 * });
 * ```
 */
export const Route = createFileRoute("/api/workflows/import-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "import-workflows-stream" });

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

          // Parse request body
          let body: { forceUpdate?: boolean; validateFirst?: boolean } = {};
          try {
            body = await request.json();
          } catch {
            // Empty body is fine, use defaults
          }
          const forceUpdate = body.forceUpdate || false;
          const validateFirst = body.validateFirst !== false; // Default true

          log.info("Starting streaming import", { forceUpdate, validateFirst });

          // Create a TransformStream for SSE
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          const encoder = new TextEncoder();

          // Helper to send SSE events
          const sendEvent = async (event: ImportEvent) => {
            await writer.write(encoder.encode(formatSSE(event)));
          };

          // Start the import process in the background
          (async () => {
            try {
              const now = () => new Date().toISOString();

              // Send start event
              await sendEvent({
                type: "start",
                timestamp: now(),
                data: { forceUpdate, validateFirst },
              });

              // Get bundled workflows
              const workflows = await getBundledWorkflows();

              // Run validation if requested
              if (validateFirst) {
                await sendEvent({
                  type: "phase_change",
                  timestamp: now(),
                  data: { phase: "validation", message: "Running pre-import validation" },
                });

                const validation = await validatePreImport(undefined, config);

                await sendEvent({
                  type: "validation",
                  timestamp: now(),
                  data: {
                    valid: validation.valid,
                    errors: validation.errors,
                    warnings: validation.warnings,
                    missingNodes: validation.nodeValidation.missingNodes,
                    hasCycles: validation.dependencyValidation.hasCycle,
                    cycles: validation.dependencyValidation.cycles,
                  },
                });

                // Stop if validation has critical errors (cycles)
                if (validation.dependencyValidation.hasCycle) {
                  await sendEvent({
                    type: "error",
                    timestamp: now(),
                    data: {
                      message: "Circular dependencies detected, cannot proceed",
                      cycles: validation.dependencyValidation.cycles,
                    },
                  });
                  await writer.close();
                  return;
                }
              }

              // Phase 1: Create all workflows (inactive)
              await sendEvent({
                type: "phase_change",
                timestamp: now(),
                data: { phase: 1, message: "Creating workflows (inactive)" },
              });

              const results: ImportResult[] = [];
              const createdWorkflows: BundledWorkflow[] = [];

              for (let i = 0; i < workflows.length; i++) {
                const workflow = workflows[i];

                await sendEvent({
                  type: "workflow_start",
                  timestamp: now(),
                  data: {
                    index: i,
                    total: workflows.length,
                    name: workflow.name,
                    filename: workflow.filename,
                    phase: 1,
                  },
                });

                try {
                  // Import but don't activate yet
                  const result = await importWorkflow(workflow.filename, {
                    forceUpdate,
                    configOverride: config,
                    skipActivation: true, // Phase 1: create only
                  });

                  results.push(result);

                  if (result.status === "imported" || result.status === "updated") {
                    createdWorkflows.push(workflow);
                  }

                  await sendEvent({
                    type: "workflow_complete",
                    timestamp: now(),
                    data: {
                      index: i,
                      total: workflows.length,
                      name: workflow.name,
                      filename: workflow.filename,
                      status: result.status,
                      n8nWorkflowId: result.n8nWorkflowId,
                      error: result.error,
                      phase: 1,
                    },
                  });
                } catch (error) {
                  const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";

                  results.push({
                    filename: workflow.filename,
                    name: workflow.name,
                    status: "failed",
                    error: errorMessage,
                  });

                  await sendEvent({
                    type: "workflow_complete",
                    timestamp: now(),
                    data: {
                      index: i,
                      total: workflows.length,
                      name: workflow.name,
                      filename: workflow.filename,
                      status: "failed",
                      error: errorMessage,
                      phase: 1,
                    },
                  });
                }
              }

              // Check for Phase 1 failures
              const phase1Failures = results.filter((r) => r.status === "failed");
              if (phase1Failures.length > 0) {
                await sendEvent({
                  type: "error",
                  timestamp: now(),
                  data: {
                    message: `Phase 1 failed: ${phase1Failures.length} workflow(s) could not be created`,
                    failures: phase1Failures.map((f) => ({
                      name: f.name,
                      error: f.error,
                    })),
                  },
                });
                await writer.close();
                return;
              }

              // Phase 2: Activate all workflows
              await sendEvent({
                type: "phase_change",
                timestamp: now(),
                data: { phase: 2, message: "Activating workflows" },
              });

              const activationResults: Array<{
                name: string;
                success: boolean;
                error?: string;
              }> = [];

              for (let i = 0; i < createdWorkflows.length; i++) {
                const workflow = createdWorkflows[i];

                await sendEvent({
                  type: "workflow_start",
                  timestamp: now(),
                  data: {
                    index: i,
                    total: createdWorkflows.length,
                    name: workflow.name,
                    filename: workflow.filename,
                    phase: 2,
                  },
                });

                try {
                  // Find the result to get n8n ID
                  const importResult = results.find(
                    (r) => r.filename === workflow.filename
                  );

                  if (importResult?.n8nWorkflowId) {
                    // Activate the workflow
                    const { activateWorkflow } = await import("@/lib/n8n-api");
                    await activateWorkflow(importResult.n8nWorkflowId, config);

                    activationResults.push({ name: workflow.name, success: true });

                    await sendEvent({
                      type: "workflow_complete",
                      timestamp: now(),
                      data: {
                        index: i,
                        total: createdWorkflows.length,
                        name: workflow.name,
                        filename: workflow.filename,
                        status: "activated",
                        n8nWorkflowId: importResult.n8nWorkflowId,
                        phase: 2,
                      },
                    });

                    // Small delay after activation for n8n to index
                    await new Promise((resolve) => setTimeout(resolve, 500));
                  }
                } catch (error) {
                  const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";

                  activationResults.push({
                    name: workflow.name,
                    success: false,
                    error: errorMessage,
                  });

                  await sendEvent({
                    type: "workflow_complete",
                    timestamp: now(),
                    data: {
                      index: i,
                      total: createdWorkflows.length,
                      name: workflow.name,
                      filename: workflow.filename,
                      status: "activation_failed",
                      error: errorMessage,
                      phase: 2,
                    },
                  });
                }
              }

              // Send complete event
              const successCount = activationResults.filter((r) => r.success).length;
              const failCount = activationResults.filter((r) => !r.success).length;

              await sendEvent({
                type: "complete",
                timestamp: now(),
                data: {
                  total: workflows.length,
                  imported: results.filter((r) => r.status === "imported").length,
                  updated: results.filter((r) => r.status === "updated").length,
                  skipped: results.filter((r) => r.status === "skipped").length,
                  activated: successCount,
                  activationFailed: failCount,
                  duration: Date.now() - startTime,
                },
              });

              await writer.close();
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              log.error("Streaming import failed", { error: errorMessage });

              try {
                await sendEvent({
                  type: "error",
                  timestamp: new Date().toISOString(),
                  data: { message: errorMessage },
                });
                await writer.close();
              } catch {
                // Writer may already be closed
              }
            }
          })();

          // Return SSE response
          const response = new Response(readable, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Correlation-ID": ctx.correlationId,
            },
          });

          return response;
        } catch (error) {
          log.error("Failed to start streaming import", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to start streaming import",
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
