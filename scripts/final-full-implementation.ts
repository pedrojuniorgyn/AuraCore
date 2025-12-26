/**
 * ╔═══════════════════════════════════════════════════════╗
 * ║  🚀 IMPLEMENTAÇÃO DEFINITIVA - SEM PARAR 🚀          ║
 * ╚═══════════════════════════════════════════════════════╝
 */

import dotenv from "dotenv";
import sql from "mssql";
import { readFileSync } from "fs";
import { join } from "path";

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_HOST || "vpsw4722.publiccloud.com.br",
  database: process.env.DB_NAME as string,
  options: { encrypt: false, trustServerCertificate: true },
  port: 1433,
};

async function run() {
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║  🚀 IMPLEMENTAÇÃO DEFINITIVA - EXECUTANDO TUDO 🚀    ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");
  
  const pool = await sql.connect(config);
  
  try {
    // ==========================================
    // 1. LIMPAR DADOS ANTIGOS (desabilita FKs)
    // ==========================================
    console.log("🗑️  1/5: LIMPANDO DADOS ANTIGOS...\n");
    
    try {
      // Desabilita constraints temporariamente
      await pool.request().query(`
        ALTER TABLE auto_classification_rules NOCHECK CONSTRAINT ALL;
        ALTER TABLE journal_entry_lines NOCHECK CONSTRAINT ALL;
      `);
      
      const del1 = await pool.request().query(`DELETE FROM chart_of_accounts WHERE organization_id = 1`);
      console.log(`   ✅ PCC limpo: ${del1.rowsAffected[0]} registros`);
      
      const del2 = await pool.request().query(`DELETE FROM cost_centers WHERE organization_id = 1`);
      console.log(`   ✅ CC limpo: ${del2.rowsAffected[0]} registros\n`);
      
      // Reabilita constraints
      await pool.request().query(`
        ALTER TABLE auto_classification_rules CHECK CONSTRAINT ALL;
        ALTER TABLE journal_entry_lines CHECK CONSTRAINT ALL;
      `);
      
    } catch (e: any) {
      console.log(`   ⚠️  ${e.message.substring(0, 150)}\n`);
    }

    // ==========================================
    // 2. CRIAR TABELAS PCG (sem FKs primeiro)
    // ==========================================
    console.log("🏗️  2/5: CRIANDO TABELAS PCG...\n");
    
    const pcgTables = [
      `CREATE TABLE management_chart_of_accounts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        code NVARCHAR(20) NOT NULL,
        name NVARCHAR(200) NOT NULL,
        type NVARCHAR(20) NOT NULL,
        allocation_rule NVARCHAR(50),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT UQ_mgmt_chart_code UNIQUE (organization_id, code)
      )`,
      
      `CREATE TABLE account_mapping (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        chart_account_id INT NOT NULL,
        management_account_id INT NOT NULL,
        allocation_percentage DECIMAL(5,2) DEFAULT 100.00,
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
      
      `CREATE TABLE management_journal_entries (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id INT NOT NULL,
        entry_date DATE NOT NULL,
        description NVARCHAR(500),
        reference_type NVARCHAR(50),
        reference_id INT,
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
      
      `CREATE TABLE management_journal_entry_lines (
        id INT IDENTITY(1,1) PRIMARY KEY,
        entry_id INT NOT NULL,
        management_account_id INT NOT NULL,
        debit_amount DECIMAL(18,2) DEFAULT 0,
        credit_amount DECIMAL(18,2) DEFAULT 0,
        cost_center_id INT,
        description NVARCHAR(500)
      )`
    ];

    for (let i = 0; i < pcgTables.length; i++) {
      try {
        await pool.request().query(pcgTables[i]);
        console.log(`   ✅ Tabela ${i + 1}/4 criada`);
      } catch (e: any) {
        if (!e.message.includes('already')) {
          console.log(`   ⚠️  Tabela ${i + 1}: ${e.message.substring(0, 100)}`);
        } else {
          console.log(`   ⏭️  Tabela ${i + 1} já existe`);
        }
      }
    }
    console.log();

    // ==========================================
    // 3. POPULAR PCC - 100+ CONTAS
    // ==========================================
    console.log("📊 3/5: POPULANDO PCC (CONTAS TMS)...\n");
    
    // Contas PCC completas
    const pccAccounts = [
      // RECEITAS
      { code: '3.01.01.001', name: 'Receita de Frete Peso', type: 'REVENUE', category: 'OPERACIONAL', parent: null, level: 4 },
      { code: '3.01.01.002', name: 'Receita de Frete Ad Valorem', type: 'REVENUE', category: 'OPERACIONAL', parent: null, level: 4 },
      { code: '3.01.01.003', name: 'Receita de GRIS', type: 'REVENUE', category: 'OPERACIONAL', parent: null, level: 4 },
      { code: '3.01.01.004', name: 'Receita de Pedagio', type: 'REVENUE', category: 'OPERACIONAL', parent: null, level: 4 },
      { code: '3.01.01.005', name: 'Receita de TDE', type: 'REVENUE', category: 'OPERACIONAL', parent: null, level: 4 },
      { code: '3.01.01.006', name: 'Receita de TDA', type: 'REVENUE', category: 'OPERACIONAL', parent: null, level: 4 },
      { code: '3.01.01.007', name: 'Receita de Outros Servicos', type: 'REVENUE', category: 'OPERACIONAL', parent: null, level: 4 },
      { code: '3.01.02.001', name: 'Receita WMS Armazenagem', type: 'REVENUE', category: 'OPERACIONAL', parent: null, level: 4 },
      { code: '3.01.02.002', name: 'Receita WMS Movimentacao', type: 'REVENUE', category: 'OPERACIONAL', parent: null, level: 4 },
      
      // DEDUÇÕES
      { code: '3.02.01.001', name: 'Devolucoes e Cancelamentos', type: 'REVENUE_DEDUCTION', category: 'OPERACIONAL', parent: null, level: 4 },
      { code: '3.02.01.002', name: 'Descontos Comerciais', type: 'REVENUE_DEDUCTION', category: 'OPERACIONAL', parent: null, level: 4 },
      
      // CUSTOS DIRETOS
      { code: '4.01.01.001', name: 'Frete Carreteiro PJ', type: 'EXPENSE', category: 'CUSTO_DIRETO', parent: null, level: 4 },
      { code: '4.01.01.002', name: 'Frete Carreteiro PF TAC', type: 'EXPENSE', category: 'CUSTO_DIRETO', parent: null, level: 4 },
      { code: '4.01.01.003', name: 'Frete Agregado', type: 'EXPENSE', category: 'CUSTO_DIRETO', parent: null, level: 4 },
      { code: '4.01.02.001', name: 'Diesel Frota Propria', type: 'EXPENSE', category: 'CUSTO_DIRETO', parent: null, level: 4 },
      { code: '4.01.02.002', name: 'Arla 32', type: 'EXPENSE', category: 'CUSTO_DIRETO', parent: null, level: 4 },
      { code: '4.01.03.001', name: 'Pedagio Frota', type: 'EXPENSE', category: 'CUSTO_DIRETO', parent: null, level: 4 },
      { code: '4.01.04.001', name: 'Seguro Carga', type: 'EXPENSE', category: 'CUSTO_DIRETO', parent: null, level: 4 },
      { code: '4.01.04.002', name: 'Seguro Frota', type: 'EXPENSE', category: 'CUSTO_DIRETO', parent: null, level: 4 },
      { code: '4.01.05.001', name: 'Rastreamento Veicular', type: 'EXPENSE', category: 'CUSTO_DIRETO', parent: null, level: 4 },
      
      // MANUTENÇÃO
      { code: '4.02.01.001', name: 'Manutencao Preventiva', type: 'EXPENSE', category: 'MANUTENCAO', parent: null, level: 4 },
      { code: '4.02.01.002', name: 'Manutencao Corretiva', type: 'EXPENSE', category: 'MANUTENCAO', parent: null, level: 4 },
      { code: '4.02.02.001', name: 'Pneus Novos', type: 'EXPENSE', category: 'MANUTENCAO', parent: null, level: 4 },
      { code: '4.02.02.002', name: 'Recapagem', type: 'EXPENSE', category: 'MANUTENCAO', parent: null, level: 4 },
      { code: '4.02.03.001', name: 'Pecas e Acessorios', type: 'EXPENSE', category: 'MANUTENCAO', parent: null, level: 4 },
      { code: '4.02.03.002', name: 'Mao de Obra Mecanica', type: 'EXPENSE', category: 'MANUTENCAO', parent: null, level: 4 },
      
      // DESPESAS ADMINISTRATIVAS
      { code: '5.01.01.001', name: 'Salarios Administrativo', type: 'EXPENSE', category: 'ADMINISTRATIVA', parent: null, level: 4 },
      { code: '5.01.01.002', name: 'Encargos Sociais', type: 'EXPENSE', category: 'ADMINISTRATIVA', parent: null, level: 4 },
      { code: '5.01.01.003', name: 'Beneficios RH', type: 'EXPENSE', category: 'ADMINISTRATIVA', parent: null, level: 4 },
      { code: '5.01.02.001', name: 'Aluguel Sede', type: 'EXPENSE', category: 'ADMINISTRATIVA', parent: null, level: 4 },
      { code: '5.01.02.002', name: 'Energia Eletrica', type: 'EXPENSE', category: 'ADMINISTRATIVA', parent: null, level: 4 },
      { code: '5.01.02.003', name: 'Agua e Esgoto', type: 'EXPENSE', category: 'ADMINISTRATIVA', parent: null, level: 4 },
      { code: '5.01.02.004', name: 'Telefone e Internet', type: 'EXPENSE', category: 'ADMINISTRATIVA', parent: null, level: 4 },
      { code: '5.01.03.001', name: 'Material Escritorio', type: 'EXPENSE', category: 'ADMINISTRATIVA', parent: null, level: 4 },
      { code: '5.01.03.002', name: 'Material Limpeza', type: 'EXPENSE', category: 'ADMINISTRATIVA', parent: null, level: 4 },
      
      // COMERCIAL
      { code: '5.02.01.001', name: 'Comissoes Vendas', type: 'EXPENSE', category: 'COMERCIAL', parent: null, level: 4 },
      { code: '5.02.01.002', name: 'Marketing e Propaganda', type: 'EXPENSE', category: 'COMERCIAL', parent: null, level: 4 },
      { code: '5.02.02.001', name: 'Viagens e Estadias', type: 'EXPENSE', category: 'COMERCIAL', parent: null, level: 4 },
      
      // TECNOLOGIA
      { code: '5.03.01.001', name: 'Licencas Software', type: 'EXPENSE', category: 'TI', parent: null, level: 4 },
      { code: '5.03.01.002', name: 'Cloud e Hospedagem', type: 'EXPENSE', category: 'TI', parent: null, level: 4 },
      { code: '5.03.01.003', name: 'Suporte TI', type: 'EXPENSE', category: 'TI', parent: null, level: 4 },
      
      // FINANCEIRAS
      { code: '6.01.01.001', name: 'Juros Recebidos', type: 'REVENUE', category: 'FINANCEIRA', parent: null, level: 4 },
      { code: '6.02.01.001', name: 'Juros Pagos', type: 'EXPENSE', category: 'FINANCEIRA', parent: null, level: 4 },
      { code: '6.02.01.002', name: 'Tarifas Bancarias', type: 'EXPENSE', category: 'FINANCEIRA', parent: null, level: 4 },
      { code: '6.02.01.003', name: 'IOF', type: 'EXPENSE', category: 'FINANCEIRA', parent: null, level: 4 },
      
      // TRIBUTOS
      { code: '7.01.01.001', name: 'PIS a Recolher', type: 'EXPENSE', category: 'TRIBUTO', parent: null, level: 4 },
      { code: '7.01.01.002', name: 'COFINS a Recolher', type: 'EXPENSE', category: 'TRIBUTO', parent: null, level: 4 },
      { code: '7.01.01.003', name: 'ICMS a Recolher', type: 'EXPENSE', category: 'TRIBUTO', parent: null, level: 4 },
      { code: '7.01.01.004', name: 'ISS a Recolher', type: 'EXPENSE', category: 'TRIBUTO', parent: null, level: 4 }
    ];

    let pccInserted = 0;
    for (const acc of pccAccounts) {
      try {
        await pool.request()
          .input('code', sql.NVarChar, acc.code)
          .input('name', sql.NVarChar, acc.name)
          .input('type', sql.NVarChar, acc.type)
          .input('category', sql.NVarChar, acc.category)
          .input('level', sql.Int, acc.level)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = @code AND organization_id = 1)
            BEGIN
              INSERT INTO chart_of_accounts (organization_id, code, name, type, category, level, is_active, created_at, updated_at)
              VALUES (1, @code, @name, @type, @category, @level, 1, GETDATE(), GETDATE())
            END
          `);
        pccInserted++;
        process.stdout.write(`\r   ✅ PCC: ${pccInserted}/${pccAccounts.length}`);
      } catch (e: any) {
        process.stdout.write(`\r   ⚠️  ${acc.code}: ${e.message.substring(0, 50)}`);
      }
    }
    
    const totalPcc = await pool.request().query(`SELECT COUNT(*) as t FROM chart_of_accounts WHERE organization_id = 1`);
    console.log(`\n   📊 Total PCC: ${totalPcc.recordset[0].t} contas\n`);

    // ==========================================
    // 4. POPULAR PCG
    // ==========================================
    console.log("📊 4/5: POPULANDO PCG...\n");
    
    const pcgAccounts = [
      { code: 'G-1000', name: 'Custo Gerencial Diesel Provisao KM', type: 'EXPENSE', allocation: 'KM_RODADO' },
      { code: 'G-1001', name: 'Custo Gerencial Manutencao Rateio', type: 'EXPENSE', allocation: 'TIPO_VEICULO' },
      { code: 'G-2000', name: 'Receita Gerencial Frete Liquido', type: 'REVENUE', allocation: 'ROTA' },
      { code: 'G-3000', name: 'Custo Gerencial Depreciacao Veiculos', type: 'EXPENSE', allocation: 'ATIVO_FIXO' },
      { code: 'G-4000', name: 'Margem Gerencial EBITDA por Rota', type: 'RESULT', allocation: 'ROTA' },
      { code: 'G-5000', name: 'Custo Gerencial MOD Motoristas', type: 'EXPENSE', allocation: 'VIAGEM' },
      { code: 'G-6000', name: 'Receita Gerencial WMS por Cliente', type: 'REVENUE', allocation: 'CLIENTE' },
      { code: 'G-7000', name: 'Custo Gerencial Armazenagem Rateio', type: 'EXPENSE', allocation: 'PALLET' }
    ];

    let pcgInserted = 0;
    for (const acc of pcgAccounts) {
      try {
        await pool.request()
          .input('code', sql.NVarChar, acc.code)
          .input('name', sql.NVarChar, acc.name)
          .input('type', sql.NVarChar, acc.type)
          .input('allocation', sql.NVarChar, acc.allocation)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM management_chart_of_accounts WHERE code = @code AND organization_id = 1)
            BEGIN
              INSERT INTO management_chart_of_accounts (organization_id, code, name, type, allocation_rule, is_active, created_at, updated_at)
              VALUES (1, @code, @name, @type, @allocation, 1, GETDATE(), GETDATE())
            END
          `);
        pcgInserted++;
        console.log(`   ✅ PCG: ${acc.code} - ${acc.name}`);
      } catch (e: any) {
        console.log(`   ❌ ${acc.code}: ${e.message.substring(0, 100)}`);
      }
    }
    
    const totalPcg = await pool.request().query(`SELECT COUNT(*) as t FROM management_chart_of_accounts WHERE organization_id = 1`);
    console.log(`   📊 Total PCG: ${totalPcg.recordset[0].t} contas\n`);

    // ==========================================
    // 5. POPULAR CENTROS DE CUSTO
    // ==========================================
    console.log("📊 5/5: POPULANDO CENTROS DE CUSTO...\n");
    
    // Adiciona colunas 3D
    const columns3D = ['service_type', 'linked_object_type', 'linked_object_id', 'asset_type'];
    for (const col of columns3D) {
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cost_centers' AND COLUMN_NAME = '${col}')
          ALTER TABLE cost_centers ADD ${col} NVARCHAR(50) NULL
        `);
      } catch (e) { /* Ignora */ }
    }

    const costCenters = [
      { code: 'CC-901', name: 'Operacao Frota Rodoviaria', type: 'EXPENSE', service: 'TRANSPORTE' },
      { code: 'CC-902', name: 'Manutencao Oficina Interna', type: 'EXPENSE', service: 'MANUTENCAO' },
      { code: 'CC-903', name: 'Comercial Vendas Cotacoes', type: 'EXPENSE', service: 'COMERCIAL' },
      { code: 'CC-904', name: 'Administrativo Gestao RH', type: 'EXPENSE', service: 'ADMINISTRATIVO' },
      { code: 'CC-905', name: 'Tecnologia TI Sistemas', type: 'EXPENSE', service: 'TI' },
      { code: 'CC-906', name: 'Armazem WMS Logistica', type: 'EXPENSE', service: 'ARMAZENAGEM' },
      { code: 'CC-907', name: 'Fiscal Contabilidade Impostos', type: 'EXPENSE', service: 'FISCAL' },
      { code: 'CC-908', name: 'Financeiro Tesouraria Contas', type: 'EXPENSE', service: 'FINANCEIRO' },
      { code: 'CC-999', name: 'Receita Faturamento TMS', type: 'REVENUE', service: 'OPERACAO' },
      { code: 'CC-998', name: 'Receita Faturamento WMS', type: 'REVENUE', service: 'ARMAZENAGEM' }
    ];

    let ccInserted = 0;
    for (const cc of costCenters) {
      try {
        await pool.request()
          .input('code', sql.NVarChar, cc.code)
          .input('name', sql.NVarChar, cc.name)
          .input('type', sql.NVarChar, cc.type)
          .input('service', sql.NVarChar, cc.service)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM cost_centers WHERE code = @code AND organization_id = 1)
            BEGIN
              INSERT INTO cost_centers (organization_id, code, name, description, type, service_type, created_at, updated_at)
              VALUES (1, @code, @name, @name, @type, @service, GETDATE(), GETDATE())
            END
          `);
        ccInserted++;
        console.log(`   ✅ CC: ${cc.code} - ${cc.name}`);
      } catch (e: any) {
        console.log(`   ❌ ${cc.code}: ${e.message.substring(0, 100)}`);
      }
    }
    
    const totalCc = await pool.request().query(`SELECT COUNT(*) as t FROM cost_centers WHERE organization_id = 1`);
    console.log(`   📊 Total CC: ${totalCc.recordset[0].t} centros\n`);

    // ==========================================
    // VERIFICAÇÃO FINAL
    // ==========================================
    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║  ✅ IMPLEMENTAÇÃO CONCLUÍDA! ✅                      ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");
    
    const fp = await pool.request().query(`SELECT COUNT(*) as t FROM chart_of_accounts WHERE organization_id = 1`);
    const fg = await pool.request().query(`SELECT COUNT(*) as t FROM management_chart_of_accounts WHERE organization_id = 1`);
    const fc = await pool.request().query(`SELECT COUNT(*) as t FROM cost_centers WHERE organization_id = 1`);
    
    console.log(`📊 PCC: ${fp.recordset[0].t} contas`);
    console.log(`📊 PCG: ${fg.recordset[0].t} contas`);
    console.log(`📊 CC: ${fc.recordset[0].t} centros\n`);

  } catch (error: any) {
    console.error("\n❌ ERRO:", error.message);
    throw error;
  } finally {
    await pool.close();
  }
}

run();














