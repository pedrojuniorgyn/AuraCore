# TMS Agent

Agente especializado em operações de transporte rodoviário de cargas.

## Visão Geral

O TMS Agent automatiza e otimiza operações de transporte, incluindo:
- Roteirização de entregas
- Rastreamento em tempo real
- Agendamento de frotas

## Domínios de Conhecimento

- Roteirização e otimização de rotas
- Rastreamento GPS de veículos
- Gestão de entregas e coletas
- Janelas de entrega (delivery windows)
- Jornada de motorista (Lei 13.103/2015)
- Documentos de transporte (CTe, MDFe)

## Tools Disponíveis

### 1. route_optimizer

Calcula rotas otimizadas para entregas.

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `delivery_ids` | list[str] | IDs das entregas a roteirizar |
| `vehicle_type` | str | Tipo de veículo (vuc, toco, truck, carreta, bitrem) |
| `optimize_for` | str | Critério: distance, time, cost |
| `avoid_tolls` | bool | Evitar pedágios |
| `max_route_time_hours` | float | Tempo máximo de rota |

**Exemplo de uso:**
```
"Otimize a rota para as entregas DEL-001, DEL-002 e DEL-003 usando um caminhão truck"
```

**Retorno:**
- Rota ordenada com waypoints
- ETA para cada parada
- Métricas (distância, tempo, custo)
- Alertas de violação de janelas

### 2. tracking

Rastreia veículos e cargas em tempo real.

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `tracking_type` | str | delivery, vehicle, shipment |
| `tracking_id` | str | ID da entrega |
| `vehicle_plate` | str | Placa do veículo |
| `shipment_number` | str | Número do embarque |
| `include_history` | bool | Incluir histórico |
| `history_hours` | int | Horas de histórico |

**Exemplo de uso:**
```
"Qual o status da entrega DEL-001?"
"Rastreie o veículo ABC-1234"
"Qual o progresso do embarque EMB-2024-001?"
```

**Retorno:**
- Status atual da entrega/veículo
- Localização em tempo real
- ETA dinâmico
- Histórico de posições (opcional)
- Alertas

### 3. delivery_scheduler

Distribui entregas entre veículos disponíveis.

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `schedule_date` | str | Data do agendamento (YYYY-MM-DD) |
| `delivery_ids` | list[str] | IDs específicos (opcional) |
| `vehicle_ids` | list[str] | Veículos específicos (opcional) |
| `auto_assign` | bool | Criar agendamentos automaticamente |
| `balance_strategy` | str | distance, capacity, time |
| `max_deliveries_per_vehicle` | int | Máximo por veículo |

**Exemplo de uso:**
```
"Distribua as entregas pendentes para amanhã entre os veículos disponíveis"
```

**Retorno:**
- Distribuição por veículo
- Métricas de utilização
- Entregas não alocadas
- Alertas de sobrecarga

## Exemplos de Conversa

### Otimização de Rota

**Usuário:** Otimize a rota para as entregas DEL-001, DEL-002, DEL-003 evitando pedágios

**Agente:**
```
## Rota Otimizada

| # | Entrega | Destino | ETA | Distância |
|---|---------|---------|-----|-----------|
| 1 | DEL-001 | Cliente A - São Paulo/SP | 08:45 | 12.5 km |
| 2 | DEL-003 | Cliente C - Guarulhos/SP | 09:30 | 8.2 km |
| 3 | DEL-002 | Cliente B - Osasco/SP | 10:15 | 15.1 km |

### Métricas
- **Distância total:** 45.8 km
- **Tempo estimado:** 2 horas 15 minutos
- **Custo estimado:** R$ 183,20
- **Pedágios:** R$ 0,00 (evitados)

⚠️ **Alerta:** DEL-003 pode ultrapassar janela de entrega em 15 minutos.
```

### Rastreamento

**Usuário:** Qual o status da entrega DEL-001?

**Agente:**
```
## Status da Entrega DEL-001

**Status:** 🚚 Em Trânsito

### Localização Atual
- **Endereço:** Av. Paulista, 1000 - São Paulo/SP
- **Velocidade:** 35 km/h
- **Última atualização:** 14:32

### ETA
- **Chegada prevista:** 15:15 (43 minutos)
- **Distância restante:** 12.5 km

### Veículo
- **Placa:** ABC-1234
- **Motorista:** João Silva

ℹ️ Veículo em movimento, dentro do prazo previsto.
```

### Agendamento

**Usuário:** Distribua as entregas pendentes para amanhã

**Agente:**
```
## Proposta de Agendamento - 21/01/2026

### Resumo
- **Total de entregas:** 15
- **Veículos utilizados:** 3 de 5 disponíveis
- **Entregas agendadas:** 15
- **Não alocadas:** 0

### Distribuição por Veículo

#### ABC-1234 (João Silva) - 6 entregas
| Entrega | Cidade | Peso | Prioridade |
|---------|--------|------|------------|
| DEL-001 | São Paulo | 500 kg | Alta |
| DEL-002 | São Paulo | 300 kg | Média |
...

#### DEF-5678 (Maria Santos) - 5 entregas
...

### Métricas
- **Taxa de utilização:** 60%
- **Peso total:** 4.500 kg
- **Volume total:** 25 m³

ℹ️ Deseja que eu crie os agendamentos automaticamente?
```

## Regras de Negócio

### Multi-Tenancy (CRÍTICO)
- TODA operação requer `organizationId` + `branchId`
- Cada transportadora é uma organização separada
- Filiais podem ter frotas distintas

### Documentos de Transporte
- CTe obrigatório para transporte interestadual
- MDFe obrigatório para consolidação de cargas
- Manifesto deve fechar antes da viagem

### Jornada do Motorista (Lei 13.103/2015)
- Jornada máxima: 8h + 2h extras
- Descanso obrigatório: 30min a cada 4h de direção
- Intervalo interjornadas: mínimo 11h

### Status de Entrega
| Status | Descrição |
|--------|-----------|
| PENDING | Aguardando coleta |
| COLLECTED | Coletado, aguardando embarque |
| IN_TRANSIT | Em trânsito para o destino |
| OUT_FOR_DELIVERY | Saiu para entrega |
| DELIVERED | Entregue com sucesso |
| FAILED | Tentativa de entrega falhou |
| RETURNED | Devolvido ao remetente |

## Guardrails

| Tool | Risco | Requer Aprovação |
|------|-------|------------------|
| route_optimizer | LOW | Não |
| tracking | LOW | Não |
| delivery_scheduler | MEDIUM | Não (se auto_assign=false) |
| delivery_scheduler (auto) | HIGH | Sim |

## Configuração

### Variáveis de Ambiente

```env
# API do AuraCore
AURACORE_API_URL=http://web:3000
AURACORE_API_TIMEOUT=30
```

### Integrações

O TMS Agent integra com:
- **Fleet Module:** Dados de veículos e localização
- **TMS Module:** Entregas, embarques, agendamentos
- **Fiscal Module:** CTe e MDFe

## Próximos Passos

1. Integração com Google Maps/HERE para rotas reais
2. Suporte a restrições de circulação por cidade
3. Otimização com algoritmos genéticos
4. Previsão de atrasos com ML
