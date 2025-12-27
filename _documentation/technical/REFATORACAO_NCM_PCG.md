# 🏗️ REFATORAÇÃO: NCM Vinculado ao PCG (Plano Gerencial)

**Data:** 11/12/2025  
**Tipo:** Refatoração de Arquitetura Fiscal  
**Status:** 🔄 EM IMPLEMENTAÇÃO

---

## 📊 SITUAÇÃO ATUAL (AS-IS)

### **Problema:**
NCM está vinculado ao **PCC (Plano de Contas Contábil)**, gerando:
- ❌ Rigidez operacional (almoxarife não entende linguagem contábil)
- ❌ Erros de classificação
- ❌ Dependência do setor contábil para cadastros simples

### **Estrutura Atual:**
```
auto_classification_rules
├─ ncm_code: "27101251"
├─ chart_account_id → PCC (4.1.01.001 - Diesel S10)  ❌ RÍGIDO
└─ category_id → Categoria Financeira
```

### **Exemplo do Problema:**
```
Almoxarife precisa cadastrar "Filtro de Óleo"
├─ Deve escolher: PCC 4.1.03.001 - Peças de Reposição  ❌
├─ Problema: Não sabe o que é "4.1.03.001"
└─ Resultado: Erro de classificação
```

---

## 🎯 SITUAÇÃO DESEJADA (TO-BE)

### **Solução:**
NCM vinculado ao **PCG (Plano de Contas Gerencial)**, permitindo:
- ✅ Linguagem operacional (ex: "Peças de Reposição")
- ✅ Sugestão inteligente de NCMs por categoria gerencial
- ✅ Flags fiscais automáticas (Monofásico, ST, etc.)
- ✅ Independência do setor contábil

### **Nova Estrutura:**
```
pcg_ncm_rules (NOVA TABELA)
├─ pcg_id → PCG (G-1000 - Combustível)  ✅ OPERACIONAL
├─ ncm_code: "27101251"
├─ ncm_description: "Diesel S10 - Uso Veicular"
├─ flag_pis_cofins_monofasico: TRUE
├─ flag_icms_st: FALSE
└─ flag_icms_diferimento: FALSE
```

### **Exemplo da Melhoria:**
```
Almoxarife cadastra "Filtro de Óleo"
├─ Escolhe: PCG "Peças de Reposição"  ✅ ENTENDE
├─ Sistema sugere: NCMs 8421.* (Filtros)
├─ Almoxarife seleciona: 8421.23.00
└─ Flags fiscais aplicadas automaticamente  ✅
```

---

## 🗄️ NOVA TABELA: pcg_ncm_rules

### **DDL (SQL Server):**

```sql
-- ==========================================
-- TABELA: PCG NCM RULES
-- Relacionamento Gerencial x Fiscal
-- ==========================================

CREATE TABLE pcg_ncm_rules (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  
  -- Vinculação
  pcg_id INT NOT NULL,                           -- FK management_chart_of_accounts
  ncm_code NVARCHAR(10) NOT NULL,                -- Código NCM (8 dígitos: 84212300)
  ncm_description NVARCHAR(255),                 -- Descrição operacional amigável
  
  -- Flags de Inteligência Fiscal (Automação)
  flag_pis_cofins_monofasico BIT DEFAULT 0,      -- PIS/COFINS Monofásico
  flag_icms_st BIT DEFAULT 0,                    -- ICMS Substituição Tributária
  flag_icms_diferimento BIT DEFAULT 0,           -- ICMS Diferimento
  flag_ipi_suspenso BIT DEFAULT 0,               -- IPI Suspenso
  flag_importacao BIT DEFAULT 0,                 -- Item Importado
  
  -- Prioridade (menor = maior prioridade)
  priority INT DEFAULT 100,                      -- Para wildcards (8421* vs 8421.23.00)
  
  -- Status
  is_active BIT DEFAULT 1,                       -- Ativo/Inativo
  
  -- Enterprise Base Pattern
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  created_by NVARCHAR(255),                      -- FK users
  updated_by NVARCHAR(255),                      -- FK users
  deleted_at DATETIME2 NULL,                     -- Soft Delete
  version INT DEFAULT 1,                         -- Optimistic Locking
  
  -- Índices para Performance
  INDEX idx_pcg_ncm (pcg_id, ncm_code),         -- Busca por PCG
  INDEX idx_ncm_lookup (ncm_code, is_active),   -- Busca reversa (NCM → PCG)
  INDEX idx_org_active (organization_id, is_active, deleted_at), -- Filtro principal
  
  -- Constraints
  CONSTRAINT fk_pcg_ncm_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_pcg_ncm_pcg 
    FOREIGN KEY (pcg_id) REFERENCES management_chart_of_accounts(id),
  CONSTRAINT uk_pcg_ncm_org 
    UNIQUE (organization_id, pcg_id, ncm_code) -- Evita duplicatas
);

-- Comentário da Tabela
EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Relacionamento Inteligente entre Plano Gerencial (PCG) e NCM com Flags Fiscais Automáticas', 
  @level0type = N'SCHEMA', @level0name = N'dbo',
  @level1type = N'TABLE',  @level1name = N'pcg_ncm_rules';
```

