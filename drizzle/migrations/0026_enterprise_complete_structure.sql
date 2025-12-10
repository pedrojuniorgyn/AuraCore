-- ============================================================================
-- MIGRATION 0026: ESTRUTURA DEFINITIVA ENTERPRISE - NÍVEL SAP/ORACLE
-- ============================================================================
-- Cobre 100% operação de grandes transportadoras (JSL, Braspress, Tegma)
-- Data: 2024-12-10
-- Módulos: Backoffice, RH, Fiscal, WMS, GR, CIAP, Sinistros, Intercompany, ESG
-- ============================================================================

-- ============================================================================
-- PARTE 1: BACKOFFICE - DEPARTAMENTOS DE APOIO
-- ============================================================================

-- 1.1 OFICINA MECÂNICA INTERNA (Grupo 4.3.1)
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '4.3', 'CUSTOS DE APOIO OPERACIONAL', 'Custos dos departamentos de suporte', 'EXPENSE', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.3.1', 'OFICINA MECÂNICA INTERNA', 'Custos para manter a oficina operando', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.1' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.3.1.01', 'Consumíveis e Insumos - Oficina', 'Materiais de consumo direto', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.1.01' AND organization_id = 1);

-- Contas Analíticas da Oficina
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '4.3.1.01.001', 'Ferramental e Utensílios de Oficina', 'Chaves, macacos hidráulicos, pneumáticas', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.1.01.002', 'Consumo de Gases Industriais', 'Oxigênio, Acetileno para soldas', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.1.01.003', 'EPIs de Mecânicos e Soldadores', 'Luvas, óculos, botas, máscaras', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.1.01.004', 'Descarte de Resíduos Sólidos', 'Coleta estopas, filtros velhos', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.1.01.005', 'Descarte de Óleo Queimado (OLUC)', 'Rerrefino obrigatório', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.1.01.006', 'Materiais de Fixação', 'Parafusos, porcas, arruelas', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.3.1.02', 'Manutenção de Equipamentos - Oficina', 'Manutenção da infraestrutura', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.1.02' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.3.1.02.001', 'Manutenção de Equipamentos da Oficina', 'Elevador, compressor, prensa', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.1.02' AND organization_id = 1), TRUE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.1.02.001' AND organization_id = 1);

-- 1.2 POSTO DE COMBUSTÍVEL INTERNO (Grupo 4.3.2)
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.3.2', 'POSTO DE ABASTECIMENTO INTERNO', 'Custos de manter o posto operando', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.2' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.3.2.01', 'Manutenção Posto - Equipamentos', 'Bombas, tanques, filtros', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.2' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.2.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '4.3.2.01.001', 'Manutenção de Bombas e Tanques', 'Troca bicos, mangueiras, aferição', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.2.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.2.01.002', 'Filtros de Linha / Elementos Filtrantes', 'Filtros da bomba', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.2.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.2.01.003', 'Análises de Qualidade de Combustível', 'Testes laboratório ANP', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.2.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.2.01.004', 'Licenciamento Ambiental (IBAMA/CETESB)', 'Taxas operação posto', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.2.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.3.2.02', 'Perdas e Ajustes - Posto', 'Variações volumétricas', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.2' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.2.02' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '4.3.2.02.001', 'Perdas e Sobras de Combustível', 'Evaporação, dilatação térmica', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.2.02' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.2.02.002', 'Diferença Estoque Físico x Contábil', 'Ajuste inventário tanque', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.2.02' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

-- 1.3 LAVA JATO / CONSERVAÇÃO (Grupo 4.3.3)
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.3.3', 'LAVA JATO E CONSERVAÇÃO', 'Apresentação e higiene da frota', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.3' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.3.3.01', 'Insumos de Limpeza', 'Produtos químicos e materiais', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.3' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.3.3.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '4.3.3.01.001', 'Produtos Químicos (Shampoo/Desengraxante)', 'Metasil, solupan, ativado', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.3.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.3.01.002', 'Insumos de Limpeza (Vassouras/Escovas)', 'Materiais consumo rápido', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.3.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.3.01.003', 'Tratamento de Efluentes', 'Caixa separadora, decantação', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.3.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.3.01.004', 'Manutenção de Lavadoras Alta Pressão', 'Karcher, pistões, mangueiras', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.3.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.3.3.01.005', 'Compra de Água Industrial', 'Caminhão pipa quando necessário', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.3.3.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

-- 1.4 COMERCIAL / VENDAS (Grupo 5.2.1)
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '5.2', 'DESPESAS COMERCIAIS', 'Custos de vendas e marketing', 'EXPENSE', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.2' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.2.1', 'DEPARTAMENTO COMERCIAL', 'Despesas área comercial', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.2.1' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.2.1.01', 'Comissões e Incentivos', 'Remuneração variável', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.2.1.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '5.2.1.01.001', 'Comissões sobre Vendas (Internas)', 'Vendedores CLT', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.2.1.01.002', 'Comissões de Representantes (RPA/PJ)', 'Terceiros indicação', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.2.1.02', 'Marketing e Relacionamento', 'Brindes, eventos, viagens', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.2.1.02' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '5.2.1.02.001', 'Brindes e Presentes Corporativos', 'Agendas, canetas, cestas', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2.1.02' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.2.1.02.002', 'Viagens e Hospedagens (Comercial)', 'Visitas clientes', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2.1.02' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.2.1.02.003', 'Verbas de Representação / Reembolso KM', 'Almoços clientes, KM', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2.1.02' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.2.1.03', 'Marketing Digital e Eventos', 'Publicidade e presença', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.2.1.03' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '5.2.1.03.001', 'Marketing Digital e Website', 'Google Ads, LinkedIn', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2.1.03' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.2.1.03.002', 'Feiras, Eventos e Patrocínios', 'Intermodal, Fenatran', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.2.1.03' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

