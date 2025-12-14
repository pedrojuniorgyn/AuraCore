/**
 * CARREGAR 73 CONTAS PCC - CORRIGIDO
 * 
 * Problema: Migration usa 'ANALYTIC' mas tabela espera 'ASSET'/'REVENUE'/etc
 * Solução: Converter valores ao inserir
 */

import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_HOST || "vpsw4722.publiccloud.com.br",
  database: process.env.DB_NAME as string,
  options: { encrypt: false, trustServerCertificate: true },
  port: 1433,
};

// Mapear tipo da migration para tipo real da tabela
function mapType(migrationValue: string): string {
  if (migrationValue === 'ANALYTIC') return 'EXPENSE'; // Default para analítico
  return migrationValue; // REVENUE, EXPENSE, ASSET, LIABILITY
}

// Mapear categoria
function mapCategory(migrationValue: string): string {
  const map: Record<string, string> = {
    'REVENUE': 'OPERATIONAL',
    'TAX': 'TAX',
    'DEDUCTION': 'DEDUCTION',
    'EXPENSE': 'OPERATIONAL',
    'ASSET': 'OPERATIONAL'
  };
  return map[migrationValue] || 'OPERATIONAL';
}

async function run() {
  console.log("\n🔧 CARREGANDO 73 CONTAS PCC - VERSÃO CORRIGIDA\n");

  const pool = await sql.connect(config);

  try {
    // 0) Garantir tabela base do PCC (alguns ambientes ainda não têm essa migration aplicada)
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.chart_of_accounts', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.chart_of_accounts (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          organization_id INT NOT NULL,
          code NVARCHAR(50) NOT NULL,
          name NVARCHAR(255) NOT NULL,
          description NVARCHAR(MAX) NULL,
          type NVARCHAR(30) NOT NULL,
          category NVARCHAR(50) NOT NULL,
          parent_id INT NULL,
          level INT NOT NULL CONSTRAINT DF_chart_of_accounts_level DEFAULT (0),
          is_analytical NVARCHAR(10) NOT NULL CONSTRAINT DF_chart_of_accounts_is_analytical DEFAULT ('false'),
          accepts_cost_center NVARCHAR(10) NOT NULL CONSTRAINT DF_chart_of_accounts_accepts_cc DEFAULT ('false'),
          requires_cost_center NVARCHAR(10) NOT NULL CONSTRAINT DF_chart_of_accounts_requires_cc DEFAULT ('false'),
          status NVARCHAR(20) NOT NULL CONSTRAINT DF_chart_of_accounts_status DEFAULT ('ACTIVE'),
          created_by NVARCHAR(255) NOT NULL,
          updated_by NVARCHAR(255) NULL,
          created_at DATETIME2 NULL CONSTRAINT DF_chart_of_accounts_created_at DEFAULT (GETDATE()),
          updated_at DATETIME2 NULL CONSTRAINT DF_chart_of_accounts_updated_at DEFAULT (GETDATE()),
          deleted_at DATETIME2 NULL,
          version INT NOT NULL CONSTRAINT DF_chart_of_accounts_version DEFAULT (1)
        );

        CREATE UNIQUE INDEX chart_of_accounts_code_org_idx
          ON dbo.chart_of_accounts(code, organization_id)
          WHERE deleted_at IS NULL;
      END
    `);

    // Definir as 73 contas manualmente (baseado na migration 0023)
    const accounts = [
      // GRUPO 3: RECEITAS OPERACIONAIS (8)
      { code: '3.1.1.01.001', name: 'Receita de Frete Peso (Ad Valorem)', type: 'REVENUE', category: 'REVENUE' },
      { code: '3.1.1.01.002', name: 'Receita de Frete Valor (GRIS)', type: 'REVENUE', category: 'REVENUE' },
      { code: '3.1.1.01.003', name: 'Taxa de Dificuldade de Entrega (TDE)', type: 'REVENUE', category: 'REVENUE' },
      { code: '3.1.1.01.004', name: 'Receita de Redespacho', type: 'REVENUE', category: 'REVENUE' },
      { code: '3.1.1.02.001', name: 'Receita de Armazenagem (Storage)', type: 'REVENUE', category: 'REVENUE' },
      { code: '3.1.1.02.002', name: 'Receita de Movimentação (Handling)', type: 'REVENUE', category: 'REVENUE' },
      { code: '3.1.1.02.003', name: 'Receita de Picking e Packing', type: 'REVENUE', category: 'REVENUE' },
      { code: '3.1.1.03.001', name: 'Receita de Paletização', type: 'REVENUE', category: 'REVENUE' },
      
      // GRUPO 3.2: DEDUÇÕES DA RECEITA (5)
      { code: '3.2.1.01.001', name: '(-) ICMS sobre Transportes', type: 'EXPENSE', category: 'TAX' },
      { code: '3.2.1.01.002', name: '(-) ISS sobre Armazenagem', type: 'EXPENSE', category: 'TAX' },
      { code: '3.2.1.02.001', name: '(-) PIS sobre Faturamento', type: 'EXPENSE', category: 'TAX' },
      { code: '3.2.1.02.002', name: '(-) COFINS sobre Faturamento', type: 'EXPENSE', category: 'TAX' },
      { code: '3.2.2.01.001', name: '(-) Cancelamentos de Frete', type: 'EXPENSE', category: 'DEDUCTION' },
      
      // GRUPO 4.1.1: CUSTOS VARIÁVEIS - FROTA (10)
      { code: '4.1.1.01.001', name: 'Combustível Diesel S10/S500', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.01.002', name: 'Arla 32 (Agente Redutor)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.01.003', name: 'Óleos e Lubrificantes', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.02.001', name: 'Pneus - Aquisição', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.02.002', name: 'Recapagem e Vulcanização', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.03.001', name: 'Peças de Reposição Mecânica', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.03.002', name: 'Peças Elétricas e Baterias', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.03.003', name: 'Serviços de Mecânica/Oficina Externa', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.03.004', name: 'Serviços de Socorro/Guincho', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.03.005', name: 'Conservação e Lavagem de Veículos', type: 'EXPENSE', category: 'EXPENSE' },
      
      // GRUPO 4.1.1.04: CUSTOS DE VIAGEM (4)
      { code: '4.1.1.04.001', name: 'Pedágio e Vale-Pedágio', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.04.002', name: 'Estadias e Pernoites', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.04.003', name: 'Cargas e Descargas (Chapas)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.1.05.001', name: 'Multas de Trânsito', type: 'EXPENSE', category: 'EXPENSE' },
      
      // GRUPO 4.1.2: CUSTOS DE SUBCONTRATAÇÃO (3)
      { code: '4.1.2.01.001', name: 'Frete Carreteiro (Pessoa Física/TAC)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.2.01.002', name: 'Frete Transportadora (PJ/Redespacho)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.2.01.003', name: 'Adiantamento de Frete', type: 'EXPENSE', category: 'EXPENSE' },
      
      // GRUPO 4.1.3: CUSTOS DE LOGÍSTICA/ARMAZÉM (6)
      { code: '4.1.3.01.001', name: 'Insumos de Embalagem (Stretch/Pallets)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.3.01.002', name: 'Gás GLP P20 (Empilhadeiras)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.3.02.001', name: 'Locação de Empilhadeiras', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.3.02.002', name: 'Manutenção de Equipamentos Logísticos', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.3.03.001', name: 'Aluguel de Galpões', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.1.3.03.002', name: 'Energia Elétrica (Rateio Operacional)', type: 'EXPENSE', category: 'EXPENSE' },
      
      // GRUPO 4.2: CUSTOS FIXOS E RISCOS (10)
      { code: '4.2.1.01.001', name: 'Salários Motoristas e Ajudantes', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.2.1.01.002', name: 'Horas Extras e Adicional Noturno', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.2.1.01.003', name: 'Diárias de Viagem e Alimentação', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.2.2.01.001', name: 'Seguros de Frota (Casco/RCF)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.2.2.01.002', name: 'Seguros de Carga (RCTR-C/RCF-DC)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.2.2.02.001', name: 'IPVA e Licenciamento', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.2.3.01.001', name: 'Indenizações por Avarias', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.2.3.01.002', name: 'Franquias de Seguros', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.2.4.01.001', name: 'Depreciação de Veículos e Carretas', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.2.5.01.001', name: 'Rastreamento e Monitoramento', type: 'EXPENSE', category: 'EXPENSE' },
      
      // GRUPO 4.3: CUSTOS DE OFICINA INTERNA (5)
      { code: '4.3.1.01.001', name: 'Ferramental e Utensílios de Oficina', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.3.1.01.002', name: 'Gases Industriais (Oxigênio/Acetileno)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.3.1.01.003', name: 'EPIs de Mecânicos', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.3.1.01.004', name: 'Descarte de Resíduos Sólidos', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.3.1.01.005', name: 'Descarte de Óleo Queimado (OLUC)', type: 'EXPENSE', category: 'EXPENSE' },
      
      // GRUPO 4.3.2: POSTO DE ABASTECIMENTO INTERNO (4)
      { code: '4.3.2.01.001', name: 'Manutenção de Bombas e Tanques', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.3.2.01.002', name: 'Filtros de Linha/Elementos Filtrantes', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.3.2.01.003', name: 'Análises de Qualidade de Combustível', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.3.2.02.001', name: 'Perdas e Sobras de Combustível', type: 'EXPENSE', category: 'EXPENSE' },
      
      // GRUPO 4.3.3: LAVA JATO/CONSERVAÇÃO (3)
      { code: '4.3.3.01.001', name: 'Produtos Químicos de Limpeza', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.3.3.01.002', name: 'Insumos de Limpeza (Vassouras/Escovas)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '4.3.3.01.003', name: 'Tratamento de Efluentes', type: 'EXPENSE', category: 'EXPENSE' },
      
      // GRUPO 5: DESPESAS OPERACIONAIS (8)
      { code: '5.1.1.01.001', name: 'Aluguel e Manutenção de Softwares', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '5.1.1.01.002', name: 'Telefonia e Dados Móveis', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '5.1.1.01.003', name: 'Energia Elétrica (Administrativo)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '5.1.1.01.004', name: 'Aluguel de Imóveis', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '5.1.2.01.001', name: 'Serviços Contábeis e Auditoria', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '5.1.2.01.002', name: 'Serviços Jurídicos', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '5.1.3.01.001', name: 'Material de Escritório', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '5.1.4.01.001', name: 'Treinamentos e Cursos', type: 'EXPENSE', category: 'EXPENSE' },
      
      // GRUPO 5.2: DESPESAS COMERCIAIS (4)
      { code: '5.2.1.01.001', name: 'Comissões sobre Vendas', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '5.2.1.02.001', name: 'Brindes e Presentes Corporativos', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '5.2.1.02.002', name: 'Viagens e Hospedagens (Comercial)', type: 'EXPENSE', category: 'EXPENSE' },
      { code: '5.2.1.03.001', name: 'Marketing Digital', type: 'EXPENSE', category: 'EXPENSE' },
      
      // CRÉDITOS FISCAIS (3)
      { code: '1.1.4.01.001', name: 'PIS a Recuperar (Créditos)', type: 'ASSET', category: 'ASSET' },
      { code: '1.1.4.01.002', name: 'COFINS a Recuperar (Créditos)', type: 'ASSET', category: 'ASSET' },
      { code: '1.1.4.02.001', name: 'ICMS a Compensar', type: 'ASSET', category: 'ASSET' },
    ];

    console.log(`📊 Total de contas a inserir: ${accounts.length}\n`);

    let inserted = 0;
    for (const acc of accounts) {
      try {
        await pool.request()
          .input('code', sql.NVarChar, acc.code)
          .input('name', sql.NVarChar, acc.name)
          .input('type', sql.NVarChar, acc.type)
          .input('category', sql.NVarChar, mapCategory(acc.category))
          .query(`
            IF NOT EXISTS (
              SELECT 1 FROM chart_of_accounts 
              WHERE code = @code AND organization_id = 1 AND deleted_at IS NULL
            )
            BEGIN
              INSERT INTO chart_of_accounts (
                organization_id, code, name, type, category, 
                parent_id, level, is_analytical, status, 
                created_by, updated_by, created_at, updated_at, version
              )
              VALUES (
                1, @code, @name, @type, @category,
                NULL, 4, '1', 'ACTIVE',
                'MIGRATION_0023', 'MIGRATION_0023', GETDATE(), GETDATE(), 1
              )
            END
          `);
        
        inserted++;
        process.stdout.write(`\r   ✅ Inseridas: ${inserted}/${accounts.length} contas`);
      } catch (e: any) {
        console.log(`\n   ❌ ${acc.code}: ${e.message.substring(0, 60)}`);
      }
    }

    const result = await pool.request().query(`
      SELECT COUNT(*) as total 
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL
    `);

    console.log(`\n\n📊 Total de contas PCC no banco: ${result.recordset[0].total}`);

    if (result.recordset[0].total >= 73) {
      console.log("✅ 73 contas PCC carregadas com sucesso!\n");
    } else {
      console.log(`⚠️  Esperado: 73+ contas, obtido: ${result.recordset[0].total}\n`);
    }

    // Mostrar amostra
    const sample = await pool.request().query(`
      SELECT TOP 10 code, name, type 
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL 
      ORDER BY code
    `);

    console.log("📋 Amostra (10 primeiras):");
    sample.recordset.forEach((r: any) => {
      console.log(`   ${r.code?.padEnd(20)} ${r.name?.substring(0, 45)}`);
    });
    console.log("");

  } catch (error: any) {
    console.error("\n❌ ERRO:", error.message);
    throw error;
  } finally {
    await pool.close();
  }
}

run().catch(console.error);




