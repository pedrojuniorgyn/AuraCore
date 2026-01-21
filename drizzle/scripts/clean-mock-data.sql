-- =============================================================
-- SCRIPT DE LIMPEZA DE DADOS FICTÍCIOS (MOCK DATA)
-- AuraCore ERP Logístico
-- ATENÇÃO: Executar apenas em ambiente de DESENVOLVIMENTO
-- =============================================================
-- Versão: 1.0.0
-- Data: 20/01/2026
-- Autor: AuraCore Team
-- =============================================================

-- Verificar ambiente antes de executar
-- SELECT @@SERVERNAME, DB_NAME();

-- Parâmetros
DECLARE @organizationId INT = 1; -- Ajustar conforme necessário
DECLARE @branchId INT = 1;

BEGIN TRANSACTION;

BEGIN TRY
    PRINT '=============================================================';
    PRINT 'INICIANDO LIMPEZA DE DADOS MOCK - AuraCore';
    PRINT '=============================================================';
    PRINT 'Organization ID: ' + CAST(@organizationId AS VARCHAR);
    PRINT 'Branch ID: ' + CAST(@branchId AS VARCHAR);
    PRINT '';

    -- =========================================
    -- 1. WMS - Faturamento e Eventos
    -- =========================================
    
    -- 1.1 WMS Billing Items (FK para pre_invoices)
    IF OBJECT_ID('wms_billing_items', 'U') IS NOT NULL
    BEGIN
        DELETE FROM wms_billing_items 
        WHERE organization_id = @organizationId;
        PRINT '[WMS] Billing Items limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- 1.2 WMS Billing Events
    IF OBJECT_ID('wms_billing_events', 'U') IS NOT NULL
    BEGIN
        DELETE FROM wms_billing_events 
        WHERE organization_id = @organizationId;
        PRINT '[WMS] Billing Events limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- 1.3 WMS Pre-Invoices
    IF OBJECT_ID('wms_pre_invoices', 'U') IS NOT NULL
    BEGIN
        DELETE FROM wms_pre_invoices 
        WHERE organization_id = @organizationId;
        PRINT '[WMS] Pre-Invoices limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- =========================================
    -- 2. FISCAL - Matriz Tributária e Validações
    -- =========================================
    
    -- 2.1 Tax Matrix
    IF OBJECT_ID('tax_matrix', 'U') IS NOT NULL
    BEGIN
        DELETE FROM tax_matrix 
        WHERE organization_id = @organizationId;
        PRINT '[FISCAL] Tax Matrix limpa: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- 2.2 Fiscal Validation Log
    IF OBJECT_ID('fiscal_validation_log', 'U') IS NOT NULL
    BEGIN
        DELETE FROM fiscal_validation_log 
        WHERE organization_id = @organizationId;
        PRINT '[FISCAL] Validation Log limpo: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- 2.3 Tax Credits (Créditos PIS/COFINS)
    IF OBJECT_ID('tax_credits', 'U') IS NOT NULL
    BEGIN
        DELETE FROM tax_credits 
        WHERE organization_id = @organizationId;
        PRINT '[FISCAL] Tax Credits limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- =========================================
    -- 3. CIAP - Controle de Crédito ICMS
    -- =========================================
    
    -- 3.1 CIAP Monthly Appropriation (FK para ciap_control)
    IF OBJECT_ID('ciap_monthly_appropriation', 'U') IS NOT NULL
    BEGIN
        DELETE ma FROM ciap_monthly_appropriation ma
        INNER JOIN ciap_control c ON ma.ciap_control_id = c.id
        WHERE c.organization_id = @organizationId;
        PRINT '[CIAP] Monthly Appropriation limpa: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- 3.2 CIAP Control
    IF OBJECT_ID('ciap_control', 'U') IS NOT NULL
    BEGIN
        DELETE FROM ciap_control 
        WHERE organization_id = @organizationId;
        PRINT '[CIAP] Control limpo: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- =========================================
    -- 4. RH - Jornada de Motoristas
    -- =========================================
    
    IF OBJECT_ID('driver_work_journey', 'U') IS NOT NULL
    BEGIN
        DELETE FROM driver_work_journey 
        WHERE organization_id = @organizationId;
        PRINT '[RH] Driver Work Journey limpo: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- =========================================
    -- 5. SINISTROS - Claims Management
    -- =========================================
    
    -- 5.1 Claim Documents (FK)
    IF OBJECT_ID('claim_documents', 'U') IS NOT NULL
    BEGIN
        DELETE cd FROM claim_documents cd
        INNER JOIN claims_management cm ON cd.claim_id = cm.id
        WHERE cm.organization_id = @organizationId;
        PRINT '[SINISTROS] Claim Documents limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- 5.2 Claims Management
    IF OBJECT_ID('claims_management', 'U') IS NOT NULL
    BEGIN
        DELETE FROM claims_management 
        WHERE organization_id = @organizationId;
        PRINT '[SINISTROS] Claims Management limpo: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- =========================================
    -- 6. ESG - Carbon Emissions
    -- =========================================
    
    IF OBJECT_ID('carbon_emissions', 'U') IS NOT NULL
    BEGIN
        DELETE FROM carbon_emissions 
        WHERE organization_id = @organizationId;
        PRINT '[ESG] Carbon Emissions limpo: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- =========================================
    -- 7. INTERCOMPANY - Rateios Corporativos
    -- =========================================
    
    -- 7.1 Allocation Results (FK)
    IF OBJECT_ID('intercompany_allocation_results', 'U') IS NOT NULL
    BEGIN
        DELETE ar FROM intercompany_allocation_results ar
        INNER JOIN intercompany_allocations ia ON ar.allocation_id = ia.id
        WHERE ia.organization_id = @organizationId;
        PRINT '[INTERCOMPANY] Allocation Results limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- 7.2 Intercompany Allocations
    IF OBJECT_ID('intercompany_allocations', 'U') IS NOT NULL
    BEGIN
        DELETE FROM intercompany_allocations 
        WHERE organization_id = @organizationId;
        PRINT '[INTERCOMPANY] Allocations limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- 7.3 Cost Allocation Targets
    IF OBJECT_ID('cost_allocation_targets', 'U') IS NOT NULL
    BEGIN
        DELETE FROM cost_allocation_targets 
        WHERE organization_id = @organizationId;
        PRINT '[INTERCOMPANY] Allocation Targets limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- 7.4 Cost Allocation Rules
    IF OBJECT_ID('cost_allocation_rules', 'U') IS NOT NULL
    BEGIN
        DELETE FROM cost_allocation_rules 
        WHERE organization_id = @organizationId;
        PRINT '[INTERCOMPANY] Allocation Rules limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- =========================================
    -- 8. GERENCIAL - Lançamentos de Seed
    -- =========================================
    
    -- 8.1 Management Journal Entry Lines (FK)
    IF OBJECT_ID('management_journal_entry_lines', 'U') IS NOT NULL
    BEGIN
        DELETE mjel FROM management_journal_entry_lines mjel
        INNER JOIN management_journal_entries mje ON mjel.management_journal_entry_id = mje.id
        WHERE mje.organization_id = @organizationId 
        AND (mje.description LIKE '%seed%' OR mje.description LIKE '%mock%' OR mje.description LIKE '%test%');
        PRINT '[GERENCIAL] Journal Entry Lines (seed) limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- 8.2 Management Journal Entries (marcados como seed/mock)
    IF OBJECT_ID('management_journal_entries', 'U') IS NOT NULL
    BEGIN
        DELETE FROM management_journal_entries 
        WHERE organization_id = @organizationId 
        AND (description LIKE '%seed%' OR description LIKE '%mock%' OR description LIKE '%test%');
        PRINT '[GERENCIAL] Journal Entries (seed) limpos: ' + CAST(@@ROWCOUNT AS VARCHAR);
    END

    -- =========================================
    -- COMMIT
    -- =========================================
    
    COMMIT TRANSACTION;
    
    PRINT '';
    PRINT '=============================================================';
    PRINT '✅ LIMPEZA CONCLUÍDA COM SUCESSO!';
    PRINT '=============================================================';
    PRINT '';
    PRINT 'ATENÇÃO: Execute as seguintes verificações:';
    PRINT '1. SELECT COUNT(*) FROM tax_matrix WHERE organization_id = ' + CAST(@organizationId AS VARCHAR);
    PRINT '2. SELECT COUNT(*) FROM ciap_control WHERE organization_id = ' + CAST(@organizationId AS VARCHAR);
    PRINT '3. SELECT COUNT(*) FROM intercompany_allocations WHERE organization_id = ' + CAST(@organizationId AS VARCHAR);
    PRINT '';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    
    PRINT '';
    PRINT '=============================================================';
    PRINT '❌ ERRO NA LIMPEZA!';
    PRINT '=============================================================';
    PRINT 'Mensagem: ' + ERROR_MESSAGE();
    PRINT 'Número: ' + CAST(ERROR_NUMBER() AS VARCHAR);
    PRINT 'Linha: ' + CAST(ERROR_LINE() AS VARCHAR);
    PRINT '';
    
    THROW;
END CATCH;
