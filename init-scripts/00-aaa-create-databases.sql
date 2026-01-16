-- ============================================
-- AI Product Factory - Database Initialization
-- Version: 1.1.0
-- ============================================
-- This script runs first (00-) to create separate databases
-- for n8n and the dashboard to avoid table name collisions.
--
-- Databases created:
-- 1. n8n - For n8n workflow engine (user management, workflows, etc.)
-- 2. dashboard - For Better-Auth + project state tables
-- ============================================

-- The default database (POSTGRES_DB=n8n) is already created by PostgreSQL.
-- We need to create an additional database for the dashboard.

-- Create the dashboard database for Better-Auth and project state
CREATE DATABASE dashboard;

-- Grant permissions to the default user on the dashboard database
GRANT ALL PRIVILEGES ON DATABASE dashboard TO n8n;
