-- ==========================================
-- MIGRATION 0011: COMMERCIAL REFINEMENT
-- Refinamento do Módulo Comercial
-- ==========================================

-- 1. Adicionar novos campos em freight_tables
ALTER TABLE freight_tables 
ADD calculation_type nvarchar(30) DEFAULT 'WEIGHT_RANGE';

ALTER TABLE freight_tables 
ADD min_freight_value decimal(18, 2) DEFAULT 0.00;

-- 2. Criar tabela de rotas geográficas
CREATE TABLE freight_table_routes (
  id int IDENTITY(1,1) PRIMARY KEY,
  freight_table_id int NOT NULL,
  
  -- Rota Geográfica
  origin_uf nvarchar(2) NOT NULL,
  destination_uf nvarchar(2) NOT NULL,
  
  -- Praças Específicas (Opcional)
  origin_city_id int,
  destination_city_id int,
  
  -- Observações
  notes nvarchar(max),
  
  -- Ordem
  display_order int DEFAULT 0,
  
  -- Base
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  
  CONSTRAINT FK_freight_table_routes_table FOREIGN KEY (freight_table_id) REFERENCES freight_tables(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_freight_table_routes_table ON freight_table_routes(freight_table_id);
CREATE INDEX idx_freight_table_routes_origin ON freight_table_routes(origin_uf);
CREATE INDEX idx_freight_table_routes_destination ON freight_table_routes(destination_uf);

















