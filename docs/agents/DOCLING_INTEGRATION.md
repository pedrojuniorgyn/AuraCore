# Docling Integration - Processamento de Documentos Fiscais

**Versão:** 1.0.0  
**Status:** Ativo  
**Tecnologia:** Docling (IBM)

## Visão Geral

O Docling é uma biblioteca da IBM para extração de dados de PDFs com alta precisão em tabelas (97.9%). É ideal para documentos fiscais brasileiros que contêm muitas tabelas estruturadas.

## Por que Docling?

| Característica | Docling | Alternativas |
|----------------|---------|--------------|
| Execução | 100% local | Cloud (dados sensíveis) |
| Licença | MIT | Proprietária |
| Precisão em tabelas | 97.9% | ~85-90% |
| Integração | LangChain/LlamaIndex | Limitada |
| OCR | Tesseract integrado | Externo |

## Documentos Suportados

| Documento | Descrição | Status |
|-----------|-----------|--------|
| DANFe | Nota Fiscal Eletrônica (PDF) | Disponível |
| DACTe | Conhecimento de Transporte (PDF) | Em desenvolvimento |
| Extratos Bancários | Conciliação financeira | Planejado |
| Contratos de Frete | Análise de cláusulas | Planejado |

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ POST /api/agents/documents/import
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agno FastAPI                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Fiscal Agent                              │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │          DocumentImporterTool                    │  │ │
│  │  │  ┌────────────────────────────────────────────┐  │  │ │
│  │  │  │         DoclingProcessor                   │  │  │ │
│  │  │  │  ┌──────────────────────────────────────┐  │  │  │ │
│  │  │  │  │        DanfeExtractor               │  │  │  │ │
│  │  │  │  └──────────────────────────────────────┘  │  │  │ │
│  │  │  └────────────────────────────────────────────┘  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. DoclingProcessor

Processador base que usa Docling para extrair texto, markdown e tabelas de PDFs.

```python
from src.services.document_processing import DoclingProcessor

processor = DoclingProcessor()
result = await processor.process_file("/path/to/document.pdf")

print(result.text)      # Texto extraído
print(result.markdown)  # Markdown formatado
print(result.tables)    # Tabelas estruturadas
```

### 2. DanfeExtractor

Extrator especializado em DANFe (Nota Fiscal Eletrônica).

```python
from src.services.document_processing import DanfeExtractor

extractor = DanfeExtractor()
result = await extractor.extract_from_file("/path/to/danfe.pdf")

if result.success:
    data = result.data
    print(f"Chave: {data.chave_acesso}")
    print(f"Total: R$ {data.valor_total}")
    print(f"ICMS: R$ {data.icms_valor}")
    print(f"Itens: {len(data.itens)}")
```

### 3. DocumentImporterTool

Tool do Fiscal Agent para importar documentos via chat.

```
Usuário: "Importe a DANFe do arquivo danfe_123.pdf"

Fiscal Agent:
1. Usa DocumentImporterTool
2. Processa com Docling
3. Extrai dados estruturados
4. Valida na SEFAZ (opcional)
5. Cria registro no sistema (opcional)
```

## Dados Extraídos da DANFe

| Campo | Descrição | Tipo |
|-------|-----------|------|
| chave_acesso | Chave de 44 dígitos | string |
| numero | Número da NFe | string |
| serie | Série da NFe | string |
| data_emissao | Data de emissão | string |
| emitente.cnpj | CNPJ do emitente | string |
| destinatario.documento | CNPJ/CPF do destinatário | string |
| valor_produtos | Valor total dos produtos | Decimal |
| valor_total | Valor total da nota | Decimal |
| icms_valor | Valor do ICMS | Decimal |
| itens | Lista de produtos | List[DanfeItem] |

## Configuração Docker

O `Dockerfile.docling` inclui:

- Tesseract OCR com idioma português
- Poppler para processamento de PDF
- Ghostscript para manipulação de PDF
- Cache de modelos Docling

```yaml
# docker-compose.coolify.yml
services:
  agents:
    build:
      dockerfile: Dockerfile.docling
    environment:
      DOCLING_CACHE_DIR: /data/docling_cache
      TESSERACT_CMD: /usr/bin/tesseract
    volumes:
      - docling_cache:/data/docling_cache
```

## API Endpoint

### POST /api/agents/documents/import

Upload de documento fiscal para extração.

**Request (FormData):**
- `file`: Arquivo PDF (máximo 10MB)
- `documentType`: "danfe", "dacte" ou "auto"
- `validateSefaz`: "true" ou "false"
- `createRecord`: "true" ou "false"

**Response:**
```json
{
  "success": true,
  "extracted_data": {
    "document_type": "NFE",
    "access_key": "35240112345678901234550010000000011234567890",
    "number": "1",
    "series": "1",
    "issue_date": "20/01/2026",
    "total_value": 1500.00,
    "icms_value": 180.00,
    "items_count": 5,
    "confidence_score": 0.9
  },
  "sefaz_valid": true,
  "message": "DANFe extraída com sucesso. Confiança: 90%"
}
```

### GET /api/agents/documents/import

Retorna tipos de documentos suportados.

## Score de Confiança

O score de confiança é calculado com base nos campos extraídos:

| Campo | Peso |
|-------|------|
| Chave de acesso (44 dígitos) | 30% |
| Número da nota | 20% |
| CNPJ do emitente | 20% |
| Valor total > 0 | 30% |

## Próximos Passos

1. Implementar DACTeExtractor
2. Integração real com SEFAZ para validação
3. Extrator de extratos bancários
4. Análise de contratos com LLM
