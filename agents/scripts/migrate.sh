#!/bin/bash
# agents/scripts/migrate.sh
# Script de migração de banco de dados

set -euo pipefail

log_info() {
    echo "[INFO] $1"
}

log_error() {
    echo "[ERROR] $1" >&2
}

# Verificar variáveis
if [[ -z "${DATABASE_URL:-}" ]]; then
    log_error "DATABASE_URL not set"
    exit 1
fi

# Executar migrações
log_info "Running database migrations..."

# Se usando Alembic
if [[ -f "alembic.ini" ]]; then
    alembic upgrade head
    log_info "Alembic migrations completed"
fi

# Se usando scripts SQL
if [[ -d "migrations" ]]; then
    for sql_file in migrations/*.sql; do
        if [[ -f "$sql_file" ]]; then
            log_info "Applying: $sql_file"
            # Executar SQL (ajustar para seu banco)
            # psql "$DATABASE_URL" < "$sql_file"
        fi
    done
    log_info "SQL migrations completed"
fi

log_info "All migrations completed successfully"
