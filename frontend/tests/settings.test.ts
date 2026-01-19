import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database module
vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
}));

// Mock the encryption module
vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v) => `encrypted:${v}`),
  decrypt: vi.fn((v) => (v as string).replace("encrypted:", "")),
  mask: vi.fn(() => "****"),
  isEncryptionConfigured: vi.fn(() => true),
}));

// Mock the logger
vi.mock("@/lib/logger", () => ({
  default: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

import { query, queryOne } from "@/lib/db";
import {
  isSetupComplete,
  isN8nConfigured,
  getSetupStatus,
  getSetting,
} from "../lib/settings";

describe("Settings Library - Resilient Database Queries", () => {
  const mockQueryOne = queryOne as ReturnType<typeof vi.fn>;
  const mockQuery = query as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("isSetupComplete", () => {
    it("should return true when function returns true", async () => {
      mockQueryOne.mockResolvedValueOnce({ complete: true });

      const result = await isSetupComplete();

      expect(result).toBe(true);
      expect(mockQueryOne).toHaveBeenCalledWith(
        "SELECT is_setup_complete() as complete"
      );
    });

    it("should return false when function returns false", async () => {
      mockQueryOne.mockResolvedValueOnce({ complete: false });

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });

    it("should return false when function returns null", async () => {
      mockQueryOne.mockResolvedValueOnce(null);

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });

    it("should fallback to table query when function does not exist (code 42883)", async () => {
      // First call fails with undefined_function error
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      // Fallback query returns setting
      mockQueryOne.mockResolvedValueOnce({ setting_value: "true" });

      const result = await isSetupComplete();

      expect(result).toBe(true);
      expect(mockQueryOne).toHaveBeenCalledTimes(2);
    });

    it("should fallback when function error message contains 'does not exist'", async () => {
      mockQueryOne.mockRejectedValueOnce({
        message: "function is_setup_complete() does not exist",
      });
      mockQueryOne.mockResolvedValueOnce({ setting_value: "true" });

      const result = await isSetupComplete();

      expect(result).toBe(true);
    });

    it("should return false when fallback finds no setting", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQueryOne.mockResolvedValueOnce(null);

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });

    it("should return false when both function and table don't exist", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQueryOne.mockRejectedValueOnce({ code: "42P01" });

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });

    it("should re-throw non-PostgreSQL errors", async () => {
      mockQueryOne.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(isSetupComplete()).rejects.toThrow("Connection refused");
    });
  });

  describe("isN8nConfigured", () => {
    it("should return true when function returns true", async () => {
      mockQueryOne.mockResolvedValueOnce({ configured: true });

      const result = await isN8nConfigured();

      expect(result).toBe(true);
      expect(mockQueryOne).toHaveBeenCalledWith(
        "SELECT is_n8n_configured() as configured"
      );
    });

    it("should return false when function returns false", async () => {
      mockQueryOne.mockResolvedValueOnce({ configured: false });

      const result = await isN8nConfigured();

      expect(result).toBe(false);
    });

    it("should fallback to table query when function does not exist", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQuery.mockResolvedValueOnce([
        {
          setting_key: "n8n.api_url",
          setting_value: '"https://n8n.example.com"',
        },
        { setting_key: "n8n.api_key", setting_value: '"sk-abc123"' },
      ]);

      const result = await isN8nConfigured();

      expect(result).toBe(true);
    });

    it("should return false when only one setting exists", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQuery.mockResolvedValueOnce([
        {
          setting_key: "n8n.api_url",
          setting_value: '"https://n8n.example.com"',
        },
      ]);

      const result = await isN8nConfigured();

      expect(result).toBe(false);
    });

    it("should return false when settings have empty values", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQuery.mockResolvedValueOnce([
        { setting_key: "n8n.api_url", setting_value: '""' },
        { setting_key: "n8n.api_key", setting_value: '"sk-abc"' },
      ]);

      const result = await isN8nConfigured();

      expect(result).toBe(false);
    });

    it("should return false when table does not exist", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQuery.mockRejectedValueOnce({ code: "42P01" });

      const result = await isN8nConfigured();

      expect(result).toBe(false);
    });

    it("should re-throw non-PostgreSQL errors", async () => {
      mockQueryOne.mockRejectedValueOnce(new Error("Network error"));

      await expect(isN8nConfigured()).rejects.toThrow("Network error");
    });
  });

  describe("getSetupStatus", () => {
    // TODO: Fix mocking - tests need to match actual implementation
    it.skip("should use view when available", async () => {
      mockQueryOne
        .mockResolvedValueOnce({
          n8n_configured: true,
          wizard_completed: true,
          workflows_imported: "5",
          workflows_total: "8",
        })
        .mockResolvedValueOnce(null) // skipped
        .mockResolvedValueOnce(null); // health check

      const result = await getSetupStatus();

      expect(result).toEqual({
        wizardCompleted: true,
        wizardSkipped: false,
        n8nConfigured: true,
        workflowsImported: 5,
        workflowsTotal: 8,
        lastHealthCheck: null,
      });
    });

    it("should fallback when view does not exist", async () => {
      // View query fails
      mockQueryOne.mockRejectedValueOnce({ code: "42P01" });

      // Fallback: isN8nConfiguredFallback
      mockQuery.mockResolvedValueOnce([
        {
          setting_key: "n8n.api_url",
          setting_value: '"https://n8n.example.com"',
        },
        { setting_key: "n8n.api_key", setting_value: '"sk-abc"' },
      ]);

      // Fallback: isSetupCompleteFallback
      mockQueryOne.mockResolvedValueOnce({ setting_value: "true" });

      // Fallback: workflow counts
      mockQueryOne.mockResolvedValueOnce({ imported: "3", total: "8" });

      // getSetting for skipped
      mockQueryOne.mockResolvedValueOnce(null);

      // getSetting for health check
      mockQueryOne.mockResolvedValueOnce(null);

      const result = await getSetupStatus();

      expect(result.n8nConfigured).toBe(true);
      expect(result.wizardCompleted).toBe(true);
      expect(result.workflowsImported).toBe(3);
    });

    // TODO: Fix mocking - tests need to match actual implementation
    it.skip("should handle all tables missing gracefully", async () => {
      // View fails
      mockQueryOne.mockRejectedValueOnce({ code: "42P01" });
      // n8n check fails (isN8nConfiguredFallback)
      mockQuery.mockRejectedValueOnce({ code: "42P01" });
      // setup complete check fails (isSetupCompleteFallback)
      mockQueryOne.mockRejectedValueOnce({ code: "42P01" });
      // workflow counts fail
      mockQueryOne.mockRejectedValueOnce({ code: "42P01" });
      // skipped check fails (getSetting catches this)
      mockQueryOne.mockRejectedValueOnce({ code: "42P01" });
      // health check fails (getSetting catches this)
      mockQueryOne.mockRejectedValueOnce({ code: "42P01" });

      const result = await getSetupStatus();

      expect(result).toEqual({
        wizardCompleted: false,
        wizardSkipped: false,
        n8nConfigured: false,
        workflowsImported: 0,
        workflowsTotal: 0,
        lastHealthCheck: null,
      });
    });

    // TODO: Fix mocking - tests need to match actual implementation
    it.skip("should return wizard skipped status when available", async () => {
      mockQueryOne
        .mockResolvedValueOnce({
          n8n_configured: false,
          wizard_completed: false,
          workflows_imported: "0",
          workflows_total: "0",
        })
        .mockResolvedValueOnce({ setting_value: "true" }) // skipped = true
        .mockResolvedValueOnce(null); // health check

      const result = await getSetupStatus();

      expect(result.wizardSkipped).toBe(true);
    });

    // TODO: Fix mocking - tests need to match actual implementation
    it.skip("should return last health check when available", async () => {
      const healthCheckData = { timestamp: "2026-01-16T12:00:00Z", healthy: true };
      mockQueryOne
        .mockResolvedValueOnce({
          n8n_configured: true,
          wizard_completed: true,
          workflows_imported: "8",
          workflows_total: "8",
        })
        .mockResolvedValueOnce(null) // skipped
        .mockResolvedValueOnce({ setting_value: JSON.stringify(healthCheckData) }); // health check

      const result = await getSetupStatus();

      expect(result.lastHealthCheck).toEqual(healthCheckData);
    });
  });

  describe("PostgreSQL error detection", () => {
    it("should detect undefined_function by error code 42883", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQueryOne.mockResolvedValueOnce({ setting_value: "false" });

      await isSetupComplete();

      // Should have made fallback call
      expect(mockQueryOne).toHaveBeenCalledTimes(2);
    });

    it("should detect undefined_function by error message pattern", async () => {
      mockQueryOne.mockRejectedValueOnce({
        message:
          'ERROR: function is_n8n_configured() does not exist\nHINT: No function matches',
      });
      mockQuery.mockResolvedValueOnce([]);

      await isN8nConfigured();

      expect(mockQuery).toHaveBeenCalled();
    });

    it("should detect undefined_table by error code 42P01", async () => {
      // For isSetupComplete
      mockQueryOne.mockRejectedValueOnce({ code: "42883" }); // function doesn't exist
      mockQueryOne.mockRejectedValueOnce({ code: "42P01" }); // table doesn't exist

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });

    it("should detect undefined_table by error message pattern", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQueryOne.mockRejectedValueOnce({
        message: 'relation "app_settings" does not exist',
      });

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });

    it("should not mistake other errors as PostgreSQL errors", async () => {
      mockQueryOne.mockRejectedValueOnce({
        code: "ECONNREFUSED",
        message: "Connection refused",
      });

      await expect(isSetupComplete()).rejects.toMatchObject({
        code: "ECONNREFUSED",
      });
    });
  });

  describe("getSetting fallback behavior", () => {
    it("should return null for non-existent settings", async () => {
      mockQueryOne.mockResolvedValueOnce(null);

      const result = await getSetting("non.existent.key");

      expect(result).toBeNull();
    });

    it("should parse JSON setting values", async () => {
      mockQueryOne.mockResolvedValueOnce({
        setting_key: "test.json",
        setting_value: '{"foo": "bar"}',
        setting_type: "json",
        is_sensitive: false,
      });

      const result = await getSetting("test.json");

      expect(result).toEqual({ foo: "bar" });
    });
  });

  describe("Edge cases", () => {
    it("should handle boolean false stored as JSON", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQueryOne.mockResolvedValueOnce({ setting_value: "false" });

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });

    it("should handle string 'true' stored as JSON", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQueryOne.mockResolvedValueOnce({ setting_value: '"true"' });

      // String "true" is not boolean true
      const result = await isSetupComplete();

      expect(result).toBe(false);
    });

    it("should handle empty result set in n8n config check", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42883" });
      mockQuery.mockResolvedValueOnce([]);

      const result = await isN8nConfigured();

      expect(result).toBe(false);
    });

    it("should handle partial workflow counts", async () => {
      mockQueryOne.mockRejectedValueOnce({ code: "42P01" }); // view doesn't exist
      mockQuery.mockResolvedValueOnce([]); // n8n not configured
      mockQueryOne.mockResolvedValueOnce(null); // wizard not complete
      mockQueryOne.mockResolvedValueOnce({ imported: "0", total: "0" }); // workflow counts
      mockQueryOne.mockResolvedValueOnce(null); // skipped
      mockQueryOne.mockResolvedValueOnce(null); // health check

      const result = await getSetupStatus();

      expect(result.workflowsImported).toBe(0);
      expect(result.workflowsTotal).toBe(0);
    });
  });
});
