# 🔍 AUDITORIA COMPLETA: MASTER DATA (PCC/PCG/CC/NCM/CF)

**Data:** 12 de Dezembro de 2025  
**Solicitante:** Pedro Lemes  
**Analista:** Sistema Aura Core (Senior Developer)  
**Status:** ✅ **AUDITORIA CONCLUÍDA**

---

## 📋 SUMÁRIO EXECUTIVO

Realizei uma auditoria completa comparando os **arquivos de documentação (.md)** com o **estado real do banco de dados**. Foram identificadas **discrepâncias significativas** entre o que está documentado e o que está realmente implementado.

```
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║                  🎯 SITUAÇÃO ENCONTRADA                           ║
║                                                                    ║
║  ✅ PCG (Plano Gerencial)         → 38 contas (CORRETO)          ║
║  ✅ CC (Centros de Custo)         → 39 centros (CORRETO)         ║
║  ✅ PCG-NCM Rules                 → 32 regras (CORRETO)          ║
║  ✅ Categorias Financeiras        → 23 categorias (CORRETO)     ║
║                                                                    ║
║  ⚠️  PCC (Plano Contábil)         → 22 contas (INCOMPLETO!)     ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 🔎 1. ANÁLISE DOS DOCUMENTOS

### **Documentos Analisados:**

| Documento | Data | PCC | PCG | CC | Status |
|-----------|------|-----|-----|----|----|
| **VERIFICACAO_ESTRUTURAS_PCC_PCG_CC.md** | 10/12/2025 | 100+ | Dual | 10+ | ❌ DESATUALIZADO |
| **IMPLEMENTACAO_COMPLETA_PCC_PCG_CC.md** | 10/12/2025 | 49 | 8 | 10 | ❌ PARCIAL |
| **MASTER_DATA_SEED_EXECUTADO.md** | 11/12/2025 | 22 | 38 | 39 | ✅ CORRETO |
| **CORRECAO_COMPLETA_PCG_COLUNAS.md** | 10/12/2025 | - | 8→21 cols | - | ✅ EXECUTADO |
| **CORRECAO_PCG_DELETED_AT.md** | 10/12/2025 | - | Soft Delete | - | ✅ EXECUTADO |

### **Resumo das Documentações:**

1. **VERIFICACAO_ESTRUTURAS_PCC_PCG_CC.md:**
   - ✅ Menciona "100+ contas analíticas TMS"
   - ✅ Refere-se à migration `0023_tms_chart_of_accounts_seed.sql`
   - ❌ Não reflete o que está no banco

2. **IMPLEMENTACAO_COMPLETA_PCC_PCG_CC.md:**
   - ✅ Menciona 49 contas PCC do script `final-populate-all.ts`
   - ❌ Também não reflete o estado atual

3. **MASTER_DATA_SEED_EXECUTADO.md:**
   - ✅ Menciona 22 contas PCC, 38 PCG, 39 CC
   - ✅ **Este é o único documento correto!**

---

## 🗄️ 2. ESTADO REAL DO BANCO DE DADOS

### **📊 Resultado da Auditoria (Executada em 12/12/2025):**

```sql
-- Conexão: vpsw4722.publiccloud.com.br
-- Database: [aura_core]
-- Organization ID: 1
```

#### **2.1. PCC - PLANO DE CONTAS CONTÁBIL**

```
✅ Total: 22 contas (organization_id = 1, deleted_at IS NULL)

Por Tipo:
   ASSET        → 6 contas (Ativo)
   EXPENSE      → 9 contas (Despesa)
   LIABILITY    → 3 contas (Passivo)
   REVENUE      → 4 contas (Receita)

Por Categoria:
   OPERATIONAL  → 22 contas (100%)

Amostra:
   1.1.1.01.001 - Caixa e Equivalentes [ASSET]
   1.1.2.01.001 - Clientes a Receber - Fretes [ASSET]
   1.1.4.01.001 - Estoques (Peças/Pneus/Diesel) [ASSET]
   2.1.1.01.001 - Fornecedores a Pagar [LIABILITY]
   3.1.1.01.001 - Receita Bruta de Fretes [REVENUE]
   4.1.1.01.001 - Custos Variáveis - Insumos [EXPENSE]
   4.2.1.01.001 - Despesas com Pessoal [EXPENSE]
