import { query, queryOne, execute } from "@/lib/db";
import { encrypt, decrypt, mask, isEncryptionConfigured } from "@/lib/encryption";
import logger from "@/lib/logger";

/**
 * Application settings management module.
 *
 * Provides CRUD operations for app_settings table with automatic
 * encryption/decryption of sensitive values.
 */

const log = logger.child({ component: "settings" });

// Type definitions
export interface Setting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  setting_type: "string" | "number" | "boolean" | "json" | "encrypted";
  description: string | null;
  is_sensitive: boolean;
  created_at: Date;
  updated_at: Date;
  updated_by: string | null;
}

export interface SettingInput {
  key: string;
  value: unknown;
  type?: Setting["setting_type"];
  description?: string;
  isSensitive?: boolean;
  updatedBy?: string;
}

// Database row type
interface SettingRow {
  id: string;
  setting_key: string;
  setting_value: string; // JSONB stored as string
  setting_type: string;
  description: string | null;
  is_sensitive: boolean;
  created_at: Date;
  updated_at: Date;
  updated_by: string | null;
}

/**
 * Get a setting value by key.
 * Automatically decrypts encrypted values.
 *
 * @param key - The setting key (e.g., "n8n.api_url")
 * @returns The setting value, or null if not found
 */
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const row = await queryOne<SettingRow>(
    "SELECT * FROM app_settings WHERE setting_key = $1",
    [key]
  );

  if (!row) {
    return null;
  }

  let value = JSON.parse(row.setting_value);

  // Decrypt if this is an encrypted value
  if (row.setting_type === "encrypted" && typeof value === "string") {
    try {
      value = decrypt(value);
    } catch (error) {
      log.error("Failed to decrypt setting", { key, error });
      throw new Error(`Failed to decrypt setting: ${key}`);
    }
  }

  return value as T;
}

/**
 * Get multiple settings by keys.
 *
 * @param keys - Array of setting keys
 * @returns Object mapping keys to values (missing keys are omitted)
 */
export async function getSettings(
  keys: string[]
): Promise<Record<string, unknown>> {
  if (keys.length === 0) {
    return {};
  }

  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await query<SettingRow>(
    `SELECT * FROM app_settings WHERE setting_key IN (${placeholders})`,
    keys
  );

  const result: Record<string, unknown> = {};

  for (const row of rows) {
    let value = JSON.parse(row.setting_value);

    if (row.setting_type === "encrypted" && typeof value === "string") {
      try {
        value = decrypt(value);
      } catch (error) {
        log.error("Failed to decrypt setting", { key: row.setting_key, error });
        // Skip failed decryptions rather than throwing
        continue;
      }
    }

    result[row.setting_key] = value;
  }

  return result;
}

/**
 * Set a setting value.
 * Automatically encrypts sensitive values.
 *
 * @param input - Setting input object
 */
export async function setSetting(input: SettingInput): Promise<void> {
  const {
    key,
    value,
    type = "string",
    description,
    isSensitive = false,
    updatedBy,
  } = input;

  let storedValue = value;
  let storedType = type;

  // Encrypt sensitive values
  if (isSensitive || type === "encrypted") {
    if (!isEncryptionConfigured()) {
      throw new Error(
        "Cannot store encrypted setting: encryption not configured. " +
          "Ensure AUTH_SECRET is set."
      );
    }

    if (typeof value !== "string") {
      throw new Error("Encrypted values must be strings");
    }

    storedValue = encrypt(value);
    storedType = "encrypted";
  }

  await execute(
    `INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_sensitive, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (setting_key) DO UPDATE SET
       setting_value = EXCLUDED.setting_value,
       setting_type = EXCLUDED.setting_type,
       description = COALESCE(EXCLUDED.description, app_settings.description),
       is_sensitive = EXCLUDED.is_sensitive,
       updated_by = EXCLUDED.updated_by`,
    [
      key,
      JSON.stringify(storedValue),
      storedType,
      description ?? null,
      isSensitive || storedType === "encrypted",
      updatedBy ?? null,
    ]
  );

  log.info("Setting updated", {
    key,
    type: storedType,
    isSensitive: isSensitive || storedType === "encrypted",
  });
}

/**
 * Delete a setting by key.
 *
 * @param key - The setting key to delete
 * @returns true if deleted, false if not found
 */
export async function deleteSetting(key: string): Promise<boolean> {
  const affected = await execute(
    "DELETE FROM app_settings WHERE setting_key = $1",
    [key]
  );
  return affected > 0;
}

/**
 * Get a setting with its metadata (for display in UI).
 * Sensitive values are masked.
 *
 * @param key - The setting key
 * @returns Setting with masked value if sensitive
 */
export async function getSettingForDisplay(
  key: string
): Promise<(Setting & { displayValue: string }) | null> {
  const row = await queryOne<SettingRow>(
    "SELECT * FROM app_settings WHERE setting_key = $1",
    [key]
  );

  if (!row) {
    return null;
  }

  let value = JSON.parse(row.setting_value);
  let displayValue: string;

  if (row.setting_type === "encrypted" || row.is_sensitive) {
    // For encrypted values, decrypt first then mask
    try {
      const decrypted = decrypt(value);
      displayValue = mask(decrypted, { showFirst: 3, showLast: 4 });
    } catch {
      displayValue = "********";
    }
  } else {
    displayValue = typeof value === "string" ? value : JSON.stringify(value);
  }

  return {
    id: row.id,
    setting_key: row.setting_key,
    setting_value: row.is_sensitive ? "[REDACTED]" : value,
    setting_type: row.setting_type as Setting["setting_type"],
    description: row.description,
    is_sensitive: row.is_sensitive,
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by,
    displayValue,
  };
}

