# 🧪 GUIA DE TESTES - AURACORE MVP

**Versão:** 1.0.0  
**Data:** 08/12/2025  
**Status:** Pronto para testes após migrations

---

## 📋 **PRÉ-REQUISITOS**

### **1. Verificar Servidor:**
```bash
# Deve estar rodando em http://localhost:3000
# Verificar terminal: npm run dev
```

### **2. Executar Migrations:**
```sql
-- Executar o arquivo: migrations/create_all_marathon_tables.sql
-- Via SSMS ou Azure Data Studio
```

### **3. Verificar Autenticação:**
- Login: seu usuário configurado
- Tenant: sua organização configurada

---

## ✅ **ROTEIRO DE TESTES**

### **TESTE 1: BILLING (Faturamento Agrupado)** ⭐ CRÍTICO

**Objetivo:** Validar fatura consolidada end-to-end

**Passos:**
1. Navegar: `/financeiro/faturamento`
2. Clicar: "Nova Fatura"
3. Preencher:
   - Cliente (ID): 1 (ou cliente existente)
   - Período Inicial: 01/11/2024
   - Período Final: 30/11/2024
   - Frequência: Mensal
4. Clicar: "Criar Fatura"

**Resultado Esperado:**
- ✅ Fatura criada com lista de CTes agrupados
- ✅ Valor total calculado
- ✅ Botão "Gerar Boleto" disponível

**Teste 1.1: Gerar Boleto**
1. Clicar: "Gerar Boleto"
2. Aguardar processamento

**Resultado Esperado:**
- ✅ Boleto gerado (código de barras exibido)
- ✅ PIX QR Code exibido

**Teste 1.2: Download PDF**
1. Clicar: "PDF"
2. Verificar download

**Resultado Esperado:**
- ✅ PDF baixado com nome `Fatura-BILL-XXXX.pdf`
- ✅ PDF contém: cabeçalho, itens, total, boleto

**Teste 1.3: Enviar Email**
1. Clicar: "Enviar Email"
2. Informar email de teste
3. Confirmar

**Resultado Esperado:**
- ✅ Mensagem de sucesso
- ✅ Email recebido com PDF anexado

**Teste 1.4: Finalizar**
1. Clicar: "Finalizar"
2. Confirmar

**Resultado Esperado:**
- ✅ Status mudou para "FINALIZADA"
- ✅ Título criado no Contas a Receber

---

### **TESTE 2: INUTILIZAÇÃO CTe** ⭐ CRÍTICO

**Objetivo:** Validar inutilização de numeração

**Passos:**
1. Navegar: `/fiscal/cte/inutilizacao`
2. Preencher:
   - Série: 1
   - Ano: 2024
   - Número Inicial: 100
   - Número Final: 105
   - Justificativa: "Numeração pulada por erro de sistema durante testes de homologação"
3. Clicar: "Inutilizar Numeração"

**Resultado Esperado:**
- ✅ Mensagem de sucesso
- ✅ Registro criado em `cte_inutilization`
- ✅ Status: "CONFIRMED" ou "PENDING" (dependendo ambiente)

---

### **TESTE 3: CRM** ⭐

**Objetivo:** Validar criação de leads

**Passos:**
1. Navegar: `/comercial/crm`
2. Clicar: "Novo Lead"
3. Preencher:
   - Empresa: "Empresa Teste Ltda"
   - CNPJ: "12.345.678/0001-90"
   - Contato: "João Silva"
   - Email: "joao@empresateste.com"
   - Telefone: "(11) 98765-4321"
4. Salvar

**Resultado Esperado:**
- ✅ Lead criado no estágio "Prospecção"
- ✅ Card aparece no Kanban

**API Direct Test:**
```bash
curl -X POST http://localhost:3000/api/comercial/crm/leads \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Teste API",
    "cnpj": "11111111000111",
    "contactName": "Teste",
    "contactEmail": "teste@teste.com",
    "stage": "PROSPECTING"
  }'
```

---

### **TESTE 4: PROPOSTAS COMERCIAIS** ⭐

**Objetivo:** Gerar proposta PDF

**Passos:**
1. Navegar: `/comercial/propostas`
2. Clicar: "Nova Proposta"
3. Preencher:
   - Lead ou Cliente
   - Rotas (JSON):
     ```json
     [
       {"origin": "São Paulo-SP", "destination": "Rio de Janeiro-RJ", "price": "1500.00"}
     ]
     ```
   - Validade: 15 dias
4. Salvar

**Resultado Esperado:**
- ✅ Proposta criada com número `PROP-2024-0001`
- ✅ Botão "Download PDF" disponível

**Teste 4.1: Download PDF**
1. Clicar: "Download PDF"

**Resultado Esperado:**
- ✅ PDF gerado com proposta formatada

---

### **TESTE 5: GESTÃO DE PNEUS**

**Objetivo:** Cadastrar pneu e calcular CPK

**Passos:**
1. Navegar: `/frota/pneus`
2. Clicar: "Novo Pneu"
3. Preencher:
   - Nº Série: "ABC123456"
   - Modelo: "Michelin XZA"
   - Medida: "295/80R22.5"
   - Preço: R$ 2.500,00
