-- Seed para criar Goal de teste
-- Execute este SQL no SQL Server Management Studio ou Azure Data Studio

-- 1. Criar perspective se não existir
DECLARE @perspectiveId VARCHAR(36) = NEWID();

IF NOT EXISTS (SELECT 1 FROM bsc_perspective WHERE code = 'TEST_PERSP')
BEGIN
    INSERT INTO bsc_perspective (
        id, 
        organization_id, 
        branch_id, 
        strategy_id,
        code, 
        name, 
        description,
        display_order,
        color,
        created_by,
        created_at, 
        updated_at
    ) VALUES (
        @perspectiveId,
        1, -- organization_id (ajuste se necessário)
        1, -- branch_id (ajuste se necessário)
        (SELECT TOP 1 id FROM strategy WHERE deleted_at IS NULL), -- Pegar primeira strategy disponível
        'TEST_PERSP',
        'Perspectiva de Teste',
        'Perspectiva criada para teste de Goal Detail',
        99,
        '#FF6B6B',
        'system',
        GETDATE(),
        GETDATE()
    );
    PRINT 'Perspective criada: ' + CAST(@perspectiveId AS VARCHAR(36));
END
ELSE
BEGIN
    SET @perspectiveId = (SELECT id FROM bsc_perspective WHERE code = 'TEST_PERSP');
    PRINT 'Perspective já existe: ' + CAST(@perspectiveId AS VARCHAR(36));
END

-- 2. Criar goal de teste
DECLARE @goalId VARCHAR(36) = NEWID();

INSERT INTO strategic_goal (
    id,
    organization_id,
    branch_id,
    perspective_id,
    parent_goal_id,
    code,
    description,
    cascade_level,
    target_value,
    current_value,
    baseline_value,
    unit,
    polarity,
    weight,
    owner_user_id,
    owner_branch_id,
    start_date,
    due_date,
    status,
    map_position_x,
    map_position_y,
    created_by,
    created_at,
    updated_at,
    deleted_at
) VALUES (
    @goalId,
    1, -- organization_id
    1, -- branch_id
    @perspectiveId,
    NULL, -- parent_goal_id
    'TEST001',
    'Goal de Teste - Aumentar vendas em 20%',
    'CEO', -- cascade_level: CEO | DIRECTOR | MANAGER | TEAM
    100, -- target_value
    35, -- current_value (35% de progresso)
    0, -- baseline_value
    '%',
    'UP', -- polarity
    25.00, -- weight
    'system',
    1, -- owner_branch_id
    DATEADD(MONTH, -6, GETDATE()), -- start_date (6 meses atrás)
    DATEADD(MONTH, 6, GETDATE()), -- due_date (6 meses no futuro)
    'IN_PROGRESS', -- status
    100, -- map_position_x
    100, -- map_position_y
    'system',
    GETDATE(),
    GETDATE(),
    NULL -- deleted_at
);

-- 3. Exibir resultado
PRINT '';
PRINT '✅ Goal criado com sucesso!';
PRINT 'Goal ID: ' + CAST(@goalId AS VARCHAR(36));
PRINT 'Perspective ID: ' + CAST(@perspectiveId AS VARCHAR(36));
PRINT '';
PRINT '📍 Acesse no browser:';
PRINT 'http://localhost:3000/strategic/goals/' + CAST(@goalId AS VARCHAR(36));
PRINT '';
PRINT '🧪 Teste na API:';
PRINT 'curl http://localhost:3000/api/strategic/goals/' + CAST(@goalId AS VARCHAR(36));
PRINT '';

-- 4. Verificar goal criado
SELECT 
    id,
    code,
    description,
    cascade_level,
    current_value,
    target_value,
    status,
    organization_id,
    branch_id
FROM strategic_goal 
WHERE id = @goalId;
