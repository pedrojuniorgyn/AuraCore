# 🔍 AUDITORIA: ESTRUTURAS DE NCM (Nomenclatura Comum do Mercosul)

**Data:** 12 de Dezembro de 2025  
**Solicitante:** Pedro Lemes  
**Tipo:** Comparação NCM - Banco de Dados vs Documentação  
**Status:** ✅ **AUDITORIA CONCLUÍDA**

---

## 📊 SUMÁRIO EXECUTIVO

Identifiquei **DUAS estruturas de NCM** no sistema:

```
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║  🗄️  ESTRUTURA ANTIGA: ncm_financial_categories                   ║
║      40 NCMs → Vincula NCM → Categoria Financeira (DFC)           ║
║      19 com categoria (47,5%)                                      ║
║      21 sem categoria (52,5%)                                      ║
║                                                                    ║
║  🆕 ESTRUTURA NOVA: pcg_ncm_rules (REFATORAÇÃO)                   ║
║      32 regras → Vincula NCM → PCG (Plano Gerencial)              ║
║      21 monofásicas (66%)                                          ║
║      26 com ICMS-ST (81%)                                          ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 1️⃣ ESTRUTURA ANTIGA: ncm_financial_categories

### **📊 Situação Atual:**

```
✅ Total: 40 NCMs cadastrados
   Com categoria financeira: 19 NCMs (47,5%)
   Sem categoria financeira: 21 NCMs (52,5%)
```

### **🏗️ Estrutura da Tabela:**

```sql
CREATE TABLE ncm_financial_categories (
  id                        INT IDENTITY PRIMARY KEY,
  organization_id           INT NOT NULL,
  branch_id                 INT NULL,
  ncm_code                  NVARCHAR(8) NOT NULL,
  financial_category_id     INT NULL,           -- FK para financial_categories
  chart_account_id          INT NULL,            -- FK para chart_of_accounts (PCC)
  description               NVARCHAR(255) NULL,
  is_active                 BIT NULL,
  created_by                NVARCHAR(255) NOT NULL,
  created_at                DATETIME2 NULL,
  updated_at                DATETIME2 NULL,
  deleted_at                DATETIME2 NULL,
  version                   INT NULL
);
```

### **📋 Lista Completa dos 40 NCMs:**

#### **COM Categoria Financeira (19 NCMs):**

| NCM | Descrição | Categoria Financeira |
|-----|-----------|---------------------|
| 27101211 | Óleo de Motor | 7 (Manutenção) |
| 27101219 | Óleo Lubrificante Mineral | 7 (Manutenção) |
| 27101912 | Gasolina | 6 (Combustível) |
| 27101929 | Etanol | 6 (Combustível) |
| 27101931 | Diesel S500 | 6 (Combustível) |
| 27101932 | Diesel S10 | 6 (Combustível) |
| 27101990 | Graxa | 7 (Manutenção) |
| 40113000 | Pneus de Borracha Maciça | 7 (Manutenção) |
| 40116100 | Pneus para Caminhão | 7 (Manutenção) |
| 40116200 | Pneus para Ônibus | 7 (Manutenção) |
| 40139000 | Câmaras de Ar | 7 (Manutenção) |
| 84099199 | Motores Diesel | 7 (Manutenção) |
| 84212300 | Filtros de Óleo | 7 (Manutenção) |
| 84213100 | Filtros de Ar | 7 (Manutenção) |
| 85071000 | Baterias de Chumbo | 7 (Manutenção) |
| 85123000 | Buzinas | 7 (Manutenção) |
| 85364900 | Relés | 7 (Manutenção) |
| 85369090 | Conectores Elétricos | 7 (Manutenção) |
| 87089900 | Peças de Veículos | 7 (Manutenção) |

#### **SEM Categoria Financeira (21 NCMs):**

| NCM | Descrição | Status |
|-----|-----------|--------|
| 21069090 | Gêneros Alimentícios | ⚠️ Sem categoria |
| 22021000 | Água Mineral | ⚠️ Sem categoria |
| 34021900 | Detergentes | ⚠️ Sem categoria |
| 34022000 | Produtos de Limpeza | ⚠️ Sem categoria |
| 39201090 | Plástico Bolha | ⚠️ Sem categoria |
| 39232100 | Sacos Plásticos | ⚠️ Sem categoria |
| 39262000 | Equipamentos de Proteção | ⚠️ Sem categoria |
| 40151900 | Luvas de Borracha | ⚠️ Sem categoria |
| 48115900 | Fita Adesiva | ⚠️ Sem categoria |
| 48191000 | Caixas de Papelão | ⚠️ Sem categoria |
| 48201000 | Cadernos | ⚠️ Sem categoria |
| 48209000 | Papéis | ⚠️ Sem categoria |
| 62101000 | Roupas de Proteção | ⚠️ Sem categoria |
| 82041100 | Chaves Combinadas | ⚠️ Sem categoria |
| 82054000 | Chaves de Fenda | ⚠️ Sem categoria |
| 82073000 | Alicates | ⚠️ Sem categoria |
| 84433210 | Impressoras | ⚠️ Sem categoria |
| 84713012 | Computadores | ⚠️ Sem categoria |
| 85171231 | Smartphones | ⚠️ Sem categoria |
| 85176255 | Roteadores | ⚠️ Sem categoria |
| 99999999 | Outros Serviços | ⚠️ Sem categoria |

### **📍 Referência na Documentação:**

- ✅ Mencionado em `GUIA_COMPLETO_SISTEMA.md` (linha 166): "40 NCMs padrão já importados"
- ✅ API: `src/app/api/fiscal/ncm-categories/route.ts`
- ✅ API: `src/app/api/admin/seed-ncm-categories/route.ts`
- ✅ API: `src/app/api/admin/run-ncm-migration/route.ts`

---

## 2️⃣ ESTRUTURA NOVA: pcg_ncm_rules (REFATORAÇÃO)

### **📊 Situação Atual:**

```
✅ Total: 32 regras
   Monofásicas (PIS/COFINS): 21 regras (66%)
   Com ICMS-ST: 26 regras (81%)
   Cobertura: 8 categorias de produtos
