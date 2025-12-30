-- Migration: Create Notifications Table
-- Description: Sistema de notificações em tempo real para eventos do sistema
-- Date: 2024-12-08

-- Tabela de Notificações
CREATE TABLE notifications (
  id INT PRIMARY KEY IDENTITY(1,1),
  organization_id INT NOT NULL,
  branch_id INT,
  user_id INT,  -- NULL = notificação para todos usuários da organização
  
  -- Tipo e Evento
  type VARCHAR(20) NOT NULL CHECK (type IN ('SUCCESS', 'ERROR', 'WARNING', 'INFO')),
  event VARCHAR(100) NOT NULL,  -- IMPORT_SUCCESS, NEW_DOCUMENTS, PAYABLE_DUE_SOON, etc
  
  -- Conteúdo
  title NVARCHAR(200) NOT NULL,
  message NVARCHAR(MAX),
  
  -- Dados extras (JSON)
  data NVARCHAR(MAX),  -- JSON com informações adicionais
  
  -- Link para ação
  action_url NVARCHAR(500),  -- URL para redirecionar quando clicar
  
  -- Controle
  is_read BIT DEFAULT 0,
  read_at DATETIME2,
  
  -- Auditoria
  created_at DATETIME2 DEFAULT GETDATE(),
  
  -- Foreign Keys
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_org ON notifications(organization_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = 0;
CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC);

-- Comentários
EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Sistema de notificações em tempo real para eventos importantes',
  @level0type = N'SCHEMA', @level0name = N'dbo',
  @level1type = N'TABLE', @level1name = N'notifications';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Tipo da notificação: SUCCESS, ERROR, WARNING, INFO',
  @level0type = N'SCHEMA', @level0name = N'dbo',
  @level1type = N'TABLE', @level1name = N'notifications',
  @level2type = N'COLUMN', @level2name = N'type';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Evento que gerou a notificação: IMPORT_SUCCESS, NEW_DOCUMENTS, etc',
  @level0type = N'SCHEMA', @level0name = N'dbo',
  @level1type = N'TABLE', @level1name = N'notifications',
  @level2type = N'COLUMN', @level2name = N'event';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Dados extras em formato JSON',
  @level0type = N'SCHEMA', @level0name = N'dbo',
  @level1type = N'TABLE', @level1name = N'notifications',
  @level2type = N'COLUMN', @level2name = N'data';



























