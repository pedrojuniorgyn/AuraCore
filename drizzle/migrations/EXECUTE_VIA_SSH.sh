#!/bin/bash
# ============================================================================
# SCRIPT PARA EXECUTAR MIGRATIONS VIA SSH NO COOLIFY
# ============================================================================
# Uso: bash EXECUTE_VIA_SSH.sh
# ============================================================================

set -e  # Para no primeiro erro

CONTAINER_NAME="sql-zksk8s0kk08sksgwggkos0gw-005526763019"
SA_PASSWORD="pepked-qogbYt-vyfpa4"

echo "🚀 Executando migrations Fase 6 + Fase 7..."
echo "================================================"
echo ""

# Verificar se container está rodando
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Container SQL não encontrado!"
    echo "Containers disponíveis:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_NAME"
echo ""

# Executar migrations inline (sem arquivo externo)
docker exec -i "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C << 'EOF'
USE AuraCore;
GO

PRINT '🚀 Iniciando migrations Fase 6 + Fase 7...';
GO

-- ============================================================================
-- MIGRATION 0052: Strategic Alerts
-- ============================================================================
PRINT '📋 Migration 0052: Strategic Alerts...';
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_alert')
BEGIN
    CREATE TABLE strategic_alert (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(36) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        current_value DECIMAL(18,4) NULL,
        threshold_value DECIMAL(18,4) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        acknowledged_by INT NULL,
        acknowledged_at DATETIME NULL,
        resolved_at DATETIME NULL,
        metadata NVARCHAR(MAX) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME NULL,
        
        CONSTRAINT FK_alert_organization FOREIGN KEY (organization_id) 
            REFERENCES organization(id),
        CONSTRAINT FK_alert_branch FOREIGN KEY (branch_id) 
            REFERENCES branch(id)
    );

    CREATE INDEX IX_alert_organization_branch 
        ON strategic_alert(organization_id, branch_id);
    CREATE INDEX IX_alert_status 
        ON strategic_alert(status);
    CREATE INDEX IX_alert_entity 
        ON strategic_alert(entity_type, entity_id);

    PRINT '✅ Tabela strategic_alert criada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabela strategic_alert já existe';
END
GO

-- ============================================================================
-- MIGRATION 0053: Workflow Approval
-- ============================================================================
PRINT '📋 Migration 0053: Workflow Approval...';
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_approval_history')
BEGIN
    CREATE TABLE strategic_approval_history (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        strategy_id VARCHAR(36) NOT NULL,
        action VARCHAR(50) NOT NULL,
        actor_user_id INT NOT NULL,
        previous_status VARCHAR(50) NULL,
        new_status VARCHAR(50) NOT NULL,
        comments NVARCHAR(MAX) NULL,
        metadata NVARCHAR(MAX) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_approval_organization FOREIGN KEY (organization_id) 
            REFERENCES organization(id),
        CONSTRAINT FK_approval_branch FOREIGN KEY (branch_id) 
            REFERENCES branch(id),
        CONSTRAINT FK_approval_strategy FOREIGN KEY (strategy_id) 
            REFERENCES strategic_strategy(id)
    );

    CREATE INDEX IX_approval_strategy 
        ON strategic_approval_history(strategy_id);
    CREATE INDEX IX_approval_organization_branch 
        ON strategic_approval_history(organization_id, branch_id);

    PRINT '✅ Tabela strategic_approval_history criada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabela strategic_approval_history já existe';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'strategic_strategy' AND COLUMN_NAME = 'workflow_status')
BEGIN
    ALTER TABLE strategic_strategy 
        ADD workflow_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
            submitted_by_user_id INT NULL,
            submitted_at DATETIME NULL,
            rejection_reason NVARCHAR(MAX) NULL;
    PRINT '✅ Colunas workflow adicionadas';
END
ELSE
BEGIN
    PRINT '⚠️  Colunas workflow já existem';
END
GO

-- ============================================================================
-- MIGRATION 0054: Departments
-- ============================================================================
PRINT '📋 Migration 0054: Departments...';
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'department')
BEGIN
    CREATE TABLE department (
        id VARCHAR(36) PRIMARY KEY,
        organization_id INT NOT NULL,
        branch_id INT NOT NULL,
        code VARCHAR(50) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        parent_id VARCHAR(36) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME NULL,
        
        CONSTRAINT FK_department_organization FOREIGN KEY (organization_id) 
            REFERENCES organization(id),
        CONSTRAINT FK_department_branch FOREIGN KEY (branch_id) 
            REFERENCES branch(id),
        CONSTRAINT FK_department_parent FOREIGN KEY (parent_id) 
            REFERENCES department(id),
        CONSTRAINT UQ_department_code_org_branch 
            UNIQUE (code, organization_id, branch_id)
    );

    CREATE INDEX IX_department_organization_branch 
        ON department(organization_id, branch_id);
    CREATE INDEX IX_department_parent 
        ON department(parent_id);

    PRINT '✅ Tabela department criada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabela department já existe';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'strategic_action_plan' AND COLUMN_NAME = 'department_id')
BEGIN
    ALTER TABLE strategic_action_plan 
        ADD department_id VARCHAR(36) NULL;
    
    ALTER TABLE strategic_action_plan
        ADD CONSTRAINT FK_action_plan_department 
        FOREIGN KEY (department_id) REFERENCES department(id);

    PRINT '✅ Coluna department_id adicionada';
END
ELSE
BEGIN
    PRINT '⚠️  Coluna department_id já existe';
END
GO

-- ============================================================================
-- MIGRATION 0055: Migrate Department Data
-- ============================================================================
PRINT '📋 Migration 0055: Populate Department Data...';
GO

DECLARE @updated_count INT;

UPDATE strategic_action_plan
SET department_id = (
  SELECT TOP 1 id 
  FROM department 
  WHERE code = 'OPS'
    AND organization_id = strategic_action_plan.organization_id
    AND branch_id = strategic_action_plan.branch_id
    AND deleted_at IS NULL
)
WHERE department_id IS NULL
  AND deleted_at IS NULL;

SET @updated_count = @@ROWCOUNT;
PRINT '✅ ' + CAST(@updated_count AS VARCHAR(10)) + ' action plans atualizados';
GO

-- ============================================================================
-- VALIDAÇÃO FINAL
-- ============================================================================
PRINT '';
PRINT '🎯 Validação Final:';
GO

SELECT 'strategic_alert' as tabela, COUNT(*) as registros 
FROM strategic_alert
UNION ALL
SELECT 'strategic_approval_history', COUNT(*) 
FROM strategic_approval_history
UNION ALL
SELECT 'department', COUNT(*) 
FROM department;
GO

PRINT '';
PRINT '✅ MIGRATIONS CONCLUÍDAS COM SUCESSO!';
GO
EOF

echo ""
echo "✅ Migrations executadas com sucesso!"
echo ""