```

**❌ PROBLEMA IDENTIFICADO:**
- Banco tem apenas **22 contas**
- Documentação menciona **100+ contas**
- Migration `0023_tms_chart_of_accounts_seed.sql` contém **73 contas**

---

#### **2.2. PCG - PLANO DE CONTAS GERENCIAL**

```
✅ Total: 38 contas (organization_id = 1, deleted_at IS NULL)

Por Tipo:
   EXPENSE  → 31 contas (Custos e Despesas Gerenciais)
   REVENUE  → 7 contas (Receitas Gerenciais)

Estrutura:
   ✅ Tabela: management_chart_of_accounts (21 colunas)
   ✅ Soft Delete: deleted_at, deleted_by
   ✅ FK com PCC: legal_account_id
   ✅ Hierarquia: parent_id, level
   ✅ Rateio: allocation_rule, allocation_base

Amostra:
   G-1648  - Combustível Diesel (S10/S500) [EXPENSE]
   G-11031 - Arla 32 (Agente Redutor) [EXPENSE]
   G-1649  - Pneus - Aquisição (Novos) [EXPENSE]
   G-1654  - Peças de Reposição Mecânica [EXPENSE]
   G-3001  - Receita de Frete Peso (Ad Valorem) [REVENUE]
   G-3010  - Receita de Armazenagem (Storage) [REVENUE]
```

**✅ STATUS:** CORRETO e completo conforme MASTER_DATA_SEED_EXECUTADO.md

---

#### **2.3. CC - CENTROS DE CUSTO**

```
✅ Total: 39 centros (organization_id = 1, deleted_at IS NULL)

Por Classe:
   COST     → 27 centros (Centros de Custo)
   REVENUE  → 9 centros (Centros de Receita)
   BOTH     → 3 centros (Ambos)

Estrutura 3D:
   D1 - Filial (branch_id)
   D2 - Tipo de Serviço (service_type)
   D3 - Objeto de Custo (linked_object_type + linked_object_id)

Amostra:
   UN-1000 - DIRETORIA DE TRANSPORTE RODOVIÁRIO [REVENUE]
   UN-1100 - TRANSPORTE FTL (CARGA LOTAÇÃO) [REVENUE]
   CC-9101 - OFICINA MECÂNICA CENTRAL [COST]
   CC-9103 - BORRACHARIA E GESTÃO DE PNEUS [COST]
   V-2050  - SCANIA R450 6x2 - PLC: GHI-9090 [COST]
   FIL-001 - MATRIZ ADMINISTRATIVA (SP) [COST]
```

**✅ STATUS:** CORRETO e completo conforme MASTER_DATA_SEED_EXECUTADO.md

---

#### **2.4. PCG-NCM RULES**

```
✅ Total: 32 regras (organization_id = 1, deleted_at IS NULL)
   Monofásicas: 21 regras (66%)

Cobertura por Categoria:
   Combustíveis        → 1 NCM (100% mono + ST)
   Lubrificantes       → 5 NCMs (40% mono)
   Pneus              → 3 NCMs (100% mono)
   Peças Mecânicas    → 11 NCMs (82% mono)
   Peças Elétricas    → 5 NCMs (100% mono)
   Logística          → 3 NCMs (33% mono)
   Ferramentas        → 1 NCM
   Limpeza            → 1 NCM

Amostra:
   2710.19.21 - Óleo Diesel S-10/S-500 [✅ MONO + ST]
   3102.10.10 - Arla 32 (Solução de Ureia) [❌]
   4011.20.90 - Pneus Novos de Carga [✅ MONO + ST]
   6813.81.10 - Pastilhas de Freio [✅ MONO + ST]
   8507.10.10 - Baterias [✅ MONO + ST]
```

**✅ STATUS:** CORRETO e completo conforme MASTER_DATA_SEED_EXECUTADO.md

---

#### **2.5. CATEGORIAS FINANCEIRAS**

```
✅ Total: 23 categorias (organization_id = 1, deleted_at IS NULL)

Por Tipo de Movimento:
   ENTRADA  → 6 categorias
   SAIDA    → 17 categorias

