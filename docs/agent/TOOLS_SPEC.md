# 🛠️ Agent Tools Specification

## Visão Geral

Os Tools do Agente AuraCore seguem o padrão LangChain e são organizados por módulo funcional.

## Padrão de Implementação

```typescript
import { Tool } from '@langchain/core/tools';
import { z } from 'zod';

export class ExampleTool extends Tool {
  name = 'example_tool';
  description = 'Descrição clara do que o tool faz e quando usar';
  
  schema = z.object({
    param1: z.string().describe('Descrição do parâmetro'),
    param2: z.number().optional().describe('Parâmetro opcional'),
  });
  
  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    // Implementação
    return JSON.stringify({ success: true, data: result });
  }
}
```

---

## Tools por Módulo

### Fiscal

#### ImportNFeTool

**Propósito:** Importar NFe de diferentes fontes para o AuraCore.

**Input:**
```typescript
{
  source: 'email' | 'drive' | 'upload';
  identifier: string; // messageId, fileId, ou base64
  validate_only?: boolean; // Apenas validar sem importar
}
```

**Output:**
```typescript
{
  success: boolean;
  nfeId?: string;
  summary?: string;
  errors?: string[];
  data?: {
    chaveAcesso: string;
    numero: string;
    serie: string;
    emitente: string;
    valor: number;
  };
}
```

**Workflow:**
1. Obter documento da fonte (Gmail, Drive, ou upload)
2. Processar com Document AI
3. Validar dados extraídos
4. Inserir no AuraCore
5. Retornar resultado

---

#### ConsultSPEDTool

**Propósito:** Consultar registros SPED para análise ou auditoria.

**Input:**
```typescript
{
  tipo: 'fiscal' | 'contribuicoes' | 'ecd';
  periodo: {
    inicio: string; // YYYY-MM
    fim: string;
  };
  filtros?: {
    cfop?: string[];
    ncm?: string[];
    participante?: string; // CNPJ
  };
}
```

**Output:**
```typescript
{
  success: boolean;
  registros: number;
  resumo: {
    total_entradas: number;
    total_saidas: number;
    icms_debito: number;
    icms_credito: number;
    pis_debito: number;
    pis_credito: number;
    cofins_debito: number;
    cofins_credito: number;
  };
  detalhes?: any[]; // Se solicitado
}
```

---

#### CalculateTaxTool

**Propósito:** Calcular impostos para operação fiscal.

**Input:**
```typescript
{
  operacao: 'venda' | 'compra' | 'transferencia' | 'devolucao' | 'servico';
  uf_origem: string;
  uf_destino: string;
  valor: number;
  ncm?: string;
  codigo_servico?: string;
  regime_tributario: 'lucro_real' | 'lucro_presumido' | 'simples';
}
```

**Output:**
```typescript
{
  success: boolean;
  impostos: {
    icms: { base: number; aliquota: number; valor: number };
    pis: { base: number; aliquota: number; valor: number };
    cofins: { base: number; aliquota: number; valor: number };
    ipi?: { base: number; aliquota: number; valor: number };
    iss?: { base: number; aliquota: number; valor: number };
  };
  cfop: string;
  cst_icms: string;
  cst_pis: string;
  cst_cofins: string;
}
```

---

### Financial

#### ReconcileBankTool

**Propósito:** Conciliar extrato bancário com movimentações financeiras.

**Input:**
```typescript
{
  source: 'email' | 'drive' | 'upload' | 'ofx';
  identifier: string;
  conta_id: number;
  periodo?: {
    inicio: string; // YYYY-MM-DD
    fim: string;
  };
}
```

**Output:**
```typescript
{
  success: boolean;
  resumo: {
    total_extrato: number;
    total_sistema: number;
    diferenca: number;
    conciliados: number;
    pendentes: number;
  };
  pendentes: {
    tipo: 'extrato' | 'sistema';
    data: string;
    valor: number;
    descricao: string;
    sugestao?: string; // Sugestão de match
  }[];
}
```

---

#### GenerateReportTool

**Propósito:** Gerar relatórios financeiros e exportar para Google Sheets.

**Input:**
```typescript
{
  tipo: 'dre' | 'balanco' | 'fluxo_caixa' | 'contas_receber' | 'contas_pagar';
  periodo: {
    inicio: string;
    fim: string;
  };
  formato: 'json' | 'sheets' | 'pdf';
  sheets_id?: string; // Se formato = sheets
}
```

**Output:**
```typescript
{
  success: boolean;
  tipo: string;
  periodo: { inicio: string; fim: string };
  dados: any; // Dados do relatório
  url?: string; // URL do Google Sheets ou Drive
}
```

---

### Workspace

#### SearchEmailTool

**Propósito:** Buscar emails no Gmail.

**Input:**
```typescript
{
  query: string; // Query do Gmail (ex: "from:fornecedor@empresa.com has:attachment")
  max_results?: number;
  include_body?: boolean;
  include_attachments?: boolean;
}
```

**Output:**
```typescript
{
  success: boolean;
  count: number;
  emails: {
    id: string;
    from: string;
    subject: string;
    date: string;
    snippet: string;
    body?: string;
    attachments?: { name: string; mimeType: string; size: number }[];
  }[];
}
```

---

#### CreateCalendarEventTool

**Propósito:** Criar evento no Google Calendar.

**Input:**
```typescript
{
  summary: string;
  description?: string;
  start: string; // ISO datetime
  end: string;
  attendees?: string[]; // Emails
  location?: string;
  reminder_minutes?: number;
}
```

**Output:**
```typescript
{
  success: boolean;
  event_id: string;
  link: string;
}
```

---

#### UpdateSheetTool

**Propósito:** Atualizar Google Sheets.

**Input:**
```typescript
{
  spreadsheet_id: string;
  range: string; // Ex: "Sheet1!A1:D10"
  values: string[][];
  mode: 'update' | 'append';
}
```

**Output:**
```typescript
{
  success: boolean;
  updated_cells: number;
  updated_range: string;
}
```

---

## Registro de Tools

```typescript
// src/agent/tools/index.ts
import { ImportNFeTool } from './fiscal/ImportNFeTool';
import { ConsultSPEDTool } from './fiscal/ConsultSPEDTool';
import { CalculateTaxTool } from './fiscal/CalculateTaxTool';
import { ReconcileBankTool } from './financial/ReconcileBankTool';
import { GenerateReportTool } from './financial/GenerateReportTool';
import { SearchEmailTool } from './workspace/SearchEmailTool';
import { CreateCalendarEventTool } from './workspace/CreateCalendarEventTool';
import { UpdateSheetTool } from './workspace/UpdateSheetTool';

export const allTools = [
  new ImportNFeTool(),
  new ConsultSPEDTool(),
  new CalculateTaxTool(),
  new ReconcileBankTool(),
  new GenerateReportTool(),
  new SearchEmailTool(),
  new CreateCalendarEventTool(),
  new UpdateSheetTool(),
];
```
