# Fleet Agent

Agente especializado em gestão de frota de veículos.

## Visão Geral

O Fleet Agent automatiza a gestão de frota, incluindo:
- Agendamento de manutenções preventivas e corretivas
- Controle de documentos e vencimentos
- Monitoramento de consumo de combustível

## Domínios de Conhecimento

- Manutenção veicular preventiva e corretiva
- Documentação (CRLV, seguro, tacógrafo, ANTT)
- Consumo de combustível e CPK
- Regulamentações CONTRAN e ANTT
- Lei do Motorista (13.103/2015)

## Tools Disponíveis

### 1. maintenance_scheduler

Gerencia agendamento de manutenções de veículos.

**Risk Level:** MEDIUM

**Ações:**
| Ação | Descrição |
|------|-----------|
| `schedule` | Agendar nova manutenção |
| `cancel` | Cancelar manutenção |
| `reschedule` | Reagendar manutenção |
| `list_pending` | Listar manutenções pendentes |
| `check_alerts` | Verificar alertas baseados em km/tempo |

**Tipos de Manutenção:**
- PREVENTIVE: Baseada em km ou tempo
- CORRECTIVE: Reparo de falhas
- PREDICTIVE: Baseada em análise de dados

**Exemplo de uso (schedule):**
```json
{
  "action": "schedule",
  "vehicle_id": 1,
  "maintenance_type": "PREVENTIVE",
  "scheduled_date": "2025-02-01",
  "items": [
    {
      "service_type": "OIL_CHANGE",
      "description": "Troca de óleo e filtro",
      "estimated_cost": 450.00,
      "estimated_hours": 1.5,
      "priority": "NORMAL"
    }
  ]
}
```

**Alertas de Manutenção:**
- KM_BASED: Baseado em quilometragem (ex: troca de óleo a cada 15.000km)
- TIME_BASED: Baseado em tempo (ex: revisão a cada 6 meses)
- CONDITION_BASED: Baseado em condição (ex: desgaste de pastilhas)

### 2. document_tracker

Monitora documentos de veículos e motoristas.

**Risk Level:** LOW

**Tipos de Consulta:**
| Tipo | Descrição |
|------|-----------|
| `vehicle` | Documentos de um veículo |
| `driver` | Documentos de um motorista |
| `expiring` | Documentos próximos do vencimento |
| `summary` | Resumo geral da frota |

**Documentos Monitorados:**
| Documento | Descrição | Renovação |
|-----------|-----------|-----------|
| CRLV | Licenciamento | Anual |
| INSURANCE | Seguro | Anual |
| TACHOGRAPH | Tacógrafo | Anual |
| ANTT | RNTRC | Conforme ANTT |
| CNH | Carteira motorista | 5-10 anos |
| MOPP | Produtos perigosos | 5 anos |
| ASO | Atestado saúde | Anual |

**Status de Documentos:**
- VALID: Documento válido
- EXPIRING_SOON: Vencendo em breve
- EXPIRED: Vencido
- MISSING: Não cadastrado

**Exemplo de uso (expiring):**
```json
{
  "query_type": "expiring",
  "days_ahead": 30,
  "document_types": ["CRLV", "INSURANCE"]
}
```

### 3. fuel_monitor

Analisa consumo e custos de combustível.

**Risk Level:** LOW

**Tipos de Consulta:**
| Tipo | Descrição |
|------|-----------|
| `vehicle` | Estatísticas de um veículo |
| `fleet_summary` | Resumo consolidado |
| `anomalies` | Detecção de anomalias |
| `comparison` | Comparação entre veículos |

**Métricas Calculadas:**
- Consumo médio (km/l)
- CPK (Custo por Quilômetro)
- Variação percentual vs. média
- Ranking de eficiência

**Tipos de Combustível:**
- DIESEL_S10: Diesel S10 (padrão)
- DIESEL_S500: Diesel S500
- ARLA32: Arla 32 (AdBlue)

**Tipos de Anomalias:**
| Tipo | Severidade | Descrição |
|------|------------|-----------|
| HIGH_VOLUME | HIGH | Abastecimento muito acima da média |
| CONSUMPTION_DROP | INFO | Queda brusca de consumo |
| MULTIPLE_REFUELS | CRITICAL | Múltiplos abastecimentos no dia |
| WRONG_FUEL | HIGH | Combustível incorreto |
| CONSUMPTION_SPIKE | MEDIUM | Aumento repentino de consumo |

**Exemplo de uso (vehicle):**
```json
{
  "query_type": "vehicle",
  "vehicle_id": 1,
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "include_records": true
}
```

## Exemplos de Conversação

### Manutenção
```
"Agende uma troca de óleo para o veículo ABC-1234 na próxima segunda"
"Quais veículos têm manutenção pendente esta semana?"
"Mostre os alertas de manutenção baseados em quilometragem"
"Cancele a manutenção MAINT-20250120-001"
```

### Documentos
```
"Quais documentos estão vencendo nos próximos 30 dias?"
"Qual a situação documental do veículo ABC-1234?"
"Mostre o resumo de conformidade da frota"
"Verifique os documentos do motorista João Silva"
```

### Combustível
```
"Qual o consumo médio do veículo ABC-1234 no último mês?"
"Compare o consumo dos veículos 1, 2 e 3"
"Detecte anomalias de consumo na frota"
"Mostre o resumo de combustível da frota"
```

## Conformidade Regulatória

| Regulamentação | Descrição |
|----------------|-----------|
| CONTRAN | Resoluções sobre documentação veicular |
| ANTT | Regulamentação de transporte de cargas |
| Lei 13.103/2015 | Lei do Motorista (jornada, descanso) |
| INMETRO | Aferição de tacógrafos |

## Integração com AuraCore

O Fleet Agent integra-se com as seguintes APIs do AuraCore:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| /api/fleet/vehicles | GET | Lista veículos |
| /api/fleet/vehicles/{id} | GET | Detalhes do veículo |
| /api/fleet/maintenance | GET/POST | Manutenções |
| /api/fleet/maintenance/{id} | PUT/DELETE | Gerenciar manutenção |
| /api/fleet/documents | GET | Documentos |
| /api/fleet/documents/expiring | GET | Vencimentos |
| /api/fleet/fuel | GET | Abastecimentos |
| /api/fleet/fuel/summary | GET | Resumo combustível |
| /api/fleet/drivers | GET | Motoristas |
| /api/fleet/drivers/{id}/documents | GET | Docs motorista |

## Guardrails

| Tool | Risco | Requer Aprovação |
|------|-------|------------------|
| maintenance_scheduler | MEDIUM | Não |
| document_tracker | LOW | Não |
| fuel_monitor | LOW | Não |

## Multi-Tenancy

Todas as operações filtram por:
- `organization_id`: ID da organização
- `branch_id`: ID da filial

Dados de frota são isolados por organização e filial.
