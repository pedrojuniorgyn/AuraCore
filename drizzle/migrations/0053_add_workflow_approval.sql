-- Migration 0053: Add Workflow Approval to Strategic Strategy
-- Adiciona colunas de workflow de aprovação à tabela strategic_strategy
-- Cria tabelas de histórico de aprovação e delegação

-- ========================================
-- 1. Adicionar colunas de workflow à strategic_strategy
-- ========================================
ALTER TABLE strategic_strategy
ADD workflow_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'
    CHECK (workflow_status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'));

ALTER TABLE strategic_strategy
ADD submitted_at DATETIME2 NULL;

ALTER TABLE strategic_strategy
ADD submitted_by_user_id INT NULL;

ALTER TABLE strategic_strategy
ADD approved_at DATETIME2 NULL;

ALTER TABLE strategic_strategy
ADD approved_by_user_id INT NULL;

ALTER TABLE strategic_strategy
ADD rejected_at DATETIME2 NULL;

ALTER TABLE strategic_strategy
ADD rejected_by_user_id INT NULL;

ALTER TABLE strategic_strategy
ADD rejection_reason NVARCHAR(1000) NULL;

-- Índice para consultas por status de workflow
CREATE NONCLUSTERED INDEX idx_strategic_strategy_workflow_status
ON strategic_strategy (workflow_status, organization_id, branch_id)
WHERE deleted_at IS NULL;

-- ========================================
-- 2. Tabela de histórico de aprovação (Audit Trail)
-- ========================================
CREATE TABLE strategic_approval_history (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    organization_id INT NOT NULL,
    branch_id INT NOT NULL,

    strategy_id UNIQUEIDENTIFIER NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'DELEGATED')),
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,

    actor_user_id INT NOT NULL,
    comments NVARCHAR(2000) NULL,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL,

    CONSTRAINT pk_strategic_approval_history PRIMARY KEY (id),
    CONSTRAINT fk_approval_history_strategy FOREIGN KEY (strategy_id)
        REFERENCES strategic_strategy(id),
    CONSTRAINT fk_approval_history_org FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
);

-- Índices para histórico
CREATE NONCLUSTERED INDEX idx_approval_history_strategy
ON strategic_approval_history (strategy_id, organization_id, branch_id)
WHERE deleted_at IS NULL;

CREATE NONCLUSTERED INDEX idx_approval_history_actor
ON strategic_approval_history (actor_user_id, organization_id, branch_id)
WHERE deleted_at IS NULL;

-- ========================================
-- 3. Tabela de delegação de aprovação
-- ========================================
CREATE TABLE strategic_approval_delegate (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    organization_id INT NOT NULL,
    branch_id INT NOT NULL,

    delegator_user_id INT NOT NULL,
    delegate_user_id INT NOT NULL,

    start_date DATETIME2 NOT NULL,
    end_date DATETIME2 NULL,

    is_active BIT NOT NULL DEFAULT 1,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL,

    CONSTRAINT pk_strategic_approval_delegate PRIMARY KEY (id),
    CONSTRAINT fk_approval_delegate_org FOREIGN KEY (organization_id)
        REFERENCES organizations(id),
    CONSTRAINT chk_delegate_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- Índice para busca de delegações ativas
CREATE NONCLUSTERED INDEX idx_approval_delegate_active
ON strategic_approval_delegate (delegator_user_id, delegate_user_id, organization_id, branch_id, is_active)
WHERE deleted_at IS NULL AND is_active = 1;

-- ========================================
-- 4. Adicionar Foreign Keys para users (caso não existam)
-- ========================================
-- Nota: Assumindo que existe uma tabela 'users' com coluna 'id'
-- Se não existir, comentar estas constraints

ALTER TABLE strategic_strategy
ADD CONSTRAINT fk_strategy_submitted_by FOREIGN KEY (submitted_by_user_id)
    REFERENCES users(id);

ALTER TABLE strategic_strategy
ADD CONSTRAINT fk_strategy_approved_by FOREIGN KEY (approved_by_user_id)
    REFERENCES users(id);

ALTER TABLE strategic_strategy
ADD CONSTRAINT fk_strategy_rejected_by FOREIGN KEY (rejected_by_user_id)
    REFERENCES users(id);

ALTER TABLE strategic_approval_history
ADD CONSTRAINT fk_approval_history_actor FOREIGN KEY (actor_user_id)
    REFERENCES users(id);

ALTER TABLE strategic_approval_delegate
ADD CONSTRAINT fk_approval_delegate_delegator FOREIGN KEY (delegator_user_id)
    REFERENCES users(id);

ALTER TABLE strategic_approval_delegate
ADD CONSTRAINT fk_approval_delegate_delegate FOREIGN KEY (delegate_user_id)
    REFERENCES users(id);

-- ========================================
-- 5. Comentários de documentação
-- ========================================
EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Status do workflow de aprovação da estratégia',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE', @level1name = 'strategic_strategy',
    @level2type = N'COLUMN', @level2name = 'workflow_status';

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Histórico de todas as ações de aprovação em estratégias',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE', @level1name = 'strategic_approval_history';

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Delegações de permissão de aprovação entre usuários',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE', @level1name = 'strategic_approval_delegate';