-- 1.5 ADMINISTRATIVO / RH (Grupo 5.1)
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '5.1', 'DESPESAS ADMINISTRATIVAS', 'Estrutura administrativa', 'EXPENSE', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.1.1', 'INFRAESTRUTURA PREDIAL', 'Custos prediais', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1.1' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.1.1.01', 'Utilidades e Ocupação', 'Energia, aluguel, limpeza', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1.1.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '5.1.1.01.001', 'Energia Elétrica (Rateio ADM)', 'Conta luz escritório', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.1.1.01.002', 'Aluguéis de Imóveis e Condomínios', 'Prédio administrativo', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.1.1.01.003', 'Limpeza e Conservação Predial', 'Terceirizada ou materiais', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.1.1.01.004', 'Segurança Patrimonial e Portaria', 'Vigilância, câmeras', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.1.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.1.2', 'SERVIÇOS PROFISSIONAIS', 'Consultorias externas', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1.2' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.1.2.01', 'Serviços Especializados', 'Contabilidade, jurídico', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.2' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1.2.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '5.1.2.01.001', 'Serviços Contábeis e Auditoria', 'Consultoria externa', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.2.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.1.2.01.002', 'Serviços Jurídicos e Cartoriais', 'Advogados, custas', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.2.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.1.3', 'MATERIAIS DE CONSUMO', 'Expediente e copa', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1.3' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.1.3.01', 'Escritório e Copa', 'Materiais uso diário', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.3' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1.3.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '5.1.3.01.001', 'Material de Escritório e Expediente', 'Papel, toner, canetas', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.3.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.1.3.01.002', 'Copa e Cozinha (Café/Água)', 'Cafezinho e açúcar', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.3.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.1.4', 'RECURSOS HUMANOS', 'Desenvolvimento pessoal', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1.4' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.1.4.01', 'Treinamento e Bem-Estar', 'Capacitação e clima', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.4' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1.4.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '5.1.4.01.001', 'Treinamentos e Cursos (RH)', 'Capacitação equipe', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.4.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.1.4.01.002', 'Confraternizações e Endomarketing', 'Festa fim ano', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.4.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.1.4.01.003', 'Exames Médicos (Admissional/Demissional)', 'PCMSO, Toxicológico', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.4.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

-- ============================================================================
-- CENTROS DE CUSTO DEPARTAMENTAIS
-- ============================================================================

INSERT INTO financial_cost_centers (organization_id, code, name, description, type, is_analytical, status)
SELECT * FROM (VALUES
  (1, 'CC-901', 'OFICINA MECÂNICA CENTRAL', 'Manutenção interna da frota', 'EXPENSE', TRUE, 'ACTIVE'),
  (1, 'CC-902', 'POSTO DE ABASTECIMENTO INTERNO', 'Gestão do ponto de abastecimento', 'EXPENSE', TRUE, 'ACTIVE'),
  (1, 'CC-903', 'LAVA JATO / CONSERVAÇÃO', 'Higiene e apresentação da frota', 'EXPENSE', TRUE, 'ACTIVE'),
  (1, 'CC-904', 'BORRACHARIA INTERNA', 'Gestão de pneus e recapagens', 'EXPENSE', TRUE, 'ACTIVE'),
  (1, 'CC-910', 'PORTARIA E SEGURANÇA', 'Controle acesso e vigilância', 'EXPENSE', TRUE, 'ACTIVE'),
  (1, 'CC-920', 'RECURSOS HUMANOS / D.P.', 'Gestão de pessoas', 'EXPENSE', TRUE, 'ACTIVE'),
  (1, 'CC-930', 'TECNOLOGIA DA INFORMAÇÃO', 'TI e sistemas', 'EXPENSE', TRUE, 'ACTIVE'),
  (1, 'CC-940', 'COMERCIAL E VENDAS', 'Geração de receita', 'REVENUE', TRUE, 'ACTIVE'),
  (1, 'CC-950', 'FINANCEIRO / CONTROLADORIA', 'Gestão financeira', 'EXPENSE', TRUE, 'ACTIVE'),
  (1, 'CC-999', 'DIRETORIA EXECUTIVA', 'Alta gestão', 'EXPENSE', TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, type, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_cost_centers WHERE code = v.code AND organization_id = 1);

-- ============================================================================
-- TABELA DE APROVADORES POR CENTRO DE CUSTO
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'cost_center_approvers') AND type = 'U')
BEGIN
CREATE TABLE cost_center_approvers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    cost_center_id INT NOT NULL,
    approver_role VARCHAR(100) NOT NULL,
    approver_name VARCHAR(255),
    approval_limit DECIMAL(15,2),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_cost_center_approver UNIQUE(cost_center_id, approver_role)
);
END;

-- ============================================================================
-- TABELA DE REGRAS DE RATEIO AUTOMÁTICO
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'cost_allocation_rules') AND type = 'U')
BEGIN
CREATE TABLE cost_allocation_rules (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    source_account_id INT NULL,
    source_cost_center_id INT NULL,
    allocation_method VARCHAR(50) NOT NULL,
    allocation_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    is_active BIT DEFAULT 1,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END;

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'cost_allocation_targets') AND type = 'U')
BEGIN
CREATE TABLE cost_allocation_targets (
    id INT IDENTITY(1,1) PRIMARY KEY,
    allocation_rule_id INT NOT NULL,
    target_cost_center_id INT NOT NULL,
    allocation_percentage DECIMAL(5,2),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
);
END;

-- Continua na próxima parte devido ao tamanho...

