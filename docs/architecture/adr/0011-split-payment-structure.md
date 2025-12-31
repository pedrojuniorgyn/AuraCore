# ADR 0011 — Estrutura Preparatória para Split Payment

## Status
**Aceito (Preparatória)** - 2025-12-30

## Contexto

A partir de 2027, o Split Payment será obrigatório para pagamentos de IBS e CBS. O Split Payment automatiza a divisão do pagamento entre diferentes destinatários (União, Estados, Municípios) no momento da transação.

### Requisitos Futuros (2027)

1. **Divisão Automática**: Pagamento dividido em tempo real
2. **Múltiplos Destinatários**:
   - União (CBS)
   - Estado (IBS UF)
   - Município (IBS Municipal)
3. **Integração Bancária**: PIX, TED, boleto
4. **Rastreamento**: Protocolo de cada split
5. **Conciliação**: Auditoria de pagamentos divididos

### Problema

Em 2025/2026, ainda não temos:
- Especificação técnica completa do Split Payment
- Integração com instituições financeiras
- Web services da SEFAZ para RTC (Registro de Transação de Crédito)

**Mas precisamos** de uma estrutura preparatória para:
- Testar fluxos futuros
- Preparar arquitetura
- Simular cenários
- Treinar equipe

## Decisão

### 1. Estrutura Preparatória (Implementação Agora)

Criar **interfaces, tipos e mocks** que representam o sistema futuro:

```typescript
// Tipos e enums
SplitPaymentTypes {
  SplitPaymentStatus
  TributoSplit
  SplitRecipientType
  TaxBreakdown
  SplitInstruction
  PaymentInstruction
}

// Interface do serviço
ISplitPaymentService {
  calculateSplit()
  isSplitRequired()
  generatePaymentInstructions()
  validateSplit()
  generateSummary()
}

// Mock para desenvolvimento
MockSplitPaymentService implements ISplitPaymentService {
  // Simula comportamento real
  // Retorna dados fictícios mas válidos
}

// Schema para persistência futura
SplitPaymentSchema (Drizzle) {
  id, fiscalDocumentId, recipientType, recipientCode,
  tributo, amount, status, barcode, pixKey, etc.
}
```

### 2. Mock Realístico

O mock deve simular:
- ✅ Delay de rede (50-150ms)
- ✅ Validação de regras de negócio
- ✅ Geração de protocolo mockado
- ✅ Cálculo de divisão por ente
- ✅ Verificação de obrigatoriedade (>=2027)

**Não deve**:
- ❌ Integrar com APIs reais
- ❌ Persistir no banco (ainda)
- ❌ Enviar pagamentos

### 3. Estratégia de Migração (2027)

```typescript
// 2025-2026: Mock
const splitService = MockSplitPaymentService.getInstance();

// 2027: Implementação real
const splitService = RealSplitPaymentService.getInstance();
// Mesma interface, comportamento real
```

**Factory Pattern**:
```typescript
class SplitPaymentServiceFactory {
  static create(): ISplitPaymentService {
    const year = new Date().getFullYear();
    
    if (year < 2027) {
      return MockSplitPaymentService.getInstance();
    }
    
    return RealSplitPaymentService.getInstance();
  }
}
```

### 4. Schema de Persistência

Criar schema Drizzle agora (não usar ainda):

```sql
CREATE TABLE split_payment_instructions (
  id UUID PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  fiscal_document_id UUID NOT NULL,
  
  recipient_type VARCHAR(20) NOT NULL,
  recipient_code VARCHAR(10) NOT NULL,
  recipient_name VARCHAR(200) NOT NULL,
  recipient_cnpj VARCHAR(14) NOT NULL,
  
  tributo VARCHAR(20) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  amount_currency VARCHAR(3) DEFAULT 'BRL',
  
  pix_key VARCHAR(77),
  bank_code VARCHAR(3),
  agency VARCHAR(10),
  account VARCHAR(20),
  barcode VARCHAR(48),
  
  status VARCHAR(20) DEFAULT 'PENDING',
  processed_at DATETIME,
  
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW(),
  deleted_at DATETIME
);
```

### 5. Testes com Mock

Testes E2E devem usar mock:

```typescript
describe('Split Payment (Mock)', () => {
  it('should calculate split for 2027+ operations', async () => {
    const service = MockSplitPaymentService.getInstance();
    
    const requirement = service.isSplitRequired(
      new Date('2027-01-15'),
      'SALE',
      Money.create(10000, 'BRL').value
    );
    
    expect(requirement.required).toBe(true);
    
    const split = await service.calculateSplit(...);
    expect(split.length).toBe(3); // Federal + Estadual + Municipal
  });
});
```

## Consequências

### Positivas ✅

1. **Preparação Antecipada**: Arquitetura pronta para 2027
2. **Testes Futuros**: Cenários testáveis antes da implementação real
3. **Interface Estável**: Mudança de mock para real é transparente
4. **Aprendizado**: Equipe se familiariza com conceitos
5. **Documentação**: Especificação de como deve funcionar
6. **Zero Risk**: Mock não afeta produção

### Negativas ❌

1. **Código Não Usado**: Schema criado mas não utilizado (até 2027)
2. **Manutenção**: Mock pode divergir do comportamento real futuro
3. **Overhead**: Interfaces e tipos sem uso imediato

### Mitigações ⚠️

1. **Documentação Clara**: Marcar claramente como "preparatório"
2. **Testes**: Cobrir mock extensivamente
3. **Revisão 2026**: Revisar antes da implementação real
4. **Comentários**: Indicar "TODO 2027" onde necessário

## Alternativas Consideradas

### Alternativa 1: Não Implementar Agora
**Rejeitada**: Perder oportunidade de preparação, correria em 2027

### Alternativa 2: Implementação Completa Agora
**Rejeitada**: Especificações incompletas, integrações não disponíveis

### Alternativa 3: Apenas Documentação
**Rejeitada**: Sem código, difícil testar e validar arquitetura

### Alternativa 4: Feature Flag
**Considerada**: Pode ser usada em 2027 para rollout gradual

## Roadmap

### 2025-2026: Preparação
- ✅ Interfaces e tipos definidos
- ✅ Mock implementado
- ✅ Testes com mock
- ✅ Schema preparado
- ⏳ Documentação completa

### 2027 Q1-Q2: Especificação
- ⏳ Aguardar especificação técnica final da SEFAZ
- ⏳ Definir protocolo de integração bancária
- ⏳ Identificar instituições financeiras parceiras

### 2027 Q3: Implementação
- ⏳ RealSplitPaymentService
- ⏳ Integração com APIs bancárias
- ⏳ Integração com web service RTC da SEFAZ
- ⏳ Testes de integração reais

### 2027 Q4: Rollout
- ⏳ Piloto com clientes selecionados
- ⏳ Monitoramento de performance
- ⏳ Rollout gradual
- ⏳ Suporte e ajustes

## Referências

- LC 214/2025 - Artigos sobre Split Payment
- Consulta Pública Split Payment 2026
- Padrão PIX (Banco Central)
- Especificação RTC (SEFAZ - a ser publicada)

## Relacionados

- ADR 0010: Implementação IBS/CBS
- `ISplitPaymentService.ts`
- `MockSplitPaymentService.ts`
- `SplitPaymentSchema.ts`

---

**Autor**: AuraCore Team  
**Última revisão**: 2025-12-30  
**Status**: Preparatória (implementação real em 2027)