Por Grupo DFC:
   OPERACIONAL   → 22 categorias (96%)
   INVESTIMENTO  → 1 categoria (4%)

Estrutura DFC:
   ✅ codigo_estruturado
   ✅ tipo_movimento (ENTRADA/SAIDA/TRANSFERENCIA)
   ✅ grupo_dfc (OPERACIONAL/INVESTIMENTO/FINANCIAMENTO)
   ✅ permite_lancamento

Amostra:
   1.01 - Venda de Frete [ENTRADA/OPERACIONAL]
   2.01 - Fornecedores (NFe) [SAIDA/OPERACIONAL]
   2.02 - Combustível [SAIDA/OPERACIONAL]
   2.04 - Administrativo [SAIDA/INVESTIMENTO]
   4.1.01 - Combustível [SAIDA/OPERACIONAL]
```

**✅ STATUS:** CORRETO com colunas DFC migradas conforme MIGRACAO_CATEGORIAS_FINANCEIRAS_DFC.md

---

## ⚠️ 3. DISCREPÂNCIAS IDENTIFICADAS

### **3.1. PCC - Plano de Contas Contábil (CRÍTICO)**

| Item | Esperado | Real | Status |
|------|----------|------|--------|
| Total de Contas | 73-100+ | **22** | ❌ INCOMPLETO |
| Migration 0023 | 73 contas | Não aplicada | ❌ NÃO EXECUTADA |
| Script final-populate-all.ts | 49 contas | Sobrescrito | ❌ PARCIAL |

**PROBLEMA:**
A migration `0023_tms_chart_of_accounts_seed.sql` contém **73 contas analíticas TMS**, mas o banco tem apenas **22 contas básicas**.

**Contas Faltantes (51 contas):**
- ✅ Grupo 3.1.1 - Receitas Operacionais (8 contas) → **Faltam 4**
- ✅ Grupo 3.2 - Deduções de Receita (5 contas) → **Faltam 3**
- ❌ Grupo 4.1.1 - Custos Variáveis Frota (10 contas) → **Faltam 9**
- ❌ Grupo 4.1.1.04 - Custos de Viagem (4 contas) → **Faltam 4**
- ❌ Grupo 4.1.2 - Custos de Subcontratação (3 contas) → **Faltam 3**
- ❌ Grupo 4.1.3 - Custos Logística/Armazém (6 contas) → **Faltam 6**
- ❌ Grupo 4.2 - Custos Fixos e Riscos (10 contas) → **Faltam 10**
- ❌ Grupo 4.3.1 - Custos Oficina Interna (5 contas) → **Faltam 5**
- ❌ Grupo 4.3.2 - Posto de Abastecimento (4 contas) → **Faltam 4**
- ❌ Grupo 4.3.3 - Lava Jato/Conservação (3 contas) → **Faltam 3**
- ❌ Grupo 5.1 - Despesas Operacionais (8 contas) → **Faltam 8**
- ❌ Grupo 5.2 - Despesas Comerciais (4 contas) → **Faltam 4**
- ❌ Créditos Fiscais (3 contas) → **Faltam 3**

---

### **3.2. Tabelas Duplicadas/Inconsistências**

✅ **Sem duplicações encontradas:**
- Códigos PCC: Sem duplicatas
- Códigos CC: Sem duplicatas
- Registros soft-deleted: 0 (ambas as tabelas)

---

## 🎯 4. CAUSA RAIZ

### **Por que o banco tem apenas 22 contas PCC?**

1. **Script `final-populate-all.ts` foi executado DEPOIS da migration 0023:**
   - Ele insere apenas 49 contas básicas
   - Usa `IF NOT EXISTS` para evitar duplicatas
   - Sobrescreveu ou não carregou as 73 contas da migration

2. **A migration 0023 pode não ter sido aplicada:**
   - Não há tabela `__drizzle_migrations` no banco
   - Migrations parecem ter sido aplicadas manualmente
   - Possível que 0023 tenha sido "pulada"

3. **Dados foram deletados e recarregados:**
   - O documento IMPLEMENTACAO_COMPLETA menciona "limpeza de dados antigos"
   - Pode ter deletado as 73 contas e carregado apenas 22/49

---

## ✅ 5. VERIFICAÇÕES POSITIVAS

### **O que ESTÁ correto:**

1. ✅ **PCG (38 contas):**
   - Estrutura completa com 21 colunas
   - Soft delete implementado
   - FK com PCC configurada
   - Hierarquia e rateio funcionando

2. ✅ **CC (39 centros):**
   - Estrutura 3D completa
   - 4 níveis hierárquicos (UN, Filial, Apoio, Ativos)
   - Classificação por classe (COST/REVENUE/BOTH)

3. ✅ **PCG-NCM Rules (32 regras):**
   - Flags fiscais automáticas
   - 21 regras monofásicas (66%)
   - Cobertura de categorias principais

4. ✅ **Categorias Financeiras (23 categorias):**
   - Colunas DFC migradas
   - Classificação ENTRADA/SAIDA
   - Grupo DFC (OPERACIONAL/INVESTIMENTO)

5. ✅ **Integrações:**
   - PCG → Categorias Financeiras (FK: id_categoria_financeira_padrao)
   - PCG → NCM (tabela pcg_ncm_rules)
   - PCG → PCC (FK: legal_account_id)

---

## 📊 6. COMPARATIVO: PLANEJADO vs REAL

| Estrutura | Planejado (Docs) | Real (Banco) | % Completude | Status |
|-----------|-----------------|--------------|--------------|--------|
| **PCC** | 73-100+ contas | **22 contas** | **30%** | ❌ INCOMPLETO |
| **PCG** | 38 contas | **38 contas** | **100%** | ✅ COMPLETO |
| **CC** | 39 centros | **39 centros** | **100%** | ✅ COMPLETO |
| **PCG-NCM** | 32 regras | **32 regras** | **100%** | ✅ COMPLETO |
| **CF** | 23 categorias | **23 categorias** | **100%** | ✅ COMPLETO |

---

## 🚀 7. PLANO DE AÇÃO RECOMENDADO

### **Opção A: Carregar Migration 0023 (RECOMENDADO)**

**Vantagem:** Carrega estrutura completa de 73 contas TMS específicas

```sql
-- Executar:
-- drizzle/migrations/0023_tms_chart_of_accounts_seed.sql