4. Salvar

**Resultado Esperado:**
- ✅ Pneu criado com status "STOCK"
- ✅ CPK = R$ 0,0000 (sem KM rodado ainda)

**API Direct Test:**
```bash
curl -X POST http://localhost:3000/api/fleet/tires \
  -H "Content-Type: application/json" \
  -d '{
    "serialNumber": "TEST001",
    "model": "Teste",
    "size": "295/80R22.5",
    "purchasePrice": "2500.00"
  }'
```

---

### **TESTE 6: COCKPIT TMS**

**Objetivo:** Visualizar KPIs operacionais

**Passos:**
1. Navegar: `/tms/cockpit`

**Resultado Esperado:**
- ✅ 4 cards com KPIs:
  - Viagens em Andamento
  - Entregas no Prazo (%)
  - Entregas Atrasadas
  - Ocorrências Abertas
- ✅ Valores calculados (mesmo que zeros)

---

### **TESTE 7: FLUXO DE CAIXA**

**Objetivo:** Visualizar projeção financeira

**Passos:**
1. Navegar: `/financeiro/fluxo-caixa`

**Resultado Esperado:**
- ✅ Tela carregada
- ✅ Placeholder para gráfico exibido
- ✅ API retorna dados (verificar console)

**API Test:**
```bash
curl http://localhost:3000/api/financial/cash-flow
```

---

### **TESTE 8: WMS ENDEREÇAMENTO**

**Objetivo:** Cadastrar endereços de armazenagem

**Passos:**
1. Navegar: `/wms/enderecos`
2. Clicar: "Novo Endereço"
3. Preencher:
   - Código: "A1-B2-C3"
   - Zona: 1 (criar zona antes se necessário)
   - Tipo: "PALLET"
4. Salvar

**Resultado Esperado:**
- ✅ Endereço criado
- ✅ Status: "AVAILABLE"
- ✅ Card exibido no grid

---

### **TESTE 9: TORRE DE CONTROLE**

**Objetivo:** Monitorar viagens ativas

**Passos:**
1. Navegar: `/tms/torre-controle`

**Resultado Esperado:**
- ✅ Lista de viagens em trânsito
- ✅ Cards com informações básicas
- ✅ SLA status (mesmo que mock)

---

## 🔧 **TESTES DE API (CURL)**

### **1. Reajuste em Lote:**
```bash
curl -X POST http://localhost:3000/api/comercial/freight-tables/bulk-adjust \
  -H "Content-Type: application/json" \
  -d '{
    "adjustmentType": "PERCENTAGE",
    "adjustmentValue": 5.0,
    "filterOriginUf": "SP"
  }'
```

**Esperado:** `{"success": true, "affectedTables": X}`

### **2. Movimentação WMS:**
```bash
curl -X POST http://localhost:3000/api/wms/movements \
  -H "Content-Type: application/json" \
  -d '{
    "movementType": "RECEIVING",
    "productId": 1,
    "quantity": 100,
    "toLocationId": 1
  }'
```

**Esperado:** `{"success": true, "data": {...}}`

### **3. Abastecimento:**
```bash
curl -X POST http://localhost:3000/api/fleet/fuel \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": 1,
    "transactionDate": "2024-12-08",
    "fuelType": "DIESEL",
    "liters": 200,
    "pricePerLiter": 6.50,
    "totalValue": 1300.00,
    "odometer": 150000,
    "source": "MANUAL"
  }'
```

**Esperado:** `{"success": true}`

---

## ⚠️ **PROBLEMAS CONHECIDOS**

### **1. Imports de Componentes:**
Alguns componentes customizados foram removidos. Se aparecer erro de import, ignorar (são TODOs para refinamento).

### **2. Permissões RBAC:**
Se surgir erro de permissão, verificar se o usuário tem roles atribuídas em `/configuracoes/usuarios`.

### **3. Tenant Context:**
Se surgir erro "Tenant not found", verificar login e organização.

---

## 📊 **CHECKLIST FINAL**

Após executar todos os testes, marcar:

- [ ] Billing (criar fatura)
- [ ] Billing (gerar boleto)
- [ ] Billing (download PDF)
- [ ] Billing (enviar email)
- [ ] Billing (finalizar)
- [ ] Inutilização CTe
- [ ] CRM (criar lead)
- [ ] Propostas (gerar PDF)
- [ ] Pneus (cadastrar)
- [ ] Cockpit TMS (visualizar)
- [ ] Fluxo Caixa (API funcionando)
- [ ] WMS (criar endereço)
- [ ] Torre Controle (visualizar)
- [ ] Reajuste Lote (API)
- [ ] Abastecimento (API)

---

## 🎯 **PRÓXIMOS PASSOS**

Após validar os testes:

1. **Coletar Bugs:** Listar erros encontrados
2. **Priorizar:** Criticidade (bloqueante/média/baixa)
3. **Refinar:** Ajustar baseado em feedback real
4. **Completar 15%:** Implementar pendências prioritárias

---

**Boa sorte nos testes!** 🚀

Se encontrar problemas, me avise com detalhes (tela, erro, console) para corrigirmos!






