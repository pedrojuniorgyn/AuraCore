/**
 * SCRIPT FINAL - POPULAR TUDO CORRETAMENTE
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

async function run() {
  console.log("\n🚀 POPULANDO PCC E CC (VERSÃO FINAL)\n");
  
  const pool = await sql.connect(config);
  
  try {
    // ==========================================
    // POPULAR PCC (SEM is_active)
    // ==========================================
    console.log("📊 POPULANDO PCC...\n");
    
    const pccAccounts = [
      // RECEITAS
      { code: '3.01.01.001', name: 'Receita de Frete Peso', type: 'REVENUE', category: 'OPERACIONAL', level: 4 },
      { code: '3.01.01.002', name: 'Receita de Frete Ad Valorem', type: 'REVENUE', category: 'OPERACIONAL', level: 4 },
      { code: '3.01.01.003', name: 'Receita de GRIS', type: 'REVENUE', category: 'OPERACIONAL', level: 4 },
      { code: '3.01.01.004', name: 'Receita de Pedagio', type: 'REVENUE', category: 'OPERACIONAL', level: 4 },
      { code: '3.01.01.005', name: 'Receita de TDE', type: 'REVENUE', category: 'OPERACIONAL', level: 4 },
      { code: '3.01.01.006', name: 'Receita de TDA', type: 'REVENUE', category: 'OPERACIONAL', level: 4 },
      { code: '3.01.01.007', name: 'Receita de Outros Servicos', type: 'REVENUE', category: 'OPERACIONAL', level: 4 },
      { code: '3.01.02.001', name: 'Receita WMS Armazenagem', type: 'REVENUE', category: 'OPERACIONAL', level: 4 },
      { code: '3.01.02.002', name: 'Receita WMS Movimentacao', type: 'REVENUE', category: 'OPERACIONAL', level: 4 },
      
      // DEDUÇÕES
      { code: '3.02.01.001', name: 'Devolucoes e Cancelamentos', type: 'REVENUE_DEDUCTION', category: 'OPERACIONAL', level: 4 },
      { code: '3.02.01.002', name: 'Descontos Comerciais', type: 'REVENUE_DEDUCTION', category: 'OPERACIONAL', level: 4 },
      
      // CUSTOS DIRETOS
      { code: '4.01.01.001', name: 'Frete Carreteiro PJ', type: 'EXPENSE', category: 'CUSTO_DIRETO', level: 4 },
      { code: '4.01.01.002', name: 'Frete Carreteiro PF TAC', type: 'EXPENSE', category: 'CUSTO_DIRETO', level: 4 },
      { code: '4.01.01.003', name: 'Frete Agregado', type: 'EXPENSE', category: 'CUSTO_DIRETO', level: 4 },
      { code: '4.01.02.001', name: 'Diesel Frota Propria', type: 'EXPENSE', category: 'CUSTO_DIRETO', level: 4 },
      { code: '4.01.02.002', name: 'Arla 32', type: 'EXPENSE', category: 'CUSTO_DIRETO', level: 4 },
      { code: '4.01.03.001', name: 'Pedagio Frota', type: 'EXPENSE', category: 'CUSTO_DIRETO', level: 4 },
      { code: '4.01.04.001', name: 'Seguro Carga', type: 'EXPENSE', category: 'CUSTO_DIRETO', level: 4 },
      { code: '4.01.04.002', name: 'Seguro Frota', type: 'EXPENSE', category: 'CUSTO_DIRETO', level: 4 },
      { code: '4.01.05.001', name: 'Rastreamento Veicular', type: 'EXPENSE', category: 'CUSTO_DIRETO', level: 4 },
      
      // MANUTENÇÃO
      { code: '4.02.01.001', name: 'Manutencao Preventiva', type: 'EXPENSE', category: 'MANUTENCAO', level: 4 },
      { code: '4.02.01.002', name: 'Manutencao Corretiva', type: 'EXPENSE', category: 'MANUTENCAO', level: 4 },
      { code: '4.02.02.001', name: 'Pneus Novos', type: 'EXPENSE', category: 'MANUTENCAO', level: 4 },
      { code: '4.02.02.002', name: 'Recapagem', type: 'EXPENSE', category: 'MANUTENCAO', level: 4 },
      { code: '4.02.03.001', name: 'Pecas e Acessorios', type: 'EXPENSE', category: 'MANUTENCAO', level: 4 },
      { code: '4.02.03.002', name: 'Mao de Obra Mecanica', type: 'EXPENSE', category: 'MANUTENCAO', level: 4 },
      
      // DESPESAS ADMINISTRATIVAS
      { code: '5.01.01.001', name: 'Salarios Administrativo', type: 'EXPENSE', category: 'ADMINISTRATIVA', level: 4 },
      { code: '5.01.01.002', name: 'Encargos Sociais', type: 'EXPENSE', category: 'ADMINISTRATIVA', level: 4 },
      { code: '5.01.01.003', name: 'Beneficios RH', type: 'EXPENSE', category: 'ADMINISTRATIVA', level: 4 },
      { code: '5.01.02.001', name: 'Aluguel Sede', type: 'EXPENSE', category: 'ADMINISTRATIVA', level: 4 },
      { code: '5.01.02.002', name: 'Energia Eletrica', type: 'EXPENSE', category: 'ADMINISTRATIVA', level: 4 },
      { code: '5.01.02.003', name: 'Agua e Esgoto', type: 'EXPENSE', category: 'ADMINISTRATIVA', level: 4 },
      { code: '5.01.02.004', name: 'Telefone e Internet', type: 'EXPENSE', category: 'ADMINISTRATIVA', level: 4 },
      { code: '5.01.03.001', name: 'Material Escritorio', type: 'EXPENSE', category: 'ADMINISTRATIVA', level: 4 },
      { code: '5.01.03.002', name: 'Material Limpeza', type: 'EXPENSE', category: 'ADMINISTRATIVA', level: 4 },
      
      // COMERCIAL
      { code: '5.02.01.001', name: 'Comissoes Vendas', type: 'EXPENSE', category: 'COMERCIAL', level: 4 },
      { code: '5.02.01.002', name: 'Marketing e Propaganda', type: 'EXPENSE', category: 'COMERCIAL', level: 4 },
      { code: '5.02.02.001', name: 'Viagens e Estadias', type: 'EXPENSE', category: 'COMERCIAL', level: 4 },
      
      // TECNOLOGIA
      { code: '5.03.01.001', name: 'Licencas Software', type: 'EXPENSE', category: 'TI', level: 4 },
      { code: '5.03.01.002', name: 'Cloud e Hospedagem', type: 'EXPENSE', category: 'TI', level: 4 },
      { code: '5.03.01.003', name: 'Suporte TI', type: 'EXPENSE', category: 'TI', level: 4 },
      
      // FINANCEIRAS
      { code: '6.01.01.001', name: 'Juros Recebidos', type: 'REVENUE', category: 'FINANCEIRA', level: 4 },
      { code: '6.02.01.001', name: 'Juros Pagos', type: 'EXPENSE', category: 'FINANCEIRA', level: 4 },
      { code: '6.02.01.002', name: 'Tarifas Bancarias', type: 'EXPENSE', category: 'FINANCEIRA', level: 4 },
      { code: '6.02.01.003', name: 'IOF', type: 'EXPENSE', category: 'FINANCEIRA', level: 4 },
      
      // TRIBUTOS
      { code: '7.01.01.001', name: 'PIS a Recolher', type: 'EXPENSE', category: 'TRIBUTO', level: 4 },
      { code: '7.01.01.002', name: 'COFINS a Recolher', type: 'EXPENSE', category: 'TRIBUTO', level: 4 },
      { code: '7.01.01.003', name: 'ICMS a Recolher', type: 'EXPENSE', category: 'TRIBUTO', level: 4 },
      { code: '7.01.01.004', name: 'ISS a Recolher', type: 'EXPENSE', category: 'TRIBUTO', level: 4 }
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
              INSERT INTO chart_of_accounts (organization_id, code, name, type, category, level, status, is_analytical, created_by, created_at, updated_at, version)
              VALUES (1, @code, @name, @type, @category, @level, 'ACTIVE', 'true', 'SYSTEM', GETDATE(), GETDATE(), 1)
            END
          `);
        pccInserted++;
        process.stdout.write(`\r   ✅ PCC: ${pccInserted}/${pccAccounts.length}`);
      } catch (e: any) {
        console.log(`\n   ❌ ${acc.code}: ${e.message.substring(0, 80)}`);
      }
    }
    
    const totalPcc = await pool.request().query(`SELECT COUNT(*) as t FROM chart_of_accounts WHERE organization_id = 1`);
    console.log(`\n   📊 Total PCC no banco: ${totalPcc.recordset[0].t} contas\n`);

    // ==========================================
    // POPULAR CENTROS DE CUSTO (COM created_by)
    // ==========================================
    console.log("📊 POPULANDO CENTROS DE CUSTO...\n");
    
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
              INSERT INTO cost_centers (
                organization_id, code, name, description, type, service_type,
                status, is_analytical, created_by, updated_by, created_at, updated_at
              )
              VALUES (
                1, @code, @name, @name, @type, @service,
                'ACTIVE', 'true', 'SYSTEM', 'SYSTEM', GETDATE(), GETDATE()
              )
            END
          `);
        ccInserted++;
        console.log(`   ✅ CC: ${cc.code} - ${cc.name}`);
      } catch (e: any) {
        console.log(`   ❌ ${cc.code}: ${e.message.substring(0, 100)}`);
      }
    }
    
    const totalCc = await pool.request().query(`SELECT COUNT(*) as t FROM cost_centers WHERE organization_id = 1`);
    console.log(`   📊 Total CC no banco: ${totalCc.recordset[0].t} centros\n`);

    // ==========================================
    // RESULTADO FINAL
    // ==========================================
    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║  ✅ POPULAÇÃO 100% CONCLUÍDA! ✅                     ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");
    
    const fp = await pool.request().query(`SELECT COUNT(*) as t FROM chart_of_accounts WHERE organization_id = 1`);
    const fg = await pool.request().query(`SELECT COUNT(*) as t FROM management_chart_of_accounts WHERE organization_id = 1`);
    const fc = await pool.request().query(`SELECT COUNT(*) as t FROM cost_centers WHERE organization_id = 1`);
    
    console.log(`✅ PCC (chart_of_accounts): ${fp.recordset[0].t} contas`);
    console.log(`✅ PCG (management_chart_of_accounts): ${fg.recordset[0].t} contas`);
    console.log(`✅ CC (cost_centers): ${fc.recordset[0].t} centros`);
    console.log();

  } catch (error: any) {
    console.error("\n❌ ERRO:", error.message);
    throw error;
  } finally {
    await pool.close();
  }
}

run();













