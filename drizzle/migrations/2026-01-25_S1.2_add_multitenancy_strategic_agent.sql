-- =============================================
-- S1.2: Adicionar Multi-tenancy em Strategic/Agent
-- Data: 2026-01-25
-- Sprint: Blindagem
-- Autor: AuraCore Team
-- 
-- IMPORTANTE: Executar em ambiente de MANUTENÇÃO
-- Backup recomendado antes da execução
-- =============================================

SET XACT_ABORT ON;
BEGIN TRANSACTION;

PRINT '=== S1.2 MIGRATION INICIANDO ===';
PRINT 'Data: ' + CONVERT(VARCHAR, GETDATE(), 120);

-- =============================================
-- 1. STRATEGIC_GOAL_CASCADE
-- =============================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_goal_cascade')
BEGIN
    -- Verificar se colunas já existem
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_goal_cascade' AND COLUMN_NAME = 'organization_id')
    BEGIN
        PRINT 'Adicionando organization_id em strategic_goal_cascade...';
        ALTER TABLE strategic_goal_cascade ADD organization_id INT NOT NULL CONSTRAINT DF_strategic_goal_cascade_org DEFAULT 1;
    END
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_goal_cascade' AND COLUMN_NAME = 'branch_id')
    BEGIN
        PRINT 'Adicionando branch_id em strategic_goal_cascade...';
        ALTER TABLE strategic_goal_cascade ADD branch_id INT NOT NULL CONSTRAINT DF_strategic_goal_cascade_branch DEFAULT 1;
    END
    
    -- Criar índice composto se não existir
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_goal_cascade_tenant' AND object_id = OBJECT_ID('strategic_goal_cascade'))
    BEGIN
        PRINT 'Criando índice idx_goal_cascade_tenant...';
        CREATE NONCLUSTERED INDEX idx_goal_cascade_tenant 
        ON strategic_goal_cascade(organization_id, branch_id)
        INCLUDE (id, created_at);
    END
    
    PRINT '✅ strategic_goal_cascade: multi-tenancy configurado';
END
ELSE
    PRINT '⚠️ strategic_goal_cascade: tabela não existe, pulando...';

-- =============================================
-- 2. STRATEGIC_PDCA_CYCLE
-- =============================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_pdca_cycle')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_pdca_cycle' AND COLUMN_NAME = 'organization_id')
    BEGIN
        PRINT 'Adicionando organization_id em strategic_pdca_cycle...';
        ALTER TABLE strategic_pdca_cycle ADD organization_id INT NOT NULL CONSTRAINT DF_strategic_pdca_cycle_org DEFAULT 1;
    END
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_pdca_cycle' AND COLUMN_NAME = 'branch_id')
    BEGIN
        PRINT 'Adicionando branch_id em strategic_pdca_cycle...';
        ALTER TABLE strategic_pdca_cycle ADD branch_id INT NOT NULL CONSTRAINT DF_strategic_pdca_cycle_branch DEFAULT 1;
    END
    
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_pdca_cycle_tenant' AND object_id = OBJECT_ID('strategic_pdca_cycle'))
    BEGIN
        PRINT 'Criando índice idx_pdca_cycle_tenant...';
        CREATE NONCLUSTERED INDEX idx_pdca_cycle_tenant 
        ON strategic_pdca_cycle(organization_id, branch_id)
        INCLUDE (id, transitioned_at);
    END
    
    PRINT '✅ strategic_pdca_cycle: multi-tenancy configurado';
END
ELSE
    PRINT '⚠️ strategic_pdca_cycle: tabela não existe, pulando...';

-- =============================================
-- 3. AGENT_MESSAGES
-- =============================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'agent_messages')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'agent_messages' AND COLUMN_NAME = 'organization_id')
    BEGIN
        PRINT 'Adicionando organization_id em agent_messages...';
        ALTER TABLE agent_messages ADD organization_id INT NOT NULL CONSTRAINT DF_agent_messages_org DEFAULT 1;
    END
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'agent_messages' AND COLUMN_NAME = 'branch_id')
    BEGIN
        PRINT 'Adicionando branch_id em agent_messages...';
        ALTER TABLE agent_messages ADD branch_id INT NOT NULL CONSTRAINT DF_agent_messages_branch DEFAULT 1;
    END
    
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_agent_messages_tenant' AND object_id = OBJECT_ID('agent_messages'))
    BEGIN
        PRINT 'Criando índice idx_agent_messages_tenant...';
        CREATE NONCLUSTERED INDEX idx_agent_messages_tenant 
        ON agent_messages(organization_id, branch_id)
        INCLUDE (id, session_id, created_at);
    END
    
    PRINT '✅ agent_messages: multi-tenancy configurado';
END
ELSE
    PRINT '⚠️ agent_messages: tabela não existe, pulando...';

-- =============================================
-- 4. RETENTION_POLICIES
-- =============================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'retention_policies')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'retention_policies' AND COLUMN_NAME = 'organization_id')
    BEGIN
        PRINT 'Adicionando organization_id em retention_policies...';
        ALTER TABLE retention_policies ADD organization_id INT NOT NULL CONSTRAINT DF_retention_policies_org DEFAULT 1;
    END
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'retention_policies' AND COLUMN_NAME = 'branch_id')
    BEGIN
        PRINT 'Adicionando branch_id em retention_policies...';
        ALTER TABLE retention_policies ADD branch_id INT NOT NULL CONSTRAINT DF_retention_policies_branch DEFAULT 1;
    END
    
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_retention_tenant' AND object_id = OBJECT_ID('retention_policies'))
    BEGIN
        PRINT 'Criando índice idx_retention_tenant...';
        CREATE NONCLUSTERED INDEX idx_retention_tenant 
        ON retention_policies(organization_id, branch_id)
        INCLUDE (id, policy_name, is_active);
    END
    
    PRINT '✅ retention_policies: multi-tenancy configurado';
END
ELSE
    PRINT '⚠️ retention_policies: tabela não existe, pulando...';

-- =============================================
-- VERIFICAÇÃO FINAL
-- =============================================
PRINT '';
PRINT '=== VERIFICAÇÃO FINAL ===';

SELECT 
    TABLE_NAME,
    COUNT(CASE WHEN COLUMN_NAME = 'organization_id' THEN 1 END) as has_org_id,
    COUNT(CASE WHEN COLUMN_NAME = 'branch_id' THEN 1 END) as has_branch_id
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME IN ('strategic_goal_cascade', 'strategic_pdca_cycle', 'agent_messages', 'retention_policies')
  AND COLUMN_NAME IN ('organization_id', 'branch_id')
GROUP BY TABLE_NAME;

PRINT '';
PRINT '=== ÍNDICES CRIADOS ===';

SELECT name, type_desc 
FROM sys.indexes 
WHERE name LIKE 'idx_%_tenant' 
  AND object_id IN (
    OBJECT_ID('strategic_goal_cascade'),
    OBJECT_ID('strategic_pdca_cycle'),
    OBJECT_ID('agent_messages'),
    OBJECT_ID('retention_policies')
  );

COMMIT TRANSACTION;

PRINT '';
PRINT '=== S1.2 MIGRATION CONCLUÍDA COM SUCESSO ===';
