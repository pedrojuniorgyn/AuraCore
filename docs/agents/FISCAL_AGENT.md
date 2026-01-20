# Fiscal Agent

Agente especializado em legislação fiscal brasileira para transportadoras.

## Visão Geral

O Fiscal Agent é o primeiro agente implementado no AuraCore Agents. Ele é especializado em:

- Cálculos de ICMS (interestadual e interno)
- Validação de documentos fiscais (CTe, NFe)
- Consultas à legislação fiscal brasileira
- Simulação da Reforma Tributária 2026
- Orientação sobre CFOP e CST

## Domínios de Conhecimento

### Legislação

- **ICMS**: Lei Kandir (LC 87/96), Convênio ICMS 142/18
- **PIS/COFINS**: Leis 10.637/02 e 10.833/03
- **Reforma Tributária 2026**: EC 132/23, IBS e CBS
- **Documentos Eletrônicos**: CTe, NFe, MDFe, NFS-e
- **SPED**: EFD-ICMS/IPI, EFD-Contribuições

### Base de Conhecimento

O agente utiliza o Knowledge Module do AuraCore (ChromaDB) para consultar:

- Legislação indexada
- Convênios CONFAZ
- INs da RFB
- Jurisprudência relevante

## Tools Disponíveis

### 1. calculate_icms

Calcula o ICMS para operações de transporte.

```python
# Exemplo
result = await calculate_icms(
    valor_operacao=10000.00,
    uf_origem="SP",
    uf_destino="RJ",
    tipo_operacao="transporte_carga",
)

# Resultado
{
    "icms_valor": 1200.00,
    "aliquota": 12.0,
    "base_calculo": 10000.00,
    "cfop_sugerido": "6.353",
    "cst": "00",
    "reasoning": ["1. Operação INTERESTADUAL...", "2. Alíquota..."]
}
```

### 2. validate_cte

Valida um CTe antes de enviar para autorização.

```python
# Exemplo
result = await validate_cte(cte_id="cte-123-456")

# Resultado
{
    "valid": True,
    "errors": [],
    "warnings": ["⚠️ Peso total não informado"],
    "recommendation": "✅ CTe válido para autorização."
}
```

### 3. query_legislation

Consulta a base de conhecimento de legislação.

```python
# Exemplo
result = await query_legislation(
    query="Qual a alíquota ICMS interestadual SP para BA?",
    legislation_types=["ICMS"],
    top_k=5,
)

# Resultado
{
    "results": [
        {
            "content": "Art. 155, §2º, VII...",
            "source": "Lei Kandir - LC 87/96",
            "relevance_score": 92.3
        }
    ]
}
```

### 4. simulate_tax

Simula carga tributária comparando cenários.

```python
# Exemplo
result = await simulate_tax(
    valor_operacao=100000.00,
    uf_origem="SP",
    uf_destino="MG",
)

# Resultado
{
    "cenario_atual": {"total": 16250.00, "carga_percentual": 16.25},
    "cenario_2026": {"total": 16350.00, "carga_percentual": 16.35},
    "cenario_2033": {"total": 34250.00, "carga_percentual": 34.25},
    "comparativo": {"impacto": "NEGATIVO", "variacao_percentual": 110.77}
}
```

### 5. check_nfe

Verifica uma NFe pela chave de acesso.

```python
# Exemplo
result = await check_nfe(
    chave_nfe="35240112345678901234550010000000011234567890"
)

# Resultado
{
    "found": True,
    "status": "autorizada",
    "emitente": {"cnpj": "12345678901234", "nome": "Empresa XYZ"},
    "valores": {"total": 50000.00, "icms": 6000.00}
}
```

## Exemplos de Uso

### Cálculo de ICMS

**Usuário:** "Qual o ICMS para um frete de R$ 10.000 de SP para RJ?"

**Agente:**
```
Vou calcular o ICMS para essa operação.

[Tool: calculate_icms]

## Resultado do Cálculo

| Item | Valor |
|------|-------|
| **Valor da Operação** | R$ 10.000,00 |
| **UF Origem** | SP |
| **UF Destino** | RJ |
| **Alíquota** | 12% |
| **ICMS** | R$ 1.200,00 |

### Raciocínio
1. Operação INTERESTADUAL: SP → RJ
2. Alíquota interestadual: 12% (regra geral)
3. Base de cálculo integral: R$ 10.000,00
4. ICMS = R$ 10.000,00 × 12% = R$ 1.200,00

### CFOP Sugerido
- **6.353** - Prestação interestadual de transporte

**Base Legal:** LC 87/96, Art. 155 II CF/88, Resolução SF 22/89
```

### Validação de CTe

**Usuário:** "Valide o CTe 12345 antes de eu autorizar"

**Agente:**
```
Vou validar o CTe para você.

[Tool: validate_cte]

## Resultado da Validação

**Status:** ✅ Válido para autorização

### Resumo
- **Número:** 12345
- **Série:** 1
- **Emitente:** Transportadora ABC
- **Tomador:** Empresa XYZ
- **CFOP:** 6.353
- **Valor Total:** R$ 5.000,00
- **ICMS:** R$ 600,00

### Alertas
⚠️ Peso total não informado ou zerado

### Recomendação
✅ CTe válido para autorização. Prossiga com o envio.
```

## Guardrails

| Operação | Risco | Requer Aprovação |
|----------|-------|------------------|
| query_legislation | LOW | Não |
| calculate_icms | LOW | Não |
| simulate_tax | LOW | Não |
| check_nfe | LOW | Não |
| validate_cte | MEDIUM | Não |
| authorize_cte | HIGH | Sim |
| generate_sped | CRITICAL | Sim |

## Configuração

### Variáveis de Ambiente

```env
# ChromaDB (Knowledge Module)
CHROMA_HOST=chromadb
CHROMA_PORT=8000

# AuraCore API
AURACORE_API_URL=http://web:3000
```

## Próximos Passos

1. Adicionar tool para autorização de CTe (com guardrail HIGH)
2. Integrar com SPED para geração de arquivos
3. Adicionar suporte a MDFe
4. Implementar análise de benefícios fiscais
