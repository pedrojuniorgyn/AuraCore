-- ==================================================================
-- FIX: Adicionar branch_id em TODAS as tabelas que não têm
-- ==================================================================
-- Data: 2026-01-24
-- Autor: AuraCore Team
-- Problema: RequestError: Invalid column name 'branch_id'
-- Tabelas afetadas: strategic_goal_cascade, strategic_action_plan, etc.
--
-- IMPORTANTE: Executar este script ANTES de reiniciar o container web
-- ==================================================================

USE AuraCore;
GO

SET NOCOUNT ON;
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '🔧 Iniciando correção de branch_id...';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
GO

-- ==================================================================
-- STRATEGIC TABLES
-- ==================================================================

-- strategic_goal_cascade
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_goal_cascade') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_goal_cascade ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_goal_cascade') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_goal_cascade_tenant ON strategic_goal_cascade (organization_id, branch_id);
  END
  PRINT '✅ strategic_goal_cascade corrigida';
END
ELSE PRINT '⏭️ strategic_goal_cascade já tem branch_id';
GO

-- strategic_action_plan (verificar se já existe, pois schema pode já ter)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_action_plan') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_action_plan ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_action_plan') AND name = 'organization_id')
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_action_plan_tenant' AND object_id = OBJECT_ID('strategic_action_plan'))
    BEGIN
      CREATE NONCLUSTERED INDEX idx_strategic_action_plan_tenant ON strategic_action_plan (organization_id, branch_id);
    END
  END
  PRINT '✅ strategic_action_plan corrigida';
END
ELSE PRINT '⏭️ strategic_action_plan já tem branch_id';
GO

-- strategic_bsc_perspective
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_bsc_perspective') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_bsc_perspective ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_bsc_perspective') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_bsc_perspective_tenant ON strategic_bsc_perspective (organization_id, branch_id);
  END
  PRINT '✅ strategic_bsc_perspective corrigida';
END
ELSE PRINT '⏭️ strategic_bsc_perspective já tem branch_id';
GO

-- strategic_goal
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_goal') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_goal ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_goal') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_goal_tenant ON strategic_goal (organization_id, branch_id);
  END
  PRINT '✅ strategic_goal corrigida';
END
ELSE PRINT '⏭️ strategic_goal já tem branch_id';
GO

-- strategic_kpi
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_kpi') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_kpi ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_kpi') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_kpi_tenant ON strategic_kpi (organization_id, branch_id);
  END
  PRINT '✅ strategic_kpi corrigida';
END
ELSE PRINT '⏭️ strategic_kpi já tem branch_id';
GO

-- strategic_kpi_history
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_kpi_history') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_kpi_history ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_kpi_history') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_kpi_history_tenant ON strategic_kpi_history (organization_id, branch_id);
  END
  PRINT '✅ strategic_kpi_history corrigida';
END
ELSE PRINT '⏭️ strategic_kpi_history já tem branch_id';
GO

-- strategic_action_plan_follow_up
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_action_plan_follow_up') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_action_plan_follow_up ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_action_plan_follow_up') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_action_plan_follow_up_tenant ON strategic_action_plan_follow_up (organization_id, branch_id);
  END
  PRINT '✅ strategic_action_plan_follow_up corrigida';
END
ELSE PRINT '⏭️ strategic_action_plan_follow_up já tem branch_id';
GO

-- strategic_pdca_cycle
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_pdca_cycle') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_pdca_cycle ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_pdca_cycle') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_pdca_cycle_tenant ON strategic_pdca_cycle (organization_id, branch_id);
  END
  PRINT '✅ strategic_pdca_cycle corrigida';
END
ELSE PRINT '⏭️ strategic_pdca_cycle já tem branch_id';
GO

-- strategic_control_item
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_control_item') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_control_item ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_control_item') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_control_item_tenant ON strategic_control_item (organization_id, branch_id);
  END
  PRINT '✅ strategic_control_item corrigida';
END
ELSE PRINT '⏭️ strategic_control_item já tem branch_id';
GO

-- strategic_verification_item
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_verification_item') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_verification_item ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_verification_item') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_verification_item_tenant ON strategic_verification_item (organization_id, branch_id);
  END
  PRINT '✅ strategic_verification_item corrigida';