// ============================================
// n8n-specific helpers
// ============================================

/**
 * Check if n8n is configured (has both URL and API key).
 */
export async function isN8nConfigured(): Promise<boolean> {
  const result = await queryOne<{ configured: boolean }>(
    "SELECT is_n8n_configured() as configured"
  );
  return result?.configured ?? false;
}

/**
 * Get n8n configuration for use in API calls.
 * Returns null if not configured.
 */
export async function getN8nConfig(): Promise<{
  apiUrl: string;
  apiKey: string;
  webhookBaseUrl: string;
} | null> {
  const settings = await getSettings([
    "n8n.api_url",
    "n8n.api_key",
    "n8n.webhook_base_url",
  ]);

  const apiUrl = settings["n8n.api_url"] as string | undefined;
  const apiKey = settings["n8n.api_key"] as string | undefined;
  const webhookBaseUrl = settings["n8n.webhook_base_url"] as string | undefined;

  if (!apiUrl || !apiKey) {
    return null;
  }

  return {
    apiUrl,
    apiKey,
    webhookBaseUrl: webhookBaseUrl || apiUrl, // Default webhook URL to API URL
  };
}

/**
 * Save n8n configuration.
 */
export async function saveN8nConfig(config: {
  apiUrl: string;
  apiKey: string;
  webhookBaseUrl?: string;
  updatedBy?: string;
}): Promise<void> {
  const { apiUrl, apiKey, webhookBaseUrl, updatedBy } = config;

  await Promise.all([
    setSetting({
      key: "n8n.api_url",
      value: apiUrl,
      type: "string",
      description: "n8n instance API URL",
      updatedBy,
    }),
    setSetting({
      key: "n8n.api_key",
      value: apiKey,
      type: "encrypted",
      description: "n8n API key",
      isSensitive: true,
      updatedBy,
    }),
    setSetting({
      key: "n8n.webhook_base_url",
      value: webhookBaseUrl || apiUrl,
      type: "string",
      description: "Base URL for n8n webhooks",
      updatedBy,
    }),
    setSetting({
      key: "n8n.configured_at",
      value: new Date().toISOString(),
      type: "string",
      description: "When n8n was configured",
      updatedBy,
    }),
  ]);

  log.info("n8n configuration saved", { apiUrl, updatedBy });
}

/**
 * Clear n8n configuration.
 */
export async function clearN8nConfig(): Promise<void> {
  await Promise.all([
    deleteSetting("n8n.api_url"),
    deleteSetting("n8n.api_key"),
    deleteSetting("n8n.webhook_base_url"),
    deleteSetting("n8n.configured_at"),
    deleteSetting("n8n.last_health_check"),
  ]);

  log.info("n8n configuration cleared");
}

// ============================================
// Setup wizard helpers
// ============================================

/**
 * Check if setup wizard has been completed.
 */
export async function isSetupComplete(): Promise<boolean> {
  const result = await queryOne<{ complete: boolean }>(
    "SELECT is_setup_complete() as complete"
  );
  return result?.complete ?? false;
}

/**
 * Mark setup wizard as complete.
 */
export async function completeSetup(userId?: string): Promise<void> {
  await Promise.all([
    setSetting({
      key: "setup.wizard_completed",
      value: true,
      type: "boolean",
      description: "Whether setup wizard has been completed",
      updatedBy: userId,
    }),
    setSetting({
      key: "setup.wizard_completed_at",
      value: new Date().toISOString(),
      type: "string",
      description: "When setup wizard was completed",
      updatedBy: userId,
    }),
    setSetting({
      key: "setup.wizard_completed_by",
      value: userId || "unknown",
      type: "string",
      description: "User who completed setup wizard",
      updatedBy: userId,
    }),
  ]);

  log.info("Setup wizard marked as complete", { userId });
}

/**
 * Mark setup wizard as skipped (user chose manual configuration).
 */
export async function skipSetup(userId?: string): Promise<void> {
  await setSetting({
    key: "setup.wizard_skipped",
    value: true,
    type: "boolean",
    description: "Whether user skipped setup wizard",
    updatedBy: userId,
  });

  log.info("Setup wizard skipped", { userId });
}

/**
 * Get full setup status for the setup wizard.
 */
export async function getSetupStatus(): Promise<{
  wizardCompleted: boolean;
  wizardSkipped: boolean;
  n8nConfigured: boolean;
  workflowsImported: number;
  workflowsTotal: number;
  lastHealthCheck: { timestamp: string; healthy: boolean } | null;
}> {
  // Use the database view for efficient querying
  const status = await queryOne<{
    n8n_configured: boolean;
    wizard_completed: boolean;
    workflows_imported: string;
    workflows_total: string;
  }>("SELECT * FROM setup_status");

  const skipped = await getSetting<boolean>("setup.wizard_skipped");
  const healthCheck = await getSetting<{ timestamp: string; healthy: boolean }>(
    "n8n.last_health_check"
  );

  return {
    wizardCompleted: status?.wizard_completed ?? false,
    wizardSkipped: skipped ?? false,
    n8nConfigured: status?.n8n_configured ?? false,
    workflowsImported: parseInt(status?.workflows_imported ?? "0", 10),
    workflowsTotal: parseInt(status?.workflows_total ?? "0", 10),
    lastHealthCheck: healthCheck ?? null,
  };
}

/**
 * Update last health check result.
 */
export async function updateHealthCheck(healthy: boolean): Promise<void> {
  await setSetting({
    key: "n8n.last_health_check",
    value: {
      timestamp: new Date().toISOString(),
      healthy,
    },
    type: "json",
    description: "Last n8n health check result",
  });
}
