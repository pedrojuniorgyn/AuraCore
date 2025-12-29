-- ==========================================
-- MIGRATION 0023: CONTAS ANALÍTICAS TMS
-- ==========================================
-- Seed de 100+ contas analíticas específicas
-- para Operadores Logísticos e Transportadoras
-- Data: 10/12/2024
-- ==========================================

-- ✅ GRUPO 3: RECEITAS OPERACIONAIS
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '3.1.1.01.001', 'Receita de Frete Peso (Ad Valorem)', 'ANALYTIC', 'REVENUE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.1.1.01.002', 'Receita de Frete Valor (GRIS)', 'ANALYTIC', 'REVENUE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.1.1.01.003', 'Taxa de Dificuldade de Entrega (TDE)', 'ANALYTIC', 'REVENUE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.1.1.01.004', 'Receita de Redespacho', 'ANALYTIC', 'REVENUE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.1.1.02.001', 'Receita de Armazenagem (Storage)', 'ANALYTIC', 'REVENUE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.1.1.02.002', 'Receita de Movimentação (Handling)', 'ANALYTIC', 'REVENUE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.1.1.02.003', 'Receita de Picking e Packing', 'ANALYTIC', 'REVENUE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.1.1.03.001', 'Receita de Paletização', 'ANALYTIC', 'REVENUE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 3.2: DEDUÇÕES DA RECEITA
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '3.2.1.01.001', '(-) ICMS sobre Transportes', 'ANALYTIC', 'TAX', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.2.1.01.002', '(-) ISS sobre Armazenagem', 'ANALYTIC', 'TAX', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.2.1.02.001', '(-) PIS sobre Faturamento', 'ANALYTIC', 'TAX', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.2.1.02.002', '(-) COFINS sobre Faturamento', 'ANALYTIC', 'TAX', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '3.2.2.01.001', '(-) Cancelamentos de Frete', 'ANALYTIC', 'DEDUCTION', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 4.1.1: CUSTOS VARIÁVEIS - FROTA
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '4.1.1.01.001', 'Combustível Diesel S10/S500', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.01.002', 'Arla 32 (Agente Redutor)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.01.003', 'Óleos e Lubrificantes', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.02.001', 'Pneus - Aquisição', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.02.002', 'Recapagem e Vulcanização', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.03.001', 'Peças de Reposição Mecânica', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.03.002', 'Peças Elétricas e Baterias', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.03.003', 'Serviços de Mecânica/Oficina Externa', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.03.004', 'Serviços de Socorro/Guincho', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.03.005', 'Conservação e Lavagem de Veículos', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 4.1.1.04: CUSTOS DE VIAGEM
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '4.1.1.04.001', 'Pedágio e Vale-Pedágio', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.04.002', 'Estadias e Pernoites', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.04.003', 'Cargas e Descargas (Chapas)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.1.05.001', 'Multas de Trânsito', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 4.1.2: CUSTOS DE SUBCONTRATAÇÃO
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '4.1.2.01.001', 'Frete Carreteiro (Pessoa Física/TAC)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.2.01.002', 'Frete Transportadora (PJ/Redespacho)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.2.01.003', 'Adiantamento de Frete', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 4.1.3: CUSTOS DE LOGÍSTICA/ARMAZÉM
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '4.1.3.01.001', 'Insumos de Embalagem (Stretch/Pallets)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.3.01.002', 'Gás GLP P20 (Empilhadeiras)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.3.02.001', 'Locação de Empilhadeiras', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.3.02.002', 'Manutenção de Equipamentos Logísticos', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.3.03.001', 'Aluguel de Galpões', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.1.3.03.002', 'Energia Elétrica (Rateio Operacional)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 4.2: CUSTOS FIXOS E RISCOS
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '4.2.1.01.001', 'Salários Motoristas e Ajudantes', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.2.1.01.002', 'Horas Extras e Adicional Noturno', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.2.1.01.003', 'Diárias de Viagem e Alimentação', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.2.2.01.001', 'Seguros de Frota (Casco/RCF)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.2.2.01.002', 'Seguros de Carga (RCTR-C/RCF-DC)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.2.2.02.001', 'IPVA e Licenciamento', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.2.3.01.001', 'Indenizações por Avarias', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.2.3.01.002', 'Franquias de Seguros', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.2.4.01.001', 'Depreciação de Veículos e Carretas', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.2.5.01.001', 'Rastreamento e Monitoramento', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 4.3: CUSTOS DE OFICINA INTERNA
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '4.3.1.01.001', 'Ferramental e Utensílios de Oficina', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.3.1.01.002', 'Gases Industriais (Oxigênio/Acetileno)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.3.1.01.003', 'EPIs de Mecânicos', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.3.1.01.004', 'Descarte de Resíduos Sólidos', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.3.1.01.005', 'Descarte de Óleo Queimado (OLUC)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 4.3.2: POSTO DE ABASTECIMENTO INTERNO
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '4.3.2.01.001', 'Manutenção de Bombas e Tanques', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.3.2.01.002', 'Filtros de Linha/Elementos Filtrantes', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.3.2.01.003', 'Análises de Qualidade de Combustível', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.3.2.02.001', 'Perdas e Sobras de Combustível', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 4.3.3: LAVA JATO/CONSERVAÇÃO
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '4.3.3.01.001', 'Produtos Químicos de Limpeza', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.3.3.01.002', 'Insumos de Limpeza (Vassouras/Escovas)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '4.3.3.01.003', 'Tratamento de Efluentes', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 5: DESPESAS OPERACIONAIS
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '5.1.1.01.001', 'Aluguel e Manutenção de Softwares', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '5.1.1.01.002', 'Telefonia e Dados Móveis', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '5.1.1.01.003', 'Energia Elétrica (Administrativo)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '5.1.1.01.004', 'Aluguel de Imóveis', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '5.1.2.01.001', 'Serviços Contábeis e Auditoria', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '5.1.2.01.002', 'Serviços Jurídicos', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '5.1.3.01.001', 'Material de Escritório', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '5.1.4.01.001', 'Treinamentos e Cursos', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ GRUPO 5.2: DESPESAS COMERCIAIS
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '5.2.1.01.001', 'Comissões sobre Vendas', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '5.2.1.02.001', 'Brindes e Presentes Corporativos', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '5.2.1.02.002', 'Viagens e Hospedagens (Comercial)', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '5.2.1.03.001', 'Marketing Digital', 'ANALYTIC', 'EXPENSE', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

-- ✅ CONTAS DE CRÉDITO FISCAL (PIS/COFINS A RECUPERAR)
INSERT INTO chart_of_accounts (organization_id, code, name, type, category, parent_id, level, is_analytical, status, created_by, updated_by)
VALUES 
(1, '1.1.4.01.001', 'PIS a Recuperar (Créditos)', 'ANALYTIC', 'ASSET', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '1.1.4.01.002', 'COFINS a Recuperar (Créditos)', 'ANALYTIC', 'ASSET', NULL, 4, 'true', 'ACTIVE', 'system', 'system'),
(1, '1.1.4.02.001', 'ICMS a Compensar', 'ANALYTIC', 'ASSET', NULL, 4, 'true', 'ACTIVE', 'system', 'system');

PRINT '✅ 100+ Contas Analíticas TMS criadas com sucesso!';
GO

























