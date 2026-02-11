#!/bin/bash
# =============================================================================
# AuraCore Docker Entrypoint
# =============================================================================
# Executes pending database migrations before starting the server.
# 
# @see E13.3 - Automatizar migration pipeline no Coolify
#
# Environment variables:
#   SKIP_MIGRATIONS=true  - Skip migration step (useful for debugging)
#   MIGRATION_OPTIONAL=true - Don't fail if DB is unreachable
# =============================================================================

set -e

echo "=== AuraCore Entrypoint ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# --- Step 1: Run Migrations ---
if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "SKIP_MIGRATIONS=true: Skipping database migrations."
else
  echo "Running database migrations..."
  node scripts/run-migrations.mjs || {
    EXIT_CODE=$?
    if [ "${MIGRATION_OPTIONAL}" = "true" ]; then
      echo "WARNING: Migrations failed (exit code $EXIT_CODE) but MIGRATION_OPTIONAL=true. Continuing..."
    else
      echo "ERROR: Migrations failed (exit code $EXIT_CODE). Server will not start."
      echo "Set MIGRATION_OPTIONAL=true to skip migrations on failure."
      exit $EXIT_CODE
    fi
  }
  echo ""
fi

# --- Step 2: Start Server ---
echo "Starting Next.js server..."
exec node server.js
