# Relatórios PDF Avançados

**Status:** ✅ Implementado  
**Data:** 2026-02-03  
**Módulo:** Strategic  
**Complexidade:** Média

---

## 📋 VISÃO GERAL

Sistema completo de geração de relatórios profissionais em PDF para o módulo estratégico, seguindo arquitetura DDD/Hexagonal.

### Tipos de Relatórios

1. **BSC Completo** - Balanced Scorecard com todas perspectivas, KPIs e metas
2. **Desempenho** - Top 10 melhores e piores KPIs com análise estatística
3. **Aprovações** - Histórico de aprovações, tempo médio e análise de gargalos

### Características

- 📄 **Templates Profissionais:** Header, footer, seções estruturadas
- 📊 **Tabelas Formatadas:** jsPDF-autotable com temas customizáveis
- 🎨 **Brand Identity:** Cores AuraCore (purple primary)
- 📈 **Suporte a Gráficos:** html2canvas para renderizar charts como imagens
- 🔒 **Multi-tenancy:** Filtragem por organizationId + branchId
- 🏗️ **DDD-Compliant:** Service em application/, generator em infrastructure/

---

## 🏗️ ARQUITETURA

### Camadas DDD

```
src/modules/strategic/
├── application/
│   └── services/
│       └── reports/
│           └── ReportGeneratorService.ts    # ← Orquestração
├── infrastructure/
│   ├── pdf/
│   │   └── ReportPdfGenerator.ts            # ← jsPDF adapter
│   └── di/
│       └── StrategicModule.ts               # ← DI registration
```

### Componentes

| Componente | Responsabilidade | Camada |
|----|-----|---|
| `ReportGeneratorService` | Orquestração, busca dados, chama generator | Application |
| `ReportPdfGenerator` | Geração baixo nível de PDF (jsPDF) | Infrastructure |
| `/api/reports/generate` | HTTP endpoint, validação Zod | Presentation |

---

## 🔌 API

### Endpoint

```
POST /api/reports/generate
```

### Request Body

```typescript
{
  type: 'BSC_COMPLETE' | 'PERFORMANCE' | 'APPROVALS';
  period: {
    from: string; // ISO 8601
    to: string;   // ISO 8601
  };
  options?: {
    includeCharts?: boolean;
    includeComments?: boolean;
    orientation?: 'portrait' | 'landscape';
  };
}
```

### Response

- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="relatorio_*.pdf"`
- **X-Generated-At:** ISO 8601 timestamp

### Exemplo de Request

```bash
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: x-branch-id=1" \
  -d '{
    "type": "BSC_COMPLETE",
    "period": {
      "from": "2026-01-01T00:00:00Z",
      "to": "2026-02-03T23:59:59Z"
    },
    "options": {
      "includeCharts": false,
      "orientation": "portrait"
    }
  }' \
  -o relatorio.pdf
```

### Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200 | PDF gerado com sucesso |
| 400 | Input inválido ou erro de validação |
| 401 | Não autenticado |
| 500 | Erro interno do servidor |

---

## 📊 TIPOS DE RELATÓRIOS

### 1. BSC Completo

**Seções:**
- Summary Executivo (totais, distribuição de status)
- KPIs por Perspectiva (Financeira, Clientes, Processos, Aprendizado)
- Metas Estratégicas (código, descrição, prazo, progresso)

**Campos Exibidos:**
- Código, Nome, Valor Atual, Meta, Status (🟢/🟡/🔴), % Atingimento

### 2. Desempenho

**Seções:**
- Top 10 Melhores Desempenhos (maior % atingimento)
- Top 10 Piores Desempenhos (menor % atingimento)
- Análise Estatística (média, melhor, pior, distribuição)

**Métricas Calculadas:**
- Performance = (Valor Atual / Meta) × 100
- Média de atingimento de todos KPIs
- Contadores acima/abaixo da média

### 3. Aprovações

**Seções:**
- Summary de Aprovações (total, aprovadas, rejeitadas, pendentes)
- Histórico de Aprovações (últimas 20 entradas)
- Análise por Aprovador (top 10 com maior volume)

**Métricas:**
- Tempo médio de aprovação (dias)
- Taxa de aprovação por usuário
- Distribuição por tipo de entidade

---

## 🎨 DESIGN DO PDF

### Cores

| Elemento | Cor (RGB) | Uso |
|----------|-----------|-----|
| Primary | `[88, 86, 214]` | Headers de tabela, título |
| Text | `[0, 0, 0]` | Corpo de texto |
| Gray | `[128, 128, 128]` | Metadados, footer |

### Tipografia

| Elemento | Font | Size | Weight |
|----------|------|------|--------|
| Título Principal | Helvetica | 20pt | Bold |
| Subtítulo | Helvetica | 12pt | Normal |
| Título de Seção | Helvetica | 14pt | Bold |
| Corpo de Tabela | Helvetica | 9pt | Normal |
| Header de Tabela | Helvetica | 10pt | Bold |
| Footer | Helvetica | 8pt | Normal |

### Layout

- **Formato:** A4 (210mm × 297mm)
- **Orientação:** Portrait (padrão) ou Landscape
- **Margens:** 14mm (esquerda/direita), 20mm (topo/base)
- **Footer:** "Página X de Y - AuraCore ERP Logístico" (centralizado)

---

## 🔧 TECNOLOGIAS

### jsPDF 4.0.0

Biblioteca principal para geração de PDF.

```typescript
import { jsPDF } from 'jspdf';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