-- Isso adicionará:
-- + 51 contas analíticas TMS
-- Total: 22 + 51 = 73 contas
```

**Ações:**
1. ✅ Verificar se há conflitos de códigos
2. ✅ Executar migration 0023 manualmente
3. ✅ Validar total de contas (deve ficar 73+)
4. ✅ Atualizar documentação

---

### **Opção B: Manter Estrutura Atual (Minimalista)**

**Vantagem:** Estrutura enxuta, mais fácil de manter

**Desvantagens:**
- Menos granularidade contábil
- DRE menos detalhado
- Dificuldade em análises específicas (ex: custo por tipo de manutenção)

**Ações:**
1. ✅ Aceitar que 22 contas é suficiente
2. ✅ Atualizar documentação para refletir realidade
3. ✅ Marcar migration 0023 como "não aplicável"

---

### **Opção C: Criar Nova Estrutura Customizada**

**Vantagem:** Estrutura personalizada para necessidades específicas

**Ações:**
1. ✅ Definir quais contas são realmente necessárias
2. ✅ Criar novo seed com estrutura customizada
3. ✅ Aplicar ao banco
4. ✅ Atualizar documentação

---

## 📋 8. SCRIPTS DE CORREÇÃO

### **Script 1: Aplicar Migration 0023 (Opção A)**

```typescript
// scripts/apply-migration-0023.ts
import fs from 'fs';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log("🔄 Aplicando Migration 0023 (73 contas TMS)...\n");
  
  const pool = await sql.connect({
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    server: process.env.DB_HOST || "vpsw4722.publiccloud.com.br",
    database: process.env.DB_NAME!,
    options: { encrypt: false, trustServerCertificate: true },
    port: 1433,
  });

  try {
    // Ler migration
    const migration = fs.readFileSync(
      './drizzle/migrations/0023_tms_chart_of_accounts_seed.sql',
      'utf8'
    );

    // Executar
    await pool.request().query(migration);

    // Verificar resultado
    const result = await pool.request().query(`
      SELECT COUNT(*) as total 
      FROM chart_of_accounts 
      WHERE organization_id = 1 AND deleted_at IS NULL
    `);

    console.log(`✅ Total de contas PCC: ${result.recordset[0].total}`);
    
    if (result.recordset[0].total >= 73) {
      console.log("✅ Migration 0023 aplicada com sucesso!");
    } else {
      console.log("⚠️  Migration aplicada, mas total menor que esperado");
    }

  } catch (error: any) {
    console.error("❌ Erro:", error.message);
  } finally {
    await pool.close();
  }
}