---

## 📋 DRIZZLE SCHEMA

```typescript
// src/lib/db/schema.ts

// --- PCG NCM RULES (Relacionamento Gerencial x Fiscal) ---
export const pcgNcmRules = mssqlTable("pcg_ncm_rules", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Vinculação
  pcgId: int("pcg_id").notNull(), // FK management_chart_of_accounts
  ncmCode: nvarchar("ncm_code", { length: 10 }).notNull(),
  ncmDescription: nvarchar("ncm_description", { length: 255 }),
  
  // Flags de Inteligência Fiscal
  flagPisCofinsMono: bit("flag_pis_cofins_monofasico").default(false),
  flagIcmsSt: bit("flag_icms_st").default(false),
  flagIcmsDif: bit("flag_icms_diferimento").default(false),
  flagIpiSuspenso: bit("flag_ipi_suspenso").default(false),
  flagImportacao: bit("flag_importacao").default(false),
  
  // Prioridade
  priority: int("priority").default(100).notNull(),
  
  // Status
  isActive: bit("is_active").default(true).notNull(),
  
  // Enterprise Base
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  createdBy: nvarchar("created_by", { length: 255 }),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
}, (table) => ([
  uniqueIndex("pcg_ncm_rules_org_pcg_ncm_idx")
    .on(table.organizationId, table.pcgId, table.ncmCode)
    .where(sql`deleted_at IS NULL`),
]));
```

---

## 🔄 MIGRAÇÃO DE DADOS

### **Script de Migração:**

```sql
-- ==========================================
-- MIGRAÇÃO: PCC → PCG (NCM Rules)
-- ==========================================

-- 1. Criar mapeamento PCC → PCG (baseado em categorias)
-- Exemplo: PCC "Combustível" → PCG "Custo Gerencial Diesel"

DECLARE @org_id INT = 1;

-- 2. Migrar regras existentes (se houver)
-- Nota: Como chart_account_id está NULL nas regras atuais,
-- vamos criar regras NOVAS vinculadas ao PCG

-- 2.1 - Combustíveis → PCG G-1000
INSERT INTO pcg_ncm_rules (
  organization_id, pcg_id, ncm_code, ncm_description,
  flag_pis_cofins_monofasico, priority, is_active, created_by
)
SELECT 
  @org_id,
  1,  -- PCG G-1000 (Custo Gerencial Diesel)
  '27101251',
  'Diesel S10 - Uso Veicular',
  1,  -- Monofásico = SIM
  10, -- Alta prioridade
  1,
  'SYSTEM_MIGRATION'
UNION ALL
SELECT @org_id, 1, '27101259', 'Diesel S500 - Uso Veicular', 1, 10, 1, 'SYSTEM_MIGRATION'
UNION ALL
SELECT @org_id, 1, '31021010', 'Arla 32 (Ureia) - Aditivo Diesel', 0, 10, 1, 'SYSTEM_MIGRATION';

-- 2.2 - Peças → PCG G-1001 (Custo Gerencial Manutenção)
INSERT INTO pcg_ncm_rules (
  organization_id, pcg_id, ncm_code, ncm_description,
  flag_pis_cofins_monofasico, priority, is_active, created_by
)
SELECT @org_id, 2, '87083090', 'Sistemas de Freio - Veículos', 0, 10, 1, 'SYSTEM_MIGRATION'
UNION ALL
SELECT @org_id, 2, '8708*', 'Peças e Acessórios - Veículos (Genérico)', 0, 50, 1, 'SYSTEM_MIGRATION'
UNION ALL
SELECT @org_id, 2, '8421*', 'Filtros - Óleo/Ar/Combustível', 0, 20, 1, 'SYSTEM_MIGRATION'
UNION ALL
SELECT @org_id, 2, '8481*', 'Válvulas - Hidráulicas/Pneumáticas', 0, 20, 1, 'SYSTEM_MIGRATION';

-- 2.3 - Lubrificantes → PCG G-1001
INSERT INTO pcg_ncm_rules (
  organization_id, pcg_id, ncm_code, ncm_description,
  flag_pis_cofins_monofasico, priority, is_active, created_by
)
SELECT @org_id, 2, '27101931', 'Óleo Lubrificante - Motor', 0, 10, 1, 'SYSTEM_MIGRATION'
UNION ALL
SELECT @org_id, 2, '34031900', 'Graxa Lubrificante - Rolamentos', 0, 10, 1, 'SYSTEM_MIGRATION';

-- 2.4 - Pneus → PCG G-1001
INSERT INTO pcg_ncm_rules (
  organization_id, pcg_id, ncm_code, ncm_description,
  flag_pis_cofins_monofasico, priority, is_active, created_by
)
SELECT @org_id, 2, '4011*', 'Pneus - Todos os Tipos', 0, 10, 1, 'SYSTEM_MIGRATION';

-- Resultado: 11 regras migradas vinculadas ao PCG
```

