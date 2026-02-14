-- Migration: 0003_seed_permissions_and_roles.sql
-- Data: 2026-02-14
-- Descricao: Seed de permissaoes RBAC e associacao com role ADMIN
--
-- Problema: Tabelas permissions e role_permissions existem mas estao vazias
-- Solucao: Inserir permissoes base e associar ao role ADMIN (id=1)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

PRINT '=== SEED: Permissions and Roles ===';

-- ============================================================
-- 1. SEED PERMISSIONS (se nao existirem)
-- ============================================================

-- Permissoes Admin
IF NOT EXISTS (SELECT 1 FROM permissions WHERE slug = 'admin.users.manage')
BEGIN
    INSERT INTO permissions (slug, description, module) VALUES 
    ('admin.users.manage', 'Gerenciar usuarios', 'admin'),
    ('admin.roles.manage', 'Gerenciar roles', 'admin'),
    ('admin.branches.manage', 'Gerenciar filiais', 'admin'),
    ('admin.settings.manage', 'Gerenciar configuracoes', 'admin');
    PRINT 'Inserted: admin permissions';
END
ELSE
BEGIN
    PRINT 'Admin permissions already exist';
END
GO

-- Permissoes Strategic
IF NOT EXISTS (SELECT 1 FROM permissions WHERE slug = 'strategic.dashboard.view')
BEGIN
    INSERT INTO permissions (slug, description, module) VALUES 
    ('strategic.dashboard.view', 'Visualizar dashboard estrategico', 'strategic'),
    ('strategic.strategies.manage', 'Gerenciar estrategias', 'strategic'),
    ('strategic.kpis.manage', 'Gerenciar KPIs', 'strategic'),
    ('strategic.goals.manage', 'Gerenciar metas', 'strategic'),
    ('strategic.okrs.manage', 'Gerenciar OKRs', 'strategic'),
    ('strategic.alerts.manage', 'Gerenciar alertas', 'strategic'),
    ('strategic.reports.view', 'Visualizar relatorios estrategicos', 'strategic');
    PRINT 'Inserted: strategic permissions';
END
ELSE
BEGIN
    PRINT 'Strategic permissions already exist';
END
GO

-- Permissoes Fiscal
IF NOT EXISTS (SELECT 1 FROM permissions WHERE slug = 'fiscal.nfe.emit')
BEGIN
    INSERT INTO permissions (slug, description, module) VALUES 
    ('fiscal.nfe.emit', 'Emitir NFe', 'fiscal'),
    ('fiscal.nfe.view', 'Visualizar NFe', 'fiscal'),
    ('fiscal.cte.emit', 'Emitir CTe', 'fiscal'),
    ('fiscal.cte.view', 'Visualizar CTe', 'fiscal'),
    ('fiscal.mdfe.emit', 'Emitir MDFe', 'fiscal'),
    ('fiscal.nfse.emit', 'Emitir NFS-e', 'fiscal'),
    ('fiscal.reports.view', 'Visualizar relatorios fiscais', 'fiscal'),
    ('fiscal.settings.manage', 'Gerenciar configuracoes fiscais', 'fiscal');
    PRINT 'Inserted: fiscal permissions';
END
ELSE
BEGIN
    PRINT 'Fiscal permissions already exist';
END
GO

-- Permissoes Financial
IF NOT EXISTS (SELECT 1 FROM permissions WHERE slug = 'financial.receivable.manage')
BEGIN
    INSERT INTO permissions (slug, description, module) VALUES 
    ('financial.receivable.manage', 'Gerenciar contas a receber', 'financial'),
    ('financial.payable.manage', 'Gerenciar contas a pagar', 'financial'),
    ('financial.bank.transfer', 'Transferencias bancarias', 'financial'),
    ('financial.reports.view', 'Visualizar relatorios financeiros', 'financial'),
    ('financial.dashboard.view', 'Visualizar dashboard financeiro', 'financial');
    PRINT 'Inserted: financial permissions';
END
ELSE
BEGIN
    PRINT 'Financial permissions already exist';
END
GO

-- Permissoes TMS
IF NOT EXISTS (SELECT 1 FROM permissions WHERE slug = 'tms.trips.manage')
BEGIN
    INSERT INTO permissions (slug, description, module) VALUES 
    ('tms.trips.manage', 'Gerenciar viagens', 'tms'),
    ('tms.delivery.manage', 'Gerenciar entregas', 'tms'),
    ('tms.freight.manage', 'Gerenciar fretes', 'tms'),
    ('tms.drivers.manage', 'Gerenciar motoristas', 'tms'),
    ('tms.vehicles.manage', 'Gerenciar veiculos', 'tms'),
    ('tms.reports.view', 'Visualizar relatorios TMS', 'tms');
    PRINT 'Inserted: tms permissions';
END
ELSE
BEGIN
    PRINT 'TMS permissions already exist';
END
GO

-- Permissoes WMS
IF NOT EXISTS (SELECT 1 FROM permissions WHERE slug = 'wms.inventory.manage')
BEGIN
    INSERT INTO permissions (slug, description, module) VALUES 
    ('wms.inventory.manage', 'Gerenciar inventario', 'wms'),
    ('wms.locations.manage', 'Gerenciar localizacoes', 'wms'),
    ('wms.movements.view', 'Visualizar movimentacoes', 'wms'),
    ('wms.reports.view', 'Visualizar relatorios WMS', 'wms');
    PRINT 'Inserted: wms permissions';
END
ELSE
BEGIN
    PRINT 'WMS permissions already exist';
END
GO

-- Permissoes CRM
IF NOT EXISTS (SELECT 1 FROM permissions WHERE slug = 'crm.leads.manage')
BEGIN
    INSERT INTO permissions (slug, description, module) VALUES 
    ('crm.leads.manage', 'Gerenciar leads', 'crm'),
    ('crm.customers.manage', 'Gerenciar clientes', 'crm'),
    ('crm.opportunities.manage', 'Gerenciar oportunidades', 'crm'),
    ('crm.activities.manage', 'Gerenciar atividades', 'crm'),
    ('crm.reports.view', 'Visualizar relatorios CRM', 'crm');
    PRINT 'Inserted: crm permissions';
END
ELSE
BEGIN
    PRINT 'CRM permissions already exist';
END
GO

-- ============================================================
-- 2. SEED ROLE_PERMISSIONS (ADMIN tem todas)
-- ============================================================

-- Associar todas as permissoes ao role ADMIN (id=1)
PRINT 'Associating all permissions to ADMIN role...';

INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id
FROM permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = 1 AND rp.permission_id = p.id
);

PRINT 'Role permissions seeded successfully!';

-- ============================================================
-- 3. VERIFICACAO
-- ============================================================

SELECT 'Total Permissions: ' + CAST(COUNT(*) AS VARCHAR) as stats FROM permissions;
SELECT 'Total Role Permissions: ' + CAST(COUNT(*) AS VARCHAR) as stats FROM role_permissions;
SELECT r.name as role, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.name;

PRINT '=== SEED COMPLETED ===';
GO