doc.text('Título', 14, 20);
doc.save('relatorio.pdf');
```

### jspdf-autotable 5.0.7

Plugin para tabelas formatadas.

```typescript
import 'jspdf-autotable';

doc.autoTable({
  head: [['Coluna 1', 'Coluna 2']],
  body: [['Valor A', 'Valor B']],
  theme: 'striped',
  headStyles: { fillColor: [88, 86, 214] },
});
```

### html2canvas 1.4.1

Para converter gráficos React/Recharts em imagens.

```typescript
import html2canvas from 'html2canvas';

const chartElement = document.getElementById('chart');
const canvas = await html2canvas(chartElement!);
const imageBase64 = canvas.toDataURL('image/png');

doc.addImage(imageBase64, 'PNG', x, y, width, height);
```

---

## 📝 EXEMPLOS DE USO

### No Dashboard Executivo

```typescript
const handleExport = async () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);

  const response = await fetch('/api/reports/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'BSC_COMPLETE',
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
    }),
  });

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'relatorio.pdf';
  a.click();
};
```

### CLI (para automação)

```bash
#!/bin/bash
# Script para gerar relatório mensal automaticamente

FROM=$(date -d "1 month ago" +%Y-%m-01T00:00:00Z)
TO=$(date +%Y-%m-%dT23:59:59Z)

curl -X POST http://localhost:3000/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: x-branch-id=1" \
  -d "{
    \"type\": \"BSC_COMPLETE\",
    \"period\": {
      \"from\": \"$FROM\",
      \"to\": \"$TO\"
    }
  }" \
  -o "relatorio_mensal_$(date +%Y-%m).pdf"
```

---

## ✅ VALIDAÇÃO

### Testes Manuais

```bash
# 1. Iniciar servidor
npm run dev

# 2. Testar API diretamente
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PERFORMANCE",
    "period": {
      "from": "2026-01-01T00:00:00Z",
      "to": "2026-02-03T23:59:59Z"
    }
  }' \
  -o relatorio_teste.pdf

# 3. Abrir PDF gerado
open relatorio_teste.pdf

# 4. Verificar:
# - Header com título, metadados
# - Tabelas formatadas com cores
# - Footer com numeração de páginas
# - Dados corretos (verificar no banco)
```

### Testes no Dashboard

1. Acessar `/strategic/analytics/executive`
2. Clicar em "Exportar PDF"
3. Aguardar download
4. Abrir PDF
5. Verificar conteúdo

---

## 🚀 PRÓXIMOS PASSOS

### TODO Imediato

- [ ] Implementar suporte a gráficos (html2canvas)
- [ ] Adicionar logo da organização no header
- [ ] Permitir customização de cores (brand identity)
- [ ] Cache de relatórios gerados (evitar regenerar)

### TODO Futuro

- [ ] Assinatura digital (certificado digital)
- [ ] Envio por email automático
- [ ] Agendamento de relatórios (cron jobs)
- [ ] Comparativo entre períodos (lado a lado)
- [ ] Templates customizáveis (Handlebars)
- [ ] Relatório de War Room
- [ ] Relatório de SWOT
- [ ] Relatório de Planos de Ação (5W2H)

---

## 📚 REFERÊNCIAS

- **jsPDF Docs:** https://github.com/parallax/jsPDF
- **jspdf-autotable:** https://github.com/simonbengtsson/jsPDF-AutoTable
- **html2canvas:** https://html2canvas.hertzen.com
- **ADR-0015:** Arquitetura DDD/Hexagonal
- **E8.4:** Épico Strategic Module

---

**Gerado por:** AgenteAura ⚡  
**Última atualização:** 2026-02-03