---

## 🔧 SERVIÇO: PCG NCM CLASSIFIER

### **Novo Serviço:**

```typescript
// src/services/accounting/pcg-ncm-classifier.ts

import { db } from "@/lib/db";
import { pcgNcmRules, managementChartOfAccounts } from "@/lib/db/schema";
import { eq, and, isNull, like, asc } from "drizzle-orm";

export interface PcgNcmMatch {
  pcgId: number;
  pcgCode: string;
  pcgName: string;
  ncmCode: string;
  ncmDescription: string;
  flags: {
    pisCofinsMono: boolean;
    icmsSt: boolean;
    icmsDif: boolean;
    ipiSuspenso: boolean;
    importacao: boolean;
  };
  priority: number;
  matchType: "EXACT" | "WILDCARD";
}

/**
 * Sugere NCMs baseado na conta gerencial selecionada
 * USO: Dropdown de NCM no formulário de entrada de mercadoria
 */
export async function suggestNcmsByPcg(
  pcgId: number,
  organizationId: number
): Promise<PcgNcmMatch[]> {
  const rules = await db
    .select({
      rule: pcgNcmRules,
      pcg: managementChartOfAccounts,
    })
    .from(pcgNcmRules)
    .leftJoin(
      managementChartOfAccounts,
      eq(pcgNcmRules.pcgId, managementChartOfAccounts.id)
    )
    .where(
      and(
        eq(pcgNcmRules.organizationId, organizationId),
        eq(pcgNcmRules.pcgId, pcgId),
        eq(pcgNcmRules.isActive, true),
        isNull(pcgNcmRules.deletedAt)
      )
    )
    .orderBy(asc(pcgNcmRules.priority));

  return rules.map(({ rule, pcg }) => ({
    pcgId: rule.pcgId,
    pcgCode: pcg?.code || "",
    pcgName: pcg?.name || "",
    ncmCode: rule.ncmCode,
    ncmDescription: rule.ncmDescription || "",
    flags: {
      pisCofinsMono: rule.flagPisCofinsMono === 1,
      icmsSt: rule.flagIcmsSt === 1,
      icmsDif: rule.flagIcmsDif === 1,
      ipiSuspenso: rule.flagIpiSuspenso === 1,
      importacao: rule.flagImportacao === 1,
    },
    priority: rule.priority,
    matchType: rule.ncmCode.includes("*") ? "WILDCARD" : "EXACT",
  }));
}

/**
 * Busca flags fiscais de um NCM específico
 * USO: Auto-preencher checkboxes fiscais no formulário
 */
export async function getFiscalFlagsByNcm(
  ncmCode: string,
  organizationId: number
): Promise<PcgNcmMatch | null> {
  // Normaliza NCM
  const cleanNcm = ncmCode.replace(/\D/g, "");

  // Busca por NCM exato (prioridade)
  const [exactMatch] = await db
    .select({
      rule: pcgNcmRules,
      pcg: managementChartOfAccounts,
    })
    .from(pcgNcmRules)
    .leftJoin(
      managementChartOfAccounts,
      eq(pcgNcmRules.pcgId, managementChartOfAccounts.id)
    )
    .where(
      and(
        eq(pcgNcmRules.organizationId, organizationId),
        eq(pcgNcmRules.ncmCode, cleanNcm),
        eq(pcgNcmRules.isActive, true),
        isNull(pcgNcmRules.deletedAt)
      )
    )
    .orderBy(asc(pcgNcmRules.priority))
    .limit(1);

  if (exactMatch) {
    const { rule, pcg } = exactMatch;
    return {
      pcgId: rule.pcgId,
      pcgCode: pcg?.code || "",
      pcgName: pcg?.name || "",
      ncmCode: rule.ncmCode,
      ncmDescription: rule.ncmDescription || "",
      flags: {
        pisCofinsMono: rule.flagPisCofinsMono === 1,
        icmsSt: rule.flagIcmsSt === 1,
        icmsDif: rule.flagIcmsDif === 1,
        ipiSuspenso: rule.flagIpiSuspenso === 1,
        importacao: rule.flagImportacao === 1,
      },
      priority: rule.priority,
      matchType: "EXACT",
    };
  }

  // Se não achou exato, busca wildcard (ex: 8421*)
  const wildcardRules = await db
    .select({
      rule: pcgNcmRules,
      pcg: managementChartOfAccounts,
    })
    .from(pcgNcmRules)
    .leftJoin(
      managementChartOfAccounts,
      eq(pcgNcmRules.pcgId, managementChartOfAccounts.id)
    )
    .where(
      and(
        eq(pcgNcmRules.organizationId, organizationId),
        like(pcgNcmRules.ncmCode, "%*"),
        eq(pcgNcmRules.isActive, true),
        isNull(pcgNcmRules.deletedAt)
      )
    )
    .orderBy(asc(pcgNcmRules.priority));

  for (const { rule, pcg } of wildcardRules) {
    const pattern = rule.ncmCode.replace("*", "");
    if (cleanNcm.startsWith(pattern)) {
      return {
        pcgId: rule.pcgId,
        pcgCode: pcg?.code || "",
        pcgName: pcg?.name || "",
        ncmCode: rule.ncmCode,
        ncmDescription: rule.ncmDescription || "",
        flags: {
          pisCofinsMono: rule.flagPisCofinsMono === 1,
          icmsSt: rule.flagIcmsSt === 1,
          icmsDif: rule.flagIcmsDif === 1,
          ipiSuspenso: rule.flagIpiSuspenso === 1,
          importacao: rule.flagImportacao === 1,
        },
        priority: rule.priority,
        matchType: "WILDCARD",
      };
    }
  }

  return null;
}

/**
 * Classifica item automaticamente usando PCG
 * USO: Importação de NFe (substitui classificação por PCC)
 */
export async function classifyItemByPcg(
  ncmCode: string,
  organizationId: number
): Promise<{
  pcgId: number;
  pcgCode: string;
  pcgName: string;
  flags: any;
} | null> {
  const match = await getFiscalFlagsByNcm(ncmCode, organizationId);
  
  if (match) {
    return {
      pcgId: match.pcgId,
      pcgCode: match.pcgCode,
      pcgName: match.pcgName,
      flags: match.flags,
    };
  }
  
  return null;
}
```

