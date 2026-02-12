#!/bin/bash
# Script: Aplicar migrations pendentes 0064-0073
# Data: 2026-02-11
# Contexto: Limpeza DDD Financial/Fiscal/Accounting

set -e  # Sai em erro

DB_HOST="localhost"
DB_USER="sa"
DB_PASS="AuraCore@Local2026!"
DB_NAME="auracore_dev"
MIGRATION_DIR="/Users/pedrolemes/aura_core/drizzle/migrations"

echo "🔄 Aplicando migrations pendentes (0064-0073)..."
echo ""

MIGRATIONS=(
  "0064_add_2fa_totp_fields.sql"
  "0065_fix_schema_gaps_e13_2.sql"
  "0066_expand_totp_secret_column.sql"
  "0067_fix_wms_updated_at_type.sql"
  "0068_add_trip_checkpoints_updated_at.sql"
  "0069_create_financial_reporting_views.sql"
  "0070_create_cfop_determination.sql"
  "0071_add_accountant_fields_to_organizations.sql"
  "0072_create_accounting_period_closings.sql"
  "0073_create_driver_receipts.sql"
)

for MIGRATION in "${MIGRATIONS[@]}"; do
  echo "📄 Aplicando: $MIGRATION"
  
  docker exec auracore-sql-local /opt/mssql-tools18/bin/sqlcmd \
    -S "$DB_HOST" -U "$DB_USER" -P "$DB_PASS" -C -d "$DB_NAME" \
    -i "/var/opt/mssql/migrations/$MIGRATION" \
    -b  # Exit on error
  
  if [ $? -eq 0 ]; then
    echo "✅ $MIGRATION aplicada com sucesso"
    
    # Registrar na tabela __drizzle_migrations
    HASH=$(echo "$MIGRATION" | sed 's/.sql//')
    TIMESTAMP=$(date +%s)000
    
    docker exec auracore-sql-local /opt/mssql-tools18/bin/sqlcmd \
      -S "$DB_HOST" -U "$DB_USER" -P "$DB_PASS" -C -d "$DB_NAME" \
      -Q "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('$HASH', $TIMESTAMP)" \
      -b
    
    echo ""
  else
    echo "❌ Erro ao aplicar $MIGRATION"
    exit 1
  fi
done

echo "✅ Todas as migrations aplicadas com sucesso!"
echo ""
echo "📊 Verificando registro..."
docker exec auracore-sql-local /opt/mssql-tools18/bin/sqlcmd \
  -S "$DB_HOST" -U "$DB_USER" -P "$DB_PASS" -C -d "$DB_NAME" \
  -Q "SELECT TOP 10 hash FROM __drizzle_migrations ORDER BY created_at DESC"