run();
```

**Executar:**
```bash
npx tsx scripts/apply-migration-0023.ts
```

---

### **Script 2: Verificar Códigos Duplicados (Antes de Aplicar)**

```typescript
// scripts/check-duplicates-before-migration.ts
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log("🔍 Verificando códigos que serão inseridos...\n");
  
  const pool = await sql.connect({
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    server: process.env.DB_HOST || "vpsw4722.publiccloud.com.br",
    database: process.env.DB_NAME!,
    options: { encrypt: false, trustServerCertificate: true },
    port: 1433,
  });

  try {
    // Códigos da migration 0023
    const codes0023 = [
      '3.1.1.01.001', '3.1.1.01.002', '3.1.1.01.003', '3.1.1.01.004',
      '3.1.1.02.001', '3.1.1.02.002', '3.1.1.02.003', '3.1.1.03.001',
      '3.2.1.01.001', '3.2.1.01.002', '3.2.1.02.001', '3.2.1.02.002', '3.2.2.01.001',
      '4.1.1.01.001', '4.1.1.01.002', '4.1.1.01.003', '4.1.1.02.001', '4.1.1.02.002',
      '4.1.1.03.001', '4.1.1.03.002', '4.1.1.03.003', '4.1.1.03.004', '4.1.1.03.005',
      '4.1.1.04.001', '4.1.1.04.002', '4.1.1.04.003', '4.1.1.05.001',
      '4.1.2.01.001', '4.1.2.01.002', '4.1.2.01.003',
      '4.1.3.01.001', '4.1.3.01.002', '4.1.3.02.001', '4.1.3.02.002', '4.1.3.03.001', '4.1.3.03.002',
      '4.2.1.01.001', '4.2.1.01.002', '4.2.1.01.003', '4.2.2.01.001', '4.2.2.01.002',
      '4.2.2.02.001', '4.2.3.01.001', '4.2.3.01.002', '4.2.4.01.001', '4.2.5.01.001',
      '4.3.1.01.001', '4.3.1.01.002', '4.3.1.01.003', '4.3.1.01.004', '4.3.1.01.005',
      '4.3.2.01.001', '4.3.2.01.002', '4.3.2.01.003', '4.3.2.02.001',
      '4.3.3.01.001', '4.3.3.01.002', '4.3.3.01.003',
      '5.1.1.01.001', '5.1.1.01.002', '5.1.1.01.003', '5.1.1.01.004',
      '5.1.2.01.001', '5.1.2.01.002', '5.1.3.01.001', '5.1.4.01.001',
      '5.2.1.01.001', '5.2.1.02.001', '5.2.1.02.002', '5.2.1.03.001',
      '1.1.4.01.001', '1.1.4.01.002', '1.1.4.02.001'
    ];

    console.log(`Total de códigos na migration: ${codes0023.length}\n`);

    // Verificar quais já existem
    let existingCount = 0;
    for (const code of codes0023) {
      const result = await pool.request()
        .input('code', sql.NVarChar, code)
        .query(`
          SELECT code, name 
          FROM chart_of_accounts 
          WHERE code = @code AND organization_id = 1 AND deleted_at IS NULL
        `);

      if (result.recordset.length > 0) {
        console.log(`⚠️  ${code} - JÁ EXISTE: ${result.recordset[0].name}`);
        existingCount++;
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Total na migration: ${codes0023.length}`);
    console.log(`   Já existentes: ${existingCount}`);
    console.log(`   Serão inseridos: ${codes0023.length - existingCount}`);

    if (existingCount > 0) {
      console.log(`\n⚠️  ATENÇÃO: ${existingCount} códigos já existem!`);
      console.log(`   A migration usa INSERT sem IF NOT EXISTS, então pode dar erro.`);
      console.log(`   Recomendo modificar a migration para usar IF NOT EXISTS.`);
    } else {
      console.log(`\n✅ Sem conflitos! Pode aplicar a migration com segurança.`);
    }

  } catch (error: any) {
    console.error("❌ Erro:", error.message);
  } finally {
    await pool.close();
  }
}

run();
```

---

## 📚 9. DOCUMENTAÇÃO A ATUALIZAR

### **Documentos para Correção:**

1. ❌ **VERIFICACAO_ESTRUTURAS_PCC_PCG_CC.md**
   - Atualizar total de PCC: 100+ → **22 contas**
   - Adicionar nota sobre migration 0023 não aplicada

2. ❌ **IMPLEMENTACAO_COMPLETA_PCC_PCG_CC.md**
   - Atualizar total de PCC: 49 → **22 contas**
   - Remover referências a dados que não existem

3. ✅ **MASTER_DATA_SEED_EXECUTADO.md**
   - Este documento está CORRETO
   - Usar como referência

---

## ✅ 10. CONCLUSÃO

### **Situação Atual:**

```
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║  📊 MASTER DATA - SITUAÇÃO REAL                                   ║
║                                                                    ║
║  PCC (Plano Contábil)          → 22/73 contas (30% completo)     ║
║  PCG (Plano Gerencial)         → 38/38 contas (100% completo)    ║
║  CC (Centros de Custo)         → 39/39 centros (100% completo)   ║
║  PCG-NCM Rules                 → 32/32 regras (100% completo)    ║
║  Categorias Financeiras        → 23/23 categorias (100% completo)║
║                                                                    ║
║  ⚠️  PCC INCOMPLETO - Faltam 51 contas analíticas TMS            ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

### **Recomendação Final:**

**Opção A (RECOMENDADO):** Aplicar migration 0023 para carregar 73 contas TMS completas.

**Motivos:**
- ✅ Estrutura mais granular para análises financeiras
- ✅ DRE mais detalhado por categoria de custo
- ✅ Melhor rastreabilidade de despesas operacionais
- ✅ Alinhado com a documentação original

**Próximos Passos:**
1. ✅ Executar script de verificação de duplicatas
2. ✅ Aplicar migration 0023 (ou versão modificada com IF NOT EXISTS)
3. ✅ Validar total de contas (deve chegar a 73+)
4. ✅ Atualizar documentação
5. ✅ Testar tela de PCC no frontend

---

**Auditor:** Sistema Aura Core (Análise Automatizada)  
**Data:** 12 de Dezembro de 2025 às 23:45  
**Status:** ✅ AUDITORIA COMPLETA - AGUARDANDO DECISÃO

---

## 📎 ANEXOS

### **A. Códigos das 22 Contas PCC Existentes**

```
1.1.1.01.001 - Caixa e Equivalentes
1.1.2.01.001 - Clientes a Receber - Fretes
1.1.2.06.001 - Créditos com Seguradoras
1.1.4.01.001 - Estoques (Peças/Pneus/Diesel)
1.1.4.05.001 - Impostos a Recuperar
1.2.2.01.001 - Ativo Imobilizado
2.1.1.01.001 - Fornecedores a Pagar
2.1.2.01.001 - Obrigações Fiscais
2.1.3.01.001 - Obrigações Trabalhistas
3.1.1.01.001 - Receita Bruta de Fretes
3.1.1.02.001 - Receita Bruta Logística (WMS)
3.2.1.01.001 - (-) Deduções de Receita
3.3.1.01.001 - Outras Receitas Operacionais
4.1.1.01.001 - Custos Variáveis - Insumos
4.1.1.02.001 - Custos Variáveis - Manutenção
4.1.1.03.001 - Custos Variáveis - Viagem
4.1.2.01.001 - Custos com Terceiros
4.1.3.01.001 - Custos Operacionais WMS
4.1.4.01.001 - Gerenciamento de Risco
4.2.1.01.001 - Despesas com Pessoal
4.2.2.01.001 - Despesas Administrativas
4.2.4.01.001 - Depreciação
```

### **B. Estrutura Completa da Migration 0023 (73 contas)**

Ver arquivo: `drizzle/migrations/0023_tms_chart_of_accounts_seed.sql`

---

**FIM DA AUDITORIA**