---

## 🔌 API: PCG NCM RULES

### **Endpoint GET:** `/api/pcg-ncm-rules`

```typescript
// src/app/api/pcg-ncm-rules/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/auth/context";
import { suggestNcmsByPcg } from "@/services/accounting/pcg-ncm-classifier";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { organizationId } = getTenantContext();
    const { searchParams } = new URL(request.url);
    const pcgId = searchParams.get("pcg_id");

    if (!pcgId) {
      return NextResponse.json(
        { error: "pcg_id é obrigatório" },
        { status: 400 }
      );
    }

    const suggestions = await suggestNcmsByPcg(
      parseInt(pcgId),
      organizationId
    );

    return NextResponse.json({
      success: true,
      data: suggestions,
      total: suggestions.length,
    });
  } catch (error: any) {
    console.error("Erro ao buscar NCMs por PCG:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
```

### **Endpoint GET:** `/api/pcg-ncm-rules/fiscal-flags`

```typescript
// src/app/api/pcg-ncm-rules/fiscal-flags/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/auth/context";
import { getFiscalFlagsByNcm } from "@/services/accounting/pcg-ncm-classifier";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { organizationId } = getTenantContext();
    const { searchParams } = new URL(request.url);
    const ncmCode = searchParams.get("ncm_code");

    if (!ncmCode) {
      return NextResponse.json(
        { error: "ncm_code é obrigatório" },
        { status: 400 }
      );
    }

    const flags = await getFiscalFlagsByNcm(ncmCode, organizationId);

    if (!flags) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "NCM não encontrado nas regras",
      });
    }

    return NextResponse.json({
      success: true,
      data: flags,
    });
  } catch (error: any) {
    console.error("Erro ao buscar flags fiscais:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
```

