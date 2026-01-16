-- ============================================
-- Migration: Add app_settings and workflow_registry tables
-- ============================================
-- Run this script against your 'dashboard' database if you see:
--   "relation app_settings does not exist"
--
-- Usage:
--   docker exec -i <postgres-container> psql -U n8n -d dashboard < scripts/migrate-add-app-settings.sql
--
-- Or via Dokploy/Docker Compose:
--   docker compose exec postgres psql -U n8n -d dashboard < scripts/migrate-add-app-settings.sql
-- ============================================

-- Ensure pgcrypto extension exists (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create or replace the timestamp update function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Application Settings Table (Key-Value Store)
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string' CHECK (setting_type IN (
        'string', 'number', 'boolean', 'json', 'encrypted'
    )),
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_settings_sensitive ON app_settings(is_sensitive) WHERE is_sensitive = TRUE;

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Workflow Registry Table
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name VARCHAR(255) NOT NULL,
    workflow_file VARCHAR(255) NOT NULL UNIQUE,
    n8n_workflow_id VARCHAR(100),
    n8n_workflow_version INTEGER DEFAULT 1,
    local_version VARCHAR(50) NOT NULL,
    local_checksum VARCHAR(64),
    webhook_paths JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN DEFAULT FALSE,
    import_status VARCHAR(50) DEFAULT 'pending' CHECK (import_status IN (
        'pending', 'importing', 'imported', 'failed', 'update_available', 'updating'
    )),
    last_import_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_registry_name ON workflow_registry(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_registry_status ON workflow_registry(import_status);
CREATE INDEX IF NOT EXISTS idx_workflow_registry_n8n_id ON workflow_registry(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_registry_active ON workflow_registry(is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS update_workflow_registry_updated_at ON workflow_registry;
CREATE TRIGGER update_workflow_registry_updated_at
    BEFORE UPDATE ON workflow_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helper Functions
-- ============================================

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
-- Views
-- ============================================

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

CREATE OR REPLACE VIEW setup_status AS
SELECT
    is_n8n_configured() AS n8n_configured,
    is_setup_complete() AS wizard_completed,
    (SELECT setting_value::TEXT FROM app_settings WHERE setting_key = 'n8n.api_url') AS n8n_url,
    (SELECT setting_value::TEXT FROM app_settings WHERE setting_key = 'setup.wizard_completed_at') AS completed_at,
    (SELECT COUNT(*) FROM workflow_registry WHERE import_status = 'imported') AS workflows_imported,
    (SELECT COUNT(*) FROM workflow_registry) AS workflows_total;

-- ============================================
-- Verification
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Migration complete! Tables created:';
    RAISE NOTICE '  - app_settings';
    RAISE NOTICE '  - workflow_registry';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - get_setting()';
    RAISE NOTICE '  - set_setting()';
    RAISE NOTICE '  - is_n8n_configured()';
    RAISE NOTICE '  - is_setup_complete()';
    RAISE NOTICE 'Views created:';
    RAISE NOTICE '  - workflow_import_summary';
    RAISE NOTICE '  - setup_status';
END $$;