```

### **🏗️ Estrutura da Tabela:**

```sql
CREATE TABLE pcg_ncm_rules (
  id                                INT IDENTITY PRIMARY KEY,
  organization_id                   INT NOT NULL,
  pcg_id                            INT NOT NULL,           -- FK para PCG (Gerencial)
  ncm_code                          NVARCHAR(10) NOT NULL,
  ncm_description                   NVARCHAR(255),
  
  -- Flags Fiscais Automáticas
  flag_pis_cofins_monofasico        BIT DEFAULT 0,
  flag_icms_st                      BIT DEFAULT 0,
  flag_icms_diferimento             BIT DEFAULT 0,
  flag_ipi_suspenso                 BIT DEFAULT 0,
  flag_importacao                   BIT DEFAULT 0,
  
  priority                          INT DEFAULT 100,
  is_active                         BIT DEFAULT 1,
  created_at                        DATETIME2 DEFAULT GETDATE(),
  updated_at                        DATETIME2 DEFAULT GETDATE(),
  created_by                        NVARCHAR(255),
  updated_by                        NVARCHAR(255),
  deleted_at                        DATETIME2 NULL,
  version                           INT DEFAULT 1
);
```

### **📋 Lista Completa das 32 Regras:**

#### **COMBUSTÍVEIS (1 regra):**

| NCM | Descrição | PCG | Monofásico | ICMS-ST |
|-----|-----------|-----|------------|---------|
| 2710.19.21 | Óleo Diesel S-10 / S-500 | G-1648 | ✅ | ✅ |

#### **ARLA 32 (1 regra):**

| NCM | Descrição | PCG | Monofásico | ICMS-ST |
|-----|-----------|-----|------------|---------|
| 3102.10.10 | Arla 32 (Solução de Ureia) | G-11031 | ❌ | ❌ |

#### **LUBRIFICANTES E FILTROS (5 regras):**

| NCM | Descrição | PCG | Monofásico | ICMS-ST |
|-----|-----------|-----|------------|---------|
| 2710.19.32 | Óleos Lubrificantes | G-3245 | ❌ | ✅ |
| 2710.19.92 | Graxas Lubrificantes | G-3245 | ❌ | ✅ |
| 3820.00.00 | Aditivos de Radiador | G-3245 | ❌ | ✅ |
| 8421.23.00 | Filtros de Óleo/Combustível | G-3245 | ✅ | ✅ |
| 8421.31.00 | Filtros de Ar | G-3245 | ✅ | ✅ |

#### **PNEUS (3 regras):**

| NCM | Descrição | PCG | Monofásico | ICMS-ST |
|-----|-----------|-----|------------|---------|
| 4011.20.90 | Pneus Novos de Carga | G-1649 | ✅ | ✅ |
| 4013.10.90 | Câmaras de Ar | G-1649 | ✅ | ❌ |
| 4012.90.90 | Protetores | G-1649 | ✅ | ❌ |

#### **RECAPAGEM (1 regra):**

| NCM | Descrição | PCG | Monofásico | ICMS-ST |
|-----|-----------|-----|------------|---------|
| 4012.12.00 | Pneus Recapados | G-1653 | ❌ | ❌ |

#### **PEÇAS MECÂNICAS (11 regras - TODAS MONOFÁSICAS):**

| NCM | Descrição | PCG | Monofásico | ICMS-ST |
|-----|-----------|-----|------------|---------|
| 6813.81.10 | Pastilhas de Freio | G-1654 | ✅ | ✅ |
| 8708.30.90 | Tambores e Discos | G-1654 | ✅ | ✅ |
| 8708.80.00 | Amortecedores | G-1654 | ✅ | ✅ |
| 7320.10.00 | Feixe de Molas | G-1654 | ✅ | ✅ |
| 8409.99.12 | Bielas/Pistões | G-1654 | ✅ | ✅ |
| 8413.30.10 | Bombas Injetoras | G-1654 | ✅ | ✅ |
| 4010.31.00 | Correias | G-1654 | ✅ | ✅ |
| 8708.93.00 | Embreagens | G-1654 | ✅ | ✅ |
| 8708.40.90 | Caixas de Câmbio | G-1654 | ✅ | ✅ |
| 8482.10.10 | Rolamentos | G-1654 | ✅ | ✅ |
| 7318.15.00 | Parafusos | G-1654 | ✅ | ✅ |

#### **PEÇAS ELÉTRICAS (5 regras - TODAS MONOFÁSICAS):**

| NCM | Descrição | PCG | Monofásico | ICMS-ST |
|-----|-----------|-----|------------|---------|
| 8507.10.10 | Baterias | G-1657 | ✅ | ✅ |
| 8511.40.00 | Motores de Partida | G-1657 | ✅ | ✅ |
| 8511.50.10 | Alternadores | G-1657 | ✅ | ✅ |
| 8512.20.11 | Faróis e Lanternas | G-1657 | ✅ | ✅ |
| 8539.21.10 | Lâmpadas | G-1657 | ✅ | ✅ |

#### **LOGÍSTICA (3 regras):**

| NCM | Descrição | PCG | Monofásico | ICMS-ST |
|-----|-----------|-----|------------|---------|
| 4415.20.00 | Paletes de Madeira | G-3514 | ❌ | ❌ |
| 3920.10.99 | Filme Stretch | G-3514 | ❌ | ❌ |
| 2711.19.10 | Gás GLP | G-3515 | ✅ | ✅ |

#### **FERRAMENTAS (1 regra):**

| NCM | Descrição | PCG | Monofásico | ICMS-ST |
|-----|-----------|-----|------------|---------|
| 8204.11.00 | Ferramentas Manuais | G-5101 | ❌ | ✅ |

#### **LIMPEZA (1 regra):**

| NCM | Descrição | PCG | Monofásico | ICMS-ST |
|-----|-----------|-----|------------|---------|
| 3402.20.00 | Desengraxantes | G-9575 | ❌ | ✅ |

### **📍 Referência na Documentação:**

- ✅ **MASTER_DATA_SEED_EXECUTADO.md** - Estrutura completa documentada
- ✅ **REFATORACAO_NCM_PCG.md** - Explicação da refatoração
- ✅ **EXEMPLO_USO_PCG_NCM.md** - Exemplos de uso
- ✅ **VINCULO_INTELIGENCIA_FINANCEIRA_PCG_DFC.md** - Integração PCG → DFC

---

## 3️⃣ COMPARAÇÃO: ANTIGA vs NOVA

### **📊 Tabela Comparativa:**

| Aspecto | ncm_financial_categories (ANTIGA) | pcg_ncm_rules (NOVA) |
|---------|----------------------------------|---------------------|
| **Total de NCMs** | 40 | 32 |
| **Estrutura** | NCM → Categoria Financeira | NCM → PCG (Gerencial) |
| **Flags Fiscais** | ❌ Não tem | ✅ 5 flags automáticas |
| **Monofásico** | ❌ Não controla | ✅ 21 regras (66%) |
| **ICMS-ST** | ❌ Não controla | ✅ 26 regras (81%) |
| **Cobertura** | 47,5% (19/40) | 100% (todas com PCG) |
| **Link com PCC** | ✅ chart_account_id | ❌ Indireto via PCG |
| **Link com PCG** | ❌ Não tem | ✅ pcg_id |
| **Wildcards** | ❌ Não suporta | ✅ Suporta (ex: 8421*) |
| **Prioridade** | ❌ Não tem | ✅ Campo priority |
| **Status** | ❌ Inativo no código | ✅ Ativo e funcional |

### **🔄 NCMs Comuns nas Duas Estruturas:**

| NCM | Antiga (Cat. Financeira) | Nova (PCG) | Status |
|-----|-------------------------|------------|--------|
| 27101932 | Diesel S10 → Cat 6 | 2710.19.21 → G-1648 | ✅ Coberto |
| 40116100 | Pneu Caminhão → Cat 7 | 4011.20.90 → G-1649 | ✅ Coberto |
| 40139000 | Câmara de Ar → Cat 7 | 4013.10.90 → G-1649 | ✅ Coberto |
| 84212300 | Filtro Óleo → Cat 7 | 8421.23.00 → G-3245 | ✅ Coberto |
| 84213100 | Filtro Ar → Cat 7 | 8421.31.00 → G-3245 | ✅ Coberto |
| 85071000 | Bateria → Cat 7 | 8507.10.10 → G-1657 | ✅ Coberto |

### **⚠️ NCMs SOMENTE na Estrutura Antiga (sem migração):**

| NCM | Descrição | Categoria | Situação |
|-----|-----------|-----------|----------|
| 27101211 | Óleo de Motor | 7 | ⚠️ Não migrado para PCG |
| 27101219 | Óleo Lubrificante Mineral | 7 | ⚠️ Não migrado para PCG |
| 27101912 | Gasolina | 6 | ⚠️ Não migrado para PCG |
| 27101929 | Etanol | 6 | ⚠️ Não migrado para PCG |
| 27101931 | Diesel S500 | 6 | ⚠️ Não migrado para PCG |
| 27101990 | Graxa | 7 | ⚠️ Não migrado para PCG |
| 40113000 | Pneu Borracha Maciça | 7 | ⚠️ Não migrado para PCG |
| 40116200 | Pneu Ônibus | 7 | ⚠️ Não migrado para PCG |
| 84099199 | Motor Diesel | 7 | ⚠️ Não migrado para PCG |
| 85123000 | Buzina | 7 | ⚠️ Não migrado para PCG |
| 85364900 | Relé | 7 | ⚠️ Não migrado para PCG |
| 85369090 | Conector Elétrico | 7 | ⚠️ Não migrado para PCG |
| 87089900 | Peças Veículos | 7 | ⚠️ Não migrado para PCG |

**Total:** 13 NCMs na antiga que não foram migrados para a nova estrutura.

---

## 4️⃣ PROBLEMAS IDENTIFICADOS

### **❌ Problema 1: Estrutura Duplicada**

- Sistema tem **DUAS tabelas** fazendo funções similares
- **ncm_financial_categories** parece estar **obsoleta** (não mencionada nos docs recentes)
- **pcg_ncm_rules** é a estrutura atual e funcional

### **❌ Problema 2: NCMs sem Categoria (Antiga)**

- 21 NCMs (52,5%) sem categoria financeira
- Não podem ser usados para classificação automática
- Exemplos: Alimentícios, Limpeza, Papelaria, TI

### **❌ Problema 3: Falta de Migração**

- 13 NCMs da estrutura antiga não foram migrados para a nova
- Especialmente NCMs de:
  - Gasolina/Etanol
  - Óleos lubrificantes específicos
  - Pneus de ônibus
  - Componentes elétricos (buzina, relé, conectores)

### **❌ Problema 4: Inconsistência de Código NCM**

Estrutura antiga usa 8 dígitos sem pontos:
```
27101932 (Diesel S10)
```

Estrutura nova usa formato com pontos:
```
2710.19.21 (Diesel S10)
```

---

## 5️⃣ RECOMENDAÇÕES

### **Opção A: Depreciar Estrutura Antiga (RECOMENDADO)**

**Ação:**
1. ✅ Migrar os 13 NCMs faltantes para `pcg_ncm_rules`
2. ✅ Marcar `ncm_financial_categories` como obsoleta
3. ✅ Atualizar APIs para usar apenas `pcg_ncm_rules`
4. ✅ Manter tabela antiga por 6 meses (histórico)

**Vantagens:**
- ✅ Estrutura única e moderna
- ✅ Flags fiscais automáticas
- ✅ Vinculação com PCG (gerencial)
- ✅ Suporte a wildcards

### **Opção B: Sincronizar as Duas Estruturas**

**Ação:**
1. ✅ Criar trigger para sincronizar as duas tabelas
2. ✅ Manter compatibilidade com código legado

**Desvantagens:**
- ❌ Complexidade desnecessária
- ❌ Manutenção duplicada
- ❌ Possíveis inconsistências

### **Opção C: Unificar em Nova Estrutura**

**Ação:**
1. ✅ Criar `ncm_master` com TODOS os campos
2. ✅ Migrar dados das duas tabelas
3. ✅ Depreciar ambas as antigas

**Vantagens:**
- ✅ Estrutura completa e unificada
- ✅ Suporte a ambos os cenários

---

## 6️⃣ SCRIPT DE MIGRAÇÃO

### **Script: Migrar 13 NCMs para pcg_ncm_rules**

```typescript
// scripts/migrate-missing-ncms.ts
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log("🔄 Migrando 13 NCMs faltantes para pcg_ncm_rules...\n");
  
  const pool = await sql.connect({
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    server: process.env.DB_HOST || "vpsw4722.publiccloud.com.br",
    database: process.env.DB_NAME!,
    options: { encrypt: false, trustServerCertificate: true },
    port: 1433,
  });

  const missingNcms = [
    // Lubrificantes
    { ncm: '2710.19.11', desc: 'Óleo de Motor', pcg: 3245, mono: 0, st: 1 },
    { ncm: '2710.19.19', desc: 'Óleo Lubrificante Mineral', pcg: 3245, mono: 0, st: 1 },
    { ncm: '2710.19.90', desc: 'Graxa Lubrificante', pcg: 3245, mono: 0, st: 1 },
    
    // Combustíveis
    { ncm: '2710.19.12', desc: 'Gasolina Automotiva', pcg: 1648, mono: 1, st: 1 },
    { ncm: '2710.19.29', desc: 'Etanol Combustível', pcg: 1648, mono: 1, st: 1 },
    { ncm: '2710.19.31', desc: 'Diesel S500', pcg: 1648, mono: 1, st: 1 },
    
    // Pneus
    { ncm: '4011.30.00', desc: 'Pneus de Borracha Maciça', pcg: 1649, mono: 1, st: 1 },
    { ncm: '4011.62.00', desc: 'Pneus para Ônibus', pcg: 1649, mono: 1, st: 1 },
    
    // Peças Mecânicas
    { ncm: '8409.91.99', desc: 'Motores Diesel - Peças', pcg: 1654, mono: 1, st: 1 },
    
    // Peças Elétricas
    { ncm: '8512.30.00', desc: 'Buzinas Elétricas', pcg: 1657, mono: 1, st: 1 },
    { ncm: '8536.49.00', desc: 'Relés', pcg: 1657, mono: 1, st: 1 },
    { ncm: '8536.90.90', desc: 'Conectores Elétricos', pcg: 1657, mono: 1, st: 1 },
    { ncm: '8708.99.00', desc: 'Peças de Veículos', pcg: 1654, mono: 1, st: 1 },
  ];

  let inserted = 0;
  for (const item of missingNcms) {
    try {
      await pool.request()
        .input('org_id', sql.Int, 1)
        .input('pcg_id', sql.Int, item.pcg)
        .input('ncm', sql.NVarChar, item.ncm)
        .input('desc', sql.NVarChar, item.desc)
        .input('mono', sql.Bit, item.mono)
        .input('st', sql.Bit, item.st)
        .query(`
          IF NOT EXISTS (
            SELECT 1 FROM pcg_ncm_rules 
            WHERE ncm_code = @ncm AND organization_id = @org_id
          )
          BEGIN
            INSERT INTO pcg_ncm_rules (
              organization_id, pcg_id, ncm_code, ncm_description,
              flag_pis_cofins_monofasico, flag_icms_st,
              priority, is_active, created_by, created_at, updated_at
            )
            VALUES (
              @org_id, @pcg_id, @ncm, @desc,
              @mono, @st,
              10, 1, 'MIGRATION', GETDATE(), GETDATE()
            )
          END
        `);
      
      console.log(`✅ ${item.ncm} - ${item.desc}`);
      inserted++;
    } catch (e: any) {
      console.log(`❌ ${item.ncm} - Erro: ${e.message}`);
    }
  }

  const total = await pool.request().query(`
    SELECT COUNT(*) as t 
    FROM pcg_ncm_rules 
    WHERE organization_id = 1 AND deleted_at IS NULL
  `);

  console.log(`\n📊 Migração concluída:`);
  console.log(`   Inseridos: ${inserted}/13`);
  console.log(`   Total PCG-NCM Rules: ${total.recordset[0].t}`);

  await pool.close();
}