---

## 🎨 COMPONENTE FRONTEND: PCG NCM Selector

### **Uso no Formulário:**

```tsx
// src/components/fiscal/pcg-ncm-selector.tsx

"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface PcgNcmSelectorProps {
  pcgId: number;
  value?: string;
  onChange: (ncm: string, flags: any) => void;
}

export function PcgNcmSelector({ pcgId, value, onChange }: PcgNcmSelectorProps) {
  const [ncmOptions, setNcmOptions] = useState<any[]>([]);
  const [selectedFlags, setSelectedFlags] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pcgId) return;

    setLoading(true);
    fetch(`/api/pcg-ncm-rules?pcg_id=${pcgId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNcmOptions(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, [pcgId]);

  const handleNcmChange = async (ncm: string) => {
    // Busca flags fiscais
    const res = await fetch(`/api/pcg-ncm-rules/fiscal-flags?ncm_code=${ncm}`);
    const data = await res.json();

    if (data.success && data.data) {
      setSelectedFlags(data.data.flags);
      onChange(ncm, data.data.flags);
    }
  };

  return (
    <div className="space-y-4">
      {/* Seletor de NCM */}
      <div>
        <Label>NCM (Sugestão Inteligente)</Label>
        <Select value={value} onValueChange={handleNcmChange} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o NCM..." />
          </SelectTrigger>
          <SelectContent>
            {ncmOptions.map((option) => (
              <SelectItem key={option.ncmCode} value={option.ncmCode}>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{option.ncmCode}</span>
                  <span className="text-muted-foreground">
                    {option.ncmDescription}
                  </span>
                  {option.matchType === "WILDCARD" && (
                    <Badge variant="outline" className="text-xs">
                      Genérico
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Flags Fiscais (Auto-preenchidas) */}
      {selectedFlags && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
          <Label className="text-sm font-semibold">Flags Fiscais (Automático):</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox checked={selectedFlags.pisCofinsMono} disabled />
            <Label className="text-sm">PIS/COFINS Monofásico</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox checked={selectedFlags.icmsSt} disabled />
            <Label className="text-sm">ICMS Substituição Tributária</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox checked={selectedFlags.icmsDif} disabled />
            <Label className="text-sm">ICMS Diferimento</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox checked={selectedFlags.ipiSuspenso} disabled />
            <Label className="text-sm">IPI Suspenso</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox checked={selectedFlags.importacao} disabled />
            <Label className="text-sm">Item Importado</Label>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📈 BENEFÍCIOS DA REFATORAÇÃO

### **1. Operacional:**
- ✅ Linguagem compreensível para o almoxarife
- ✅ Redução de erros de classificação
- ✅ Independência do setor contábil

### **2. Fiscal:**
- ✅ Flags fiscais aplicadas automaticamente
- ✅ Redução de risco de autuação
- ✅ Consistência nas obrigações acessórias

### **3. Técnico:**
- ✅ Separação de responsabilidades (PCG ≠ PCC)
- ✅ Facilidade de manutenção
- ✅ Escalabilidade (fácil adicionar novos NCMs)

---

## 🔄 COMPATIBILIDADE RETROATIVA

### **Opção A: Manter Ambos (Recomendado - Fase de Transição)**

```typescript
// Suporta AMBOS os métodos durante migração

async function classifyItem(ncm: string, orgId: number) {
  // 1. Tenta PCG (novo)
  const pcgMatch = await classifyItemByPcg(ncm, orgId);
  if (pcgMatch) return { method: "PCG", ...pcgMatch };

  // 2. Fallback para PCC (antigo)
  const pccMatch = await classifyItemByPcc(ncm, orgId);
  if (pccMatch) return { method: "PCC", ...pccMatch };

  // 3. Não classificado
  return null;
}
```

### **Opção B: Migração Total (Futuro)**

```sql
-- Depreciar auto_classification_rules
ALTER TABLE auto_classification_rules 
ADD deprecated BIT DEFAULT 0;

UPDATE auto_classification_rules 
SET deprecated = 1, is_active = 0;
```

---

**Status:** ✅ Documentação Completa  
**Próximo Passo:** Implementação da Tabela e Serviços  
**Prazo Estimado:** 2-3 horas













