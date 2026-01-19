import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import { getN8nConfig, clearN8nConfig, clearAllSettings } from "@/lib/settings";
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
import { execute } from "@/lib/db";

/**
 * Reset mode options:
 * - soft: Clear registry only, workflows remain in n8n
 * - full: Delete workflows from n8n + clear registry
 * - clear_config: Clear n8n URL/key only
 * - factory: Delete from n8n + clear all settings + reset setup wizard
 */
type ResetMode = "soft" | "full" | "clear_config" | "factory";

/**
 * Request body for the reset endpoint.
 */
interface ResetRequest {
  /**
   * Reset mode:
   * - soft: Clear registry and settings only (workflows remain in n8n)
   * - full: Delete workflows from n8n, then clear registry and settings
   * - clear_config: Clear n8n URL and API key only
   * - factory: Full reset + clear all settings + reset setup wizard
   */
  mode: ResetMode;

  /**
   * Confirmation string - must be "RESET" to proceed.
   * This is a safety measure to prevent accidental resets.
   */
  confirmation: string;

  /**
   * Keep n8n API URL/key after reset (default: false for full/factory, true for soft).
   * Useful if you want to re-import to the same n8n instance.
   */
  preserveN8nConfig?: boolean;

  /**
   * Preserve the audit log (decision_log_entries) during reset.
   * Default: true for compliance purposes.
   */
  preserveAuditLog?: boolean;
}

/**
 * Response body for the reset endpoint.
 */
interface ResetResponse {
  success: boolean;
  mode: ResetMode;
  deletedFromN8n: number;
  clearedFromRegistry: number;
  settingsReset: boolean;
  setupWizardReset: boolean;
  errors: string[];
  warnings: string[];
  actions: {
    workflowsDeactivated: number;
    workflowsDeleted: number;
    registryCleared: number;
    settingsReset: string[];
  };
  canUndo: boolean;
  undoToken?: string;
}

const VALID_MODES: ResetMode[] = ["soft", "full", "clear_config", "factory"];

/**
 * POST /api/setup/reset
 *
 * Reset the workflow setup, optionally deleting all workflows from n8n.
 *
 * This is a destructive operation that requires a confirmation string.
 *
 * Modes:
 * - soft: Clears the workflow registry only, but leaves
 *         workflows in the n8n instance. Use this to re-import workflows
 *         from scratch without deleting them from n8n.
 *
 * - full: Deactivates and deletes all Product Factory workflows from n8n,
 *         then clears the registry. Use this to completely remove all
 *         Product Factory workflows from n8n.
 *
 * - clear_config: Clears only the n8n URL and API key. Use this when
 *         switching to a different n8n instance.
 *
 * - factory: Deactivates and deletes all workflows from n8n, clears the
 *         registry, clears all settings, and resets the setup wizard.
 *         Use this to start completely fresh.
 *
 * After a full or factory reset, the user will need to go through the
 * setup wizard again.
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
          if (!body.mode || !VALID_MODES.includes(body.mode)) {
            const response = Response.json(
              { error: `Invalid mode. Must be one of: ${VALID_MODES.join(", ")}` },
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
            preserveAuditLog: body.preserveAuditLog,
            userId: session.user.id,
          });

          // Initialize response
          const responseBody: ResetResponse = {
            success: false,
            mode: body.mode,
            deletedFromN8n: 0,
            clearedFromRegistry: 0,
            settingsReset: false,
            setupWizardReset: false,
            errors: [],
            warnings: [],
            actions: {
              workflowsDeactivated: 0,
              workflowsDeleted: 0,
              registryCleared: 0,
              settingsReset: [],
            },
            canUndo: false,
          };

          // Handle clear_config mode specially (simpler operation)
          if (body.mode === "clear_config") {
            try {
              await clearN8nConfig();
              responseBody.success = true;
              responseBody.settingsReset = true;
              responseBody.actions.settingsReset = ["n8n.api_url", "n8n.api_key", "n8n.webhook_base_url"];
              log.info("Cleared n8n configuration");
            } catch (error) {
              responseBody.errors.push(
                error instanceof Error ? error.message : "Failed to clear n8n config"
              );
            }

            const response = Response.json(responseBody, {
              status: responseBody.success ? 200 : 500,
            });
            logRequestComplete(ctx, responseBody.success ? 200 : 500, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Get n8n config for full/factory reset
          let config;
          if (body.mode === "full" || body.mode === "factory") {
            config = await getN8nConfig();
            if (!config) {
              log.warn("n8n not configured, reset will skip n8n deletion");
              responseBody.warnings.push(
                "n8n not configured - skipping workflow deletion from n8n instance"
              );
            }
          }

          // Perform the workflow reset (soft or full)
          const effectiveMode = body.mode === "factory" ? "full" : body.mode;
          const result: ResetResult = await performFullReset({
            mode: effectiveMode as "soft" | "full",
            preserveN8nConfig: body.mode === "soft" ? true : (body.preserveN8nConfig ?? false),
            configOverride: config ?? undefined,
          });

          // Update response with result
          responseBody.deletedFromN8n = result.deletedFromN8n;
          responseBody.clearedFromRegistry = result.clearedFromRegistry;
          responseBody.settingsReset = result.settingsReset;
          responseBody.errors.push(...result.errors);
          responseBody.warnings.push(...result.warnings);
          responseBody.actions.workflowsDeleted = result.deletedFromN8n;
          responseBody.actions.registryCleared = result.clearedFromRegistry;

          // For factory reset, also clear all settings and reset setup wizard
          if (body.mode === "factory") {
            try {
              // Clear all settings except audit log if requested
              const preserveAuditLog = body.preserveAuditLog !== false;
              await clearAllSettings({ preserveAuditLog });
              responseBody.actions.settingsReset.push("all_settings");
              log.info("Cleared all settings", { preserveAuditLog });

              // Reset setup wizard state
              try {
                await execute(
                  `DELETE FROM app_settings WHERE setting_key LIKE 'setup.%'`
                );
                responseBody.setupWizardReset = true;
                responseBody.actions.settingsReset.push("setup_wizard");
                log.info("Reset setup wizard state");
              } catch (error) {
                responseBody.warnings.push(
                  "Failed to reset setup wizard state"
                );
                log.warn("Failed to reset setup wizard state", { error });
              }
            } catch (error) {
              responseBody.errors.push(
                error instanceof Error ? error.message : "Failed to clear settings"
              );
            }
          }

          // Determine overall success
          responseBody.success = result.success && responseBody.errors.length === 0;

          log.info("Setup reset complete", {
            mode: body.mode,
            success: responseBody.success,
            deletedFromN8n: responseBody.deletedFromN8n,
            clearedFromRegistry: responseBody.clearedFromRegistry,
            settingsReset: responseBody.settingsReset,
            setupWizardReset: responseBody.setupWizardReset,
            errors: responseBody.errors.length,
            warnings: responseBody.warnings.length,
          });

          const response = Response.json(responseBody, {
            status: responseBody.success ? 200 : 500,
          });

          logRequestComplete(
            ctx,
            responseBody.success ? 200 : 500,
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