run();
```

**Executar:**
```bash
npx tsx scripts/migrate-missing-ncms.ts
```

---

## ✅ 7️⃣ CONCLUSÃO

### **Situação Atual:**

```
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║  📊 ESTRUTURAS DE NCM NO SISTEMA                                  ║
║                                                                    ║
║  🗄️  Antiga: ncm_financial_categories (40 NCMs)                   ║
║      └─ 47,5% com categoria                                        ║
║      └─ Aparentemente OBSOLETA                                     ║
║                                                                    ║
║  🆕 Nova: pcg_ncm_rules (32 regras)                               ║
║      └─ 100% funcional                                            ║
║      └─ Flags fiscais automáticas                                 ║
║      └─ Vinculação com PCG                                        ║
║                                                                    ║
║  ⚠️  13 NCMs da antiga não migrados para nova                     ║
║  ⚠️  Estrutura duplicada gera confusão                            ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

### **Recomendação Final:**

**Opção A (RECOMENDADO):**
1. ✅ Migrar 13 NCMs faltantes para `pcg_ncm_rules`
2. ✅ Marcar `ncm_financial_categories` como obsoleta
3. ✅ Total final: **45 regras PCG-NCM** (32 + 13)

---

**Auditor:** Sistema Aura Core  
**Data:** 12 de Dezembro de 2025  
**Status:** ✅ AUDITORIA NCM COMPLETA - AGUARDANDO DECISÃO




