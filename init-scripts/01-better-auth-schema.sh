#!/bin/bash
# ============================================
# Better-Auth Schema - Dashboard Database
# ============================================
# This script creates Better-Auth tables in the 'dashboard' database,
# NOT the n8n database. This avoids table name collisions with n8n.
# ============================================

set -e

echo "[init-better-auth] Creating Better-Auth tables in dashboard database..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "dashboard" <<-EOSQL
    -- ============================================
    -- Better-Auth Core Schema for PostgreSQL
    -- ============================================

    -- User table - stores user information
    CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    -- Session table - stores session data for authenticated users
    CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    -- Account table - stores OAuth provider account links (Google, etc.)
    CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    -- Verification table - stores email verification and password reset tokens
    CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- ============================================
    -- Indexes for Performance
    -- ============================================

    CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"("userId");
    CREATE INDEX IF NOT EXISTS idx_session_token ON "session"(token);
    CREATE INDEX IF NOT EXISTS idx_session_expires ON "session"("expiresAt");
    CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"("userId");
    CREATE INDEX IF NOT EXISTS idx_account_provider ON "account"("providerId", "accountId");
    CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification"(identifier);
    CREATE INDEX IF NOT EXISTS idx_verification_expires ON "verification"("expiresAt");
    CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
EOSQL

echo "[init-better-auth] Better-Auth tables created successfully in dashboard database!"