END
ELSE PRINT '⏭️ strategic_verification_item já tem branch_id';
GO

-- strategic_swot_analysis
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_swot_analysis') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_swot_analysis ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_swot_analysis') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_swot_analysis_tenant ON strategic_swot_analysis (organization_id, branch_id);
  END
  PRINT '✅ strategic_swot_analysis corrigida';
END
ELSE PRINT '⏭️ strategic_swot_analysis já tem branch_id';
GO

-- strategic_war_room
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_war_room') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_war_room ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_war_room') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_war_room_tenant ON strategic_war_room (organization_id, branch_id);
  END
  PRINT '✅ strategic_war_room corrigida';
END
ELSE PRINT '⏭️ strategic_war_room já tem branch_id';
GO

-- strategic_war_room_meeting
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_war_room_meeting') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_war_room_meeting ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_war_room_meeting') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_war_room_meeting_tenant ON strategic_war_room_meeting (organization_id, branch_id);
  END
  PRINT '✅ strategic_war_room_meeting corrigida';
END
ELSE PRINT '⏭️ strategic_war_room_meeting já tem branch_id';
GO

-- strategic_idea_box
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_idea_box') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_idea_box ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_idea_box') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_idea_box_tenant ON strategic_idea_box (organization_id, branch_id);
  END
  PRINT '✅ strategic_idea_box corrigida';
END
ELSE PRINT '⏭️ strategic_idea_box já tem branch_id';
GO

-- strategic_standard_procedure
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_standard_procedure') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_standard_procedure ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_standard_procedure') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_standard_procedure_tenant ON strategic_standard_procedure (organization_id, branch_id);
  END
  PRINT '✅ strategic_standard_procedure corrigida';
END
ELSE PRINT '⏭️ strategic_standard_procedure já tem branch_id';
GO

-- strategic_user_dashboard_layout
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_user_dashboard_layout') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_user_dashboard_layout ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_user_dashboard_layout') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_user_dashboard_layout_tenant ON strategic_user_dashboard_layout (organization_id, branch_id);
  END
  PRINT '✅ strategic_user_dashboard_layout corrigida';
END
ELSE PRINT '⏭️ strategic_user_dashboard_layout já tem branch_id';
GO

-- strategic_strategy
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_strategy') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_strategy ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_strategy') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_strategy_tenant ON strategic_strategy (organization_id, branch_id);
  END
  PRINT '✅ strategic_strategy corrigida';
END
ELSE PRINT '⏭️ strategic_strategy já tem branch_id';
GO

-- strategic_okr
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_okr') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_okr ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_okr') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_okr_tenant ON strategic_okr (organization_id, branch_id);
  END
  PRINT '✅ strategic_okr corrigida';
END
ELSE PRINT '⏭️ strategic_okr já tem branch_id';
GO

-- strategic_okr_key_result
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_okr_key_result') AND name = 'branch_id')
BEGIN
  ALTER TABLE strategic_okr_key_result ADD branch_id INT NOT NULL DEFAULT 1;
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('strategic_okr_key_result') AND name = 'organization_id')
  BEGIN
    CREATE NONCLUSTERED INDEX idx_strategic_okr_key_result_tenant ON strategic_okr_key_result (organization_id, branch_id);
  END
  PRINT '✅ strategic_okr_key_result corrigida';
END
ELSE PRINT '⏭️ strategic_okr_key_result já tem branch_id';
GO

-- ==================================================================
-- VERIFICAÇÃO FINAL
-- ==================================================================
PRINT '';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '📊 Verificação Final - Tabelas strategic_* sem branch_id:';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT t.name AS 'Tabela SEM branch_id'
FROM sys.tables t
WHERE t.name LIKE 'strategic_%'
  AND NOT EXISTS (
    SELECT 1 FROM sys.columns c 
    WHERE c.object_id = t.object_id 
    AND c.name = 'branch_id'
  )
ORDER BY t.name;

PRINT '';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '✅ Correção de branch_id concluída!';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '';
PRINT '⚠️ PRÓXIMO PASSO: Reiniciar container web';
PRINT '   docker restart $(docker ps | grep web | awk ''{print $1}'')';
GO
