-- ============================================
-- AI Product Factory - Application Settings Schema
-- Version: 1.0.0
-- ============================================
-- This script creates tables for application settings and workflow registry.
-- Used by the setup wizard to store n8n configuration and track imported workflows.
-- ============================================

-- ============================================
-- Application Settings Table (Key-Value Store)
-- ============================================
-- Stores application-wide configuration including n8n integration settings.
-- Sensitive values (like API keys) are encrypted before storage.

CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Setting identification
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,

    -- Type information for validation/display
    setting_type VARCHAR(50) DEFAULT 'string' CHECK (setting_type IN (
        'string', 'number', 'boolean', 'json', 'encrypted'
    )),

    -- Metadata
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,

    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255)  -- User ID who last modified
);

-- Index for fast lookups by key
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_settings_sensitive ON app_settings(is_sensitive) WHERE is_sensitive = TRUE;

-- Trigger for auto-updating timestamps
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Workflow Registry Table
-- ============================================
-- Tracks imported workflows, their versions, and status.
-- Enables version checking and update detection.

CREATE TABLE IF NOT EXISTS workflow_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workflow identification
    workflow_name VARCHAR(255) NOT NULL,
    workflow_file VARCHAR(255) NOT NULL UNIQUE,  -- Source JSON filename

    -- n8n integration
    n8n_workflow_id VARCHAR(100),        -- n8n's workflow ID after import
    n8n_workflow_version INTEGER DEFAULT 1,

    -- Version tracking
    local_version VARCHAR(50) NOT NULL,  -- Version from our bundled JSON file
    local_checksum VARCHAR(64),          -- SHA-256 of workflow JSON for change detection

    -- Webhook configuration
    webhook_paths JSONB DEFAULT '[]'::JSONB,  -- Array of webhook paths from this workflow

    -- Status tracking
    is_active BOOLEAN DEFAULT FALSE,
    import_status VARCHAR(50) DEFAULT 'pending' CHECK (import_status IN (
        'pending',           -- Not yet imported
        'importing',         -- Import in progress
        'imported',          -- Successfully imported
        'failed',            -- Import failed
        'update_available',  -- Newer local version available
        'updating'           -- Update in progress
    )),

    -- Error tracking
    last_import_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for workflow registry
CREATE INDEX IF NOT EXISTS idx_workflow_registry_name ON workflow_registry(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_registry_status ON workflow_registry(import_status);
CREATE INDEX IF NOT EXISTS idx_workflow_registry_n8n_id ON workflow_registry(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_registry_active ON workflow_registry(is_active) WHERE is_active = TRUE;

-- Trigger for auto-updating timestamps
DROP TRIGGER IF EXISTS update_workflow_registry_updated_at ON workflow_registry;
CREATE TRIGGER update_workflow_registry_updated_at
    BEFORE UPDATE ON workflow_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Permissions
-- ============================================
-- Grant necessary permissions to dashboard_reader role

GRANT SELECT, INSERT, UPDATE ON app_settings TO dashboard_reader;
GRANT SELECT, INSERT, UPDATE ON workflow_registry TO dashboard_reader;

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get a setting value by key
CREATE OR REPLACE FUNCTION get_setting(p_key VARCHAR(100))
RETURNS JSONB AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT setting_value INTO v_value
    FROM app_settings
    WHERE setting_key = p_key;

    RETURN v_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to set a setting value
CREATE OR REPLACE FUNCTION set_setting(
    p_key VARCHAR(100),
    p_value JSONB,
    p_type VARCHAR(50) DEFAULT 'string',
    p_description TEXT DEFAULT NULL,
    p_is_sensitive BOOLEAN DEFAULT FALSE,
    p_updated_by VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_sensitive, updated_by)
    VALUES (p_key, p_value, p_type, p_description, p_is_sensitive, p_updated_by)
    ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        setting_type = COALESCE(EXCLUDED.setting_type, app_settings.setting_type),
        description = COALESCE(EXCLUDED.description, app_settings.description),
        is_sensitive = COALESCE(EXCLUDED.is_sensitive, app_settings.is_sensitive),
        updated_by = EXCLUDED.updated_by;
END;
$$ LANGUAGE plpgsql;

-- Function to check if n8n is configured
CREATE OR REPLACE FUNCTION is_n8n_configured()
RETURNS BOOLEAN AS $$
DECLARE
    v_api_url JSONB;
    v_api_key JSONB;
BEGIN
    SELECT setting_value INTO v_api_url FROM app_settings WHERE setting_key = 'n8n.api_url';
    SELECT setting_value INTO v_api_key FROM app_settings WHERE setting_key = 'n8n.api_key';

    RETURN v_api_url IS NOT NULL
       AND v_api_key IS NOT NULL
       AND v_api_url::TEXT != '""'
       AND v_api_key::TEXT != '""';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if setup wizard is complete
CREATE OR REPLACE FUNCTION is_setup_complete()
RETURNS BOOLEAN AS $$
DECLARE
    v_completed JSONB;
BEGIN
    SELECT setting_value INTO v_completed
    FROM app_settings
    WHERE setting_key = 'setup.wizard_completed';

    RETURN v_completed IS NOT NULL AND v_completed::TEXT = 'true';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Views for Dashboard
-- ============================================

-- View: Workflow import status summary
CREATE OR REPLACE VIEW workflow_import_summary AS
SELECT
    COUNT(*) AS total_workflows,
    COUNT(*) FILTER (WHERE import_status = 'imported') AS imported_count,
    COUNT(*) FILTER (WHERE import_status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE import_status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE import_status = 'update_available') AS updates_available,
    COUNT(*) FILTER (WHERE is_active = TRUE) AS active_count,
    MAX(last_import_at) AS last_import_time
FROM workflow_registry;

GRANT SELECT ON workflow_import_summary TO dashboard_reader;

-- View: Setup status
CREATE OR REPLACE VIEW setup_status AS
SELECT
    is_n8n_configured() AS n8n_configured,
    is_setup_complete() AS wizard_completed,
    (SELECT setting_value::TEXT FROM app_settings WHERE setting_key = 'n8n.api_url') AS n8n_url,
    (SELECT setting_value::TEXT FROM app_settings WHERE setting_key = 'setup.wizard_completed_at') AS completed_at,
    (SELECT COUNT(*) FROM workflow_registry WHERE import_status = 'imported') AS workflows_imported,
    (SELECT COUNT(*) FROM workflow_registry) AS workflows_total;

GRANT SELECT ON setup_status TO dashboard_reader;

-- ============================================
-- Initial Data (Predefined Settings Keys)
-- ============================================
-- These are placeholder entries that document expected settings.
-- Actual values are set by the setup wizard.

-- Note: We don't insert actual values here - the wizard handles that.
-- This comment documents the expected settings:
--
-- n8n.api_url          - n8n instance base URL (e.g., "https://n8n.example.com")
-- n8n.api_key          - n8n API key (encrypted)
-- n8n.webhook_base_url - Base URL for webhooks (usually same as api_url)
-- n8n.configured_at    - ISO timestamp when n8n was configured
-- n8n.last_health_check - Last health check result JSON
-- setup.wizard_completed - Boolean flag for wizard completion
-- setup.wizard_completed_at - ISO timestamp when wizard was completed
-- setup.wizard_completed_by - User ID who completed the wizard
-- setup.wizard_skipped - Boolean flag if user skipped wizard
