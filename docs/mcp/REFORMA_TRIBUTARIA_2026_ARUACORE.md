# 📋 REFORMA TRIBUTÁRIA 2026 - GUIA TÉCNICO AURACORE
## Documentos Fiscais para Transportador de Cargas e Operador Logístico

**Versão:** 1.0  
**Data:** 29/12/2024  
**Autor:** Análise Técnica AuraCore  
**Base Legal:** EC 132/2023 + LC 214/2025  

---

## 📌 SUMÁRIO EXECUTIVO

### O Que Muda em 01/01/2026

| Aspecto | Sistema Atual | Sistema Novo (2026+) |
|---------|---------------|----------------------|
| **Impostos Federais** | PIS + COFINS | CBS (0,9% teste) |
| **Impostos Estaduais** | ICMS | IBS Estadual (0,1% teste) |
| **Impostos Municipais** | ISS | IBS Municipal (incluso nos 0,1%) |
| **Recolhimento** | Após apuração | Split Payment (automático) |
| **XML** | Campos atuais | +18 novos campos por documento |
| **Validação** | Regras atuais | Novo Validador RTC |

### Cronograma Oficial

```
2026 ──────────────────────────────────────────────────────────────────►
│ Jan: Destaque obrigatório CBS/IBS (sem recolhimento efetivo)
│ Jul: PF contribuintes devem ter CNPJ
│ Split Payment: FACULTATIVO (testes)
│
2027 ──────────────────────────────────────────────────────────────────►
│ CBS entra em vigor com alíquota cheia (~8,8%)
│ PIS/COFINS extintos
│ Split Payment: Gradual
│
2029-2032 ─────────────────────────────────────────────────────────────►
│ Redução progressiva ICMS/ISS
│ Aumento gradual IBS
│
2033 ──────────────────────────────────────────────────────────────────►
│ Sistema novo 100% operacional
│ ICMS/ISS totalmente extintos
```

---

## 📄 PARTE 1: DOCUMENTOS FISCAIS ELETRÔNICOS

### 1.1 CT-e (Conhecimento de Transporte Eletrônico) - Modelo 57

#### Nota Técnica Aplicável
- **NT 2025.001** - Reforma Tributária do Consumo para CT-e
- **Versão atual:** 1.05b (26/06/2025)

#### Novos Campos XML Obrigatórios (Grupo IBSCBS)

```xml
<!-- GRUPO IBSCBS - Obrigatório a partir de 01/01/2026 -->
<IBSCBS>
  <!-- Código Situação Tributária IBS/CBS -->
  <CST>00</CST>
  
  <!-- Código Classificação Tributária -->
  <cClassTrib>10100</cClassTrib>
  
  <!-- Base de Cálculo -->
  <vBC>1000.00</vBC>
  
  <!-- IBS UF (Estadual) -->
  <pIBSUF>0.10</pIBSUF>
  <vIBSUF>1.00</vIBSUF>
  
  <!-- IBS Municipal -->
  <pIBSMun>0.00</pIBSMun>
  <vIBSMun>0.00</vIBSMun>
  
  <!-- CBS (Federal) -->
  <pCBS>0.90</pCBS>
  <vCBS>9.00</vCBS>
  
  <!-- Totais -->
  <vIBS>1.00</vIBS>
  <vTotTrib>10.00</vTotTrib>
  
  <!-- Diferimento (quando aplicável) -->
  <gDif>
    <pDif>0.00</pDif>
    <vIBSDif>0.00</vIBSDif>
    <vCBSDif>0.00</vCBSDif>
  </gDif>
  
  <!-- Devolução (quando aplicável) -->
  <gDev>
    <vIBSDev>0.00</vIBSDev>
    <vCBSDev>0.00</vCBSDev>
  </gDev>
  
  <!-- Redução de Alíquota -->
  <gRed>
    <pRedIBS>0.00</pRedIBS>
    <pRedCBS>0.00</pRedCBS>
  </gRed>
  
  <!-- Crédito Presumido -->
  <gCredPres>
    <cCredPres>0</cCredPres>
    <pCredPres>0.00</pCredPres>
    <vCredPresIBS>0.00</vCredPresIBS>
    <vCredPresCBS>0.00</vCredPresCBS>
  </gCredPres>
</IBSCBS>
```

#### Campos Específicos CT-e

| Campo | Descrição | Tipo | Obrigatório |
|-------|-----------|------|-------------|
| `CST` | Código Situação Tributária IBS/CBS | N2 | Sim |
| `cClassTrib` | Código Classificação Tributária | N5 | Sim |
| `vBC` | Base de Cálculo | N15.2 | Sim |
| `pIBSUF` | Alíquota IBS UF | N5.2 | Sim |
| `vIBSUF` | Valor IBS UF | N15.2 | Sim |
| `pIBSMun` | Alíquota IBS Municipal | N5.2 | Sim |
| `vIBSMun` | Valor IBS Municipal | N15.2 | Sim |
| `pCBS` | Alíquota CBS | N5.2 | Sim |
| `vCBS` | Valor CBS | N15.2 | Sim |
| `vTotDFe` | Valor Total do DF-e | N15.2 | Sim |

#### Novo Campo: Valor Total do Documento

```xml
<!-- NOVO: Soma valor prestação + IBS + CBS -->
<vTotDFe>1010.00</vTotDFe>
```

**Regra:** `vTotDFe = vPrest + vIBS + vCBS`

#### Grupo Compras Governamentais (gCompraGov)

```xml
<!-- Quando tomador for ente público -->
<gCompraGov>
  <tpEnteGov>1</tpEnteGov> <!-- 1=União, 2=Estado, 3=Município -->
  <pRedAliq>20.00</pRedAliq>
</gCompraGov>
```

---

### 1.2 CT-e Simplificado - Modelo 57

Mesma estrutura do CT-e padrão, com restrição adicional:
- **Todos os itens devem ter mesmo município de fim da prestação**

---

### 1.3 CT-e OS (Outros Serviços) - Modelo 67

#### Campos Adicionais para Transporte de Valores

```xml
<infCTeOS>
  <!-- NOVO: UF e Município de destino obrigatórios -->
  <UFDest>SP</UFDest>
  <cMunDest>3550308</cMunDest>
</infCTeOS>
```

---

### 1.4 MDF-e (Manifesto de Documentos Fiscais) - Modelo 58

#### Status Atual
- MDF-e **NÃO** possui campos IBS/CBS próprios
- Consolida CT-e e NF-e que JÁ possuem os campos
- **Validação:** Verificar se documentos vinculados possuem campos IBS/CBS

#### Estrutura de Vinculação

```xml
<infMDFe>
  <infDoc>
    <infMunDescarga>
      <cMunDescarga>3550308</cMunDescarga>
      <infCTe>
        <!-- CT-e já contém grupo IBSCBS -->
        <chCTe>35261201234567000199570010000000011123456789</chCTe>
      </infCTe>
      <infNFe>
        <!-- NF-e já contém grupo IBSCBS -->
        <chNFe>35261201234567000199550010000000011123456789</chNFe>
      </infNFe>
    </infMunDescarga>
  </infDoc>
</infMDFe>
```

---

### 1.5 NF-e (Nota Fiscal Eletrônica) - Modelo 55

#### Nota Técnica Aplicável
- **NT 2025.002** - Reforma Tributária do Consumo
- **Versão atual:** 1.34 (04/12/2025)

#### Novos Grupos XML

##### Grupo B - Identificação (Novos Campos)

```xml
<ide>
  <!-- NOVO: Município FG do IBS/CBS -->
  <cMunFGIBS>3550308</cMunFGIBS>
  
  <!-- NOVO: Compras Governamentais -->
  <gCompraGov>
    <tpEnteGov>1</tpEnteGov>
    <pRedAliq>20.00</pRedAliq>
  </gCompraGov>
</ide>
```

##### Grupo UB - Tributação IBS/CBS/IS (Por Item)

```xml
<det nItem="1">
  <prod>...</prod>
  <imposto>
    <!-- GRUPO UB - NOVO -->
    <IBSCBS>
      <CST>00</CST>
      <cClassTrib>10100</cClassTrib>
      <vBC>100.00</vBC>
      
      <!-- IBS UF -->
      <gIBSUF>
        <pIBSUF>0.10</pIBSUF>
        <vIBSUF>0.10</vIBSUF>
        <pRedIBSUF>0.00</pRedIBSUF>
        <pAliqEfetIBSUF>0.10</pAliqEfetIBSUF>
      </gIBSUF>
      
      <!-- IBS Municipal -->
      <gIBSMun>
        <pIBSMun>0.00</pIBSMun>
        <vIBSMun>0.00</vIBSMun>
      </gIBSMun>
      
      <!-- CBS -->
      <gCBS>
        <pCBS>0.90</pCBS>
        <vCBS>0.90</vCBS>
        <pRedCBS>0.00</pRedCBS>
        <pAliqEfetCBS>0.90</pAliqEfetCBS>
      </gCBS>
    </IBSCBS>
    
    <!-- Imposto Seletivo (quando aplicável) -->
    <IS>
      <CST>00</CST>
      <vBC>100.00</vBC>
      <pIS>0.00</pIS>
      <vIS>0.00</vIS>
    </IS>
  </imposto>
</det>
```

##### Grupo VB - Total do Item

```xml
<det nItem="1">
  <!-- NOVO: Total do item -->
  <vItem>101.00</vItem>
</det>
```

##### Grupo VC - Referenciamento de DF-e

```xml
<!-- NOVO: Referência a item de outro documento -->
<DFeReferenciado>
  <chDFe>35261201234567000199550010000000011123456789</chDFe>
  <nItem>1</nItem>
</DFeReferenciado>
```

##### Grupo W03 - Totalizadores IBS/CBS/IS

```xml
<total>
  <!-- NOVO GRUPO W03 -->
  <IBSCBSTot>
    <vBCIBSCBS>10000.00</vBCIBSCBS>
    <vIBSUF>10.00</vIBSUF>
    <vIBSMun>0.00</vIBSMun>
    <vIBS>10.00</vIBS>
    <vCBS>90.00</vCBS>
    <vCredPresIBS>0.00</vCredPresIBS>
    <vCredPresCBS>0.00</vCredPresCBS>
  </IBSCBSTot>
  
  <ISTot>
    <vIS>0.00</vIS>
  </ISTot>
</total>
```

##### Novas Finalidades NF-e

```xml
<ide>
  <!-- NOVAS finalidades para ajustes IBS/CBS -->
  <finNFe>5</finNFe> <!-- 5 = Nota de Crédito -->
  <finNFe>6</finNFe> <!-- 6 = Nota de Débito -->
</ide>
```

---

### 1.6 NFS-e (Nota Fiscal de Serviços Eletrônica)

#### Status Especial
- Competência **MUNICIPAL**
- Cada prefeitura define layout
- **Padrão Nacional:** Em implantação progressiva

#### Campos Esperados (Padrão Nacional)

```xml
<InfNfse>
  <Servico>
    <!-- Tributação IBS/CBS -->
    <Tributacao>
      <CBS>
        <pCBS>0.90</pCBS>
        <vCBS>9.00</vCBS>
      </CBS>
      <IBS>
        <pIBS>0.10</pIBS>
        <vIBS>1.00</vIBS>
      </IBS>
    </Tributacao>
  </Servico>
</InfNfse>
```

---

## 📊 PARTE 2: TABELAS DE CODIFICAÇÃO

### 2.1 CST-IBS/CBS (Código Situação Tributária)

| CST | Descrição |
|-----|-----------|
| 00 | Tributação normal |
| 10 | Tributação com suspensão |
| 20 | Tributação monofásica |
| 30 | Tributação com diferimento |
| 40 | Isenção |
| 41 | Não incidência |
| 50 | Imunidade |
| 60 | Tributação com redução de base de cálculo |
| 70 | Tributação com crédito presumido |
| 90 | Outros |

### 2.2 cClassTrib (Classificação Tributária)

Cada código corresponde a um artigo específico da LC 214/2025.

| Faixa | Descrição |
|-------|-----------|
| 10000-19999 | Tributação integral |
| 20000-29999 | Alíquota reduzida |
| 30000-39999 | Isenção |
| 40000-49999 | Imunidade |
| 50000-59999 | Diferimento |
| 60000-69999 | Suspensão |
| 70000-79999 | Regimes específicos |
| 80000-89999 | Crédito presumido |
| 90000-99999 | Outros |

### 2.3 Tipos de Ente Governamental (tpEnteGov)

| Código | Descrição |
|--------|-----------|
| 1 | União |
| 2 | Estado / DF |
| 3 | Município |

---

## 🏗️ PARTE 3: ARQUITETURA ENTERPRISE PARA AURACORE

### 3.1 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AURACORE FISCAL MODULE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    DOCUMENT FACTORY                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐  │   │
│  │  │  NFe    │ │  CTe    │ │  MDFe   │ │  NFSe   │ │ Outros│  │   │
│  │  │Component│ │Component│ │Component│ │Component│ │       │  │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬───┘  │   │
│  │       │           │           │           │          │       │   │
│  │       └───────────┴───────────┴───────────┴──────────┘       │   │
│  │                            │                                  │   │
│  │                    ┌───────▼───────┐                         │   │
│  │                    │  Base DF-e    │                         │   │
│  │                    │  Component    │                         │   │
│  │                    └───────┬───────┘                         │   │
│  └────────────────────────────┼─────────────────────────────────┘   │
│                               │                                     │
│  ┌────────────────────────────▼─────────────────────────────────┐   │
│  │                    TAX ENGINE                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │   │
│  │  │ Current Tax │  │ Transition  │  │    New Tax Engine   │   │
│  │  │   Engine    │  │   Engine    │  │    (IBS/CBS/IS)     │   │
│  │  │ (ICMS/ISS/  │  │ (2026-2032) │  │                     │   │
│  │  │  PIS/COFINS)│  │             │  │                     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    XML GENERATOR                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │   │
│  │  │  Schema     │  │   Builder   │  │     Validator       │   │
│  │  │  Registry   │  │   Pattern   │  │   (Validador RTC)   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    PDF GENERATOR                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │   │
│  │  │   DANFE     │  │   DACTE     │  │     DAMDFE          │   │
│  │  │  Generator  │  │  Generator  │  │    Generator        │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    SEFAZ INTEGRATION                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │   │
│  │  │  Transmit   │  │   Events    │  │     Status          │   │
│  │  │   Service   │  │   Handler   │  │    Monitor          │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Estrutura de Componentes por Tipo de Documento

```
src/
├── domain/
│   └── fiscal/
│       ├── documents/                    # Documentos Fiscais
│       │   ├── base/
│       │   │   ├── BaseFiscalDocument.ts        # Classe base abstrata
│       │   │   ├── FiscalDocumentFactory.ts     # Factory Pattern
│       │   │   └── interfaces/
│       │   │       ├── IFiscalDocument.ts
│       │   │       ├── IXmlGenerator.ts
│       │   │       ├── IPdfGenerator.ts
│       │   │       └── ISefazTransmitter.ts
│       │   │
│       │   ├── nfe/                      # NF-e (Modelo 55)
│       │   │   ├── NFeDocument.ts
│       │   │   ├── NFeXmlBuilder.ts
│       │   │   ├── NFeDanfeGenerator.ts
│       │   │   ├── NFeValidator.ts
│       │   │   └── value-objects/
│       │   │       ├── NFeKey.ts
│       │   │       ├── NFeItem.ts
│       │   │       └── NFeTotal.ts
│       │   │
│       │   ├── cte/                      # CT-e (Modelo 57)
│       │   │   ├── CTeDocument.ts
│       │   │   ├── CTeXmlBuilder.ts
│       │   │   ├── CTeDacteGenerator.ts
│       │   │   ├── CTeValidator.ts
│       │   │   ├── CTeSimplificado.ts        # CT-e Simplificado
│       │   │   ├── CTeOS.ts                  # CT-e OS (Modelo 67)
│       │   │   └── value-objects/
│       │   │       ├── CTeKey.ts
│       │   │       ├── CTeService.ts
│       │   │       └── CTeModal.ts
│       │   │
│       │   ├── mdfe/                     # MDF-e (Modelo 58)
│       │   │   ├── MDFeDocument.ts
│       │   │   ├── MDFeXmlBuilder.ts
│       │   │   ├── MDFeDamdfeGenerator.ts
│       │   │   ├── MDFeValidator.ts
│       │   │   └── value-objects/
│       │   │       ├── MDFeKey.ts
│       │   │       ├── MDFeRoute.ts
│       │   │       └── MDFeDocRef.ts
│       │   │
│       │   ├── nfse/                     # NFS-e
│       │   │   ├── NFSeDocument.ts
│       │   │   ├── NFSeXmlBuilder.ts
│       │   │   ├── NFSePdfGenerator.ts
│       │   │   ├── NFSeValidator.ts
│       │   │   └── adapters/             # Adapters por prefeitura
│       │   │       ├── NFSeNacional.ts
│       │   │       ├── NFSeSaoPaulo.ts
│       │   │       └── NFSeRioDeJaneiro.ts
│       │   │
│       │   └── non-fiscal/               # Documentos NÃO Fiscais
│       │       ├── base/
│       │       │   └── BaseNonFiscalDocument.ts
│       │       │
│       │       ├── recibo/               # Recibos
│       │       │   ├── ReciboDocument.ts
│       │       │   └── ReciboPdfGenerator.ts
│       │       │
│       │       ├── nota-debito/          # Nota de Débito
│       │       │   ├── NotaDebitoDocument.ts
│       │       │   └── NotaDebitoPdfGenerator.ts
│       │       │
│       │       ├── prestacao-contas/     # Prestação de Contas Viagem
│       │       │   ├── PrestacaoContasDocument.ts
│       │       │   ├── DespesaViagem.ts
│       │       │   └── PrestacaoContasPdfGenerator.ts
│       │       │
│       │       ├── romaneio/             # Romaneio de Carga
│       │       │   ├── RomaneioDocument.ts
│       │       │   └── RomaneioPdfGenerator.ts
│       │       │
│       │       └── ordem-coleta/         # Ordem de Coleta
│       │           ├── OrdemColetaDocument.ts
│       │           └── OrdemColetaPdfGenerator.ts
│       │
│       ├── tax/                          # Motor de Cálculo Tributário
│       │   ├── engines/
│       │   │   ├── TaxEngineFactory.ts
│       │   │   ├── CurrentTaxEngine.ts       # ICMS/ISS/PIS/COFINS
│       │   │   ├── TransitionTaxEngine.ts    # 2026-2032
│       │   │   └── NewTaxEngine.ts           # IBS/CBS/IS
│       │   │
│       │   ├── calculators/
│       │   │   ├── ICMSCalculator.ts
│       │   │   ├── ISSCalculator.ts
│       │   │   ├── PISCOFINSCalculator.ts
│       │   │   ├── IBSCalculator.ts          # NOVO
│       │   │   ├── CBSCalculator.ts          # NOVO
│       │   │   └── ISCalculator.ts           # NOVO (Imposto Seletivo)
│       │   │
│       │   └── value-objects/
│       │       ├── CST.ts                    # Atual
│       │       ├── CFOP.ts                   # Atual
│       │       ├── CSTIbsCbs.ts              # NOVO
│       │       ├── ClassificacaoTributaria.ts # NOVO (cClassTrib)
│       │       ├── AliquotaIBS.ts            # NOVO
│       │       └── AliquotaCBS.ts            # NOVO
│       │
│       ├── xml/                          # Geração de XML
│       │   ├── builders/
│       │   │   ├── XmlBuilderFactory.ts
│       │   │   ├── BaseXmlBuilder.ts
│       │   │   └── groups/
│       │   │       ├── GrupoIdentificacao.ts
│       │   │       ├── GrupoEmitente.ts
│       │   │       ├── GrupoDestinatario.ts
│       │   │       ├── GrupoIBSCBS.ts        # NOVO
│       │   │       ├── GrupoIS.ts            # NOVO
│       │   │       └── GrupoTotais.ts
│       │   │
│       │   ├── schemas/
│       │   │   ├── SchemaRegistry.ts
│       │   │   ├── SchemaValidator.ts
│       │   │   └── versions/
│       │   │       ├── nfe-v4.00.xsd
│       │   │       ├── cte-v4.00.xsd
│       │   │       ├── mdfe-v3.00.xsd
│       │   │       └── DFeTiposBasicos_v1.00.xsd  # NOVO
│       │   │
│       │   └── signing/
│       │       ├── XmlSigner.ts
│       │       └── CertificateManager.ts
│       │
│       ├── pdf/                          # Geração de PDF
│       │   ├── generators/
│       │   │   ├── PdfGeneratorFactory.ts
│       │   │   ├── BasePdfGenerator.ts
│       │   │   └── templates/
│       │   │       ├── DanfeTemplate.ts
│       │   │       ├── DacteTemplate.ts
│       │   │       ├── DamdfeTemplate.ts
│       │   │       └── GenericTemplate.ts
│       │   │
│       │   └── components/               # Componentes reutilizáveis
│       │       ├── HeaderComponent.ts
│       │       ├── QRCodeComponent.ts
│       │       ├── BarcodeComponent.ts
│       │       └── TaxSummaryComponent.ts    # NOVO: Resumo IBS/CBS
│       │
│       ├── sefaz/                        # Integração SEFAZ
│       │   ├── transmitters/
│       │   │   ├── SefazTransmitterFactory.ts
│       │   │   ├── BaseSefazTransmitter.ts
│       │   │   ├── NFeSefazTransmitter.ts
│       │   │   ├── CTeSefazTransmitter.ts
│       │   │   └── MDFeSefazTransmitter.ts
│       │   │
│       │   ├── events/
│       │   │   ├── EventHandler.ts
│       │   │   ├── CancelamentoEvent.ts
│       │   │   ├── CartaCorrecaoEvent.ts
│       │   │   └── ManifestacaoEvent.ts
│       │   │
│       │   └── urls/
│       │       ├── SefazUrlRegistry.ts
│       │       └── environments/
│       │           ├── producao.ts
│       │           └── homologacao.ts
│       │
│       └── split-payment/                # NOVO: Split Payment
│           ├── SplitPaymentEngine.ts
│           ├── SplitPaymentCalculator.ts
│           └── value-objects/
│               ├── SplitPaymentInfo.ts
│               └── PaymentDistribution.ts
```

### 3.3 Componentes Detalhados

#### 3.3.1 Base Fiscal Document (Classe Abstrata)

```typescript
// src/domain/fiscal/documents/base/BaseFiscalDocument.ts

import { Result } from '@/shared/core/Result';
import { Entity } from '@/shared/domain/Entity';
import { UniqueEntityID } from '@/shared/domain/UniqueEntityID';
import { FiscalKey } from '../value-objects/FiscalKey';
import { TaxRegime } from '../../tax/TaxRegime';

export interface FiscalDocumentProps {
  // Identificação
  key: FiscalKey;
  model: FiscalDocumentModel;
  series: number;
  number: number;
  emissionDate: Date;
  
  // Multi-tenant
  organizationId: number;
  branchId: number;
  
  // Tributação
  taxRegime: TaxRegime; // CURRENT | TRANSITION | NEW
  
  // Status
  status: FiscalDocumentStatus;
  
  // XML
  xml?: string;
  xmlSigned?: string;
  
  // Protocolo SEFAZ
  protocol?: string;
  authorizationDate?: Date;
  
  // Auditoria
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export abstract class BaseFiscalDocument<T extends FiscalDocumentProps> 
  extends Entity<T> {
  
  // Template Method Pattern
  public async generate(): Promise<Result<string>> {
    // 1. Validar dados
    const validationResult = await this.validate();
    if (validationResult.isFailure) {
      return Result.fail(validationResult.error);
    }
    
    // 2. Calcular tributos
    const taxResult = await this.calculateTaxes();
    if (taxResult.isFailure) {
      return Result.fail(taxResult.error);
    }
    
    // 3. Gerar XML
    const xmlResult = await this.buildXml();
    if (xmlResult.isFailure) {
      return Result.fail(xmlResult.error);
    }
    
    // 4. Assinar XML
    const signedXmlResult = await this.signXml(xmlResult.getValue());
    if (signedXmlResult.isFailure) {
      return Result.fail(signedXmlResult.error);
    }
    
    this.props.xmlSigned = signedXmlResult.getValue();
    return Result.ok(this.props.xmlSigned);
  }
  
  // Métodos abstratos (devem ser implementados)
  protected abstract validate(): Promise<Result<void>>;
  protected abstract calculateTaxes(): Promise<Result<void>>;
  protected abstract buildXml(): Promise<Result<string>>;
  protected abstract getSchemaVersion(): string;
  
  // Métodos comuns
  protected async signXml(xml: string): Promise<Result<string>> {
    // Implementação comum de assinatura
  }
  
  public async transmit(): Promise<Result<TransmissionResult>> {
    // Implementação comum de transmissão
  }
  
  public async generatePdf(): Promise<Result<Buffer>> {
    // Delega para gerador específico
  }
  
  // Determina engine de tributação baseado na data
  protected getTaxEngine(): ITaxEngine {
    const date = this.props.emissionDate;
    
    if (date < new Date('2026-01-01')) {
      return new CurrentTaxEngine();
    } else if (date < new Date('2033-01-01')) {
      return new TransitionTaxEngine();
    } else {
      return new NewTaxEngine();
    }
  }
}
```

#### 3.3.2 CT-e Document

```typescript
// src/domain/fiscal/documents/cte/CTeDocument.ts

import { BaseFiscalDocument, FiscalDocumentProps } from '../base/BaseFiscalDocument';
import { Result } from '@/shared/core/Result';
import { CTeKey } from './value-objects/CTeKey';
import { CTeService } from './value-objects/CTeService';
import { CTeModal } from './value-objects/CTeModal';
import { IBSCBSGroup } from '../../tax/value-objects/IBSCBSGroup';

interface CTeDocumentProps extends FiscalDocumentProps {
  // CT-e específico
  serviceType: CTeServiceType; // NORMAL, SUBCONTRATACAO, REDESPACHO, etc.
  modal: CTeModal;            // RODOVIARIO, AEREO, AQUAVIARIO, etc.
  
  // Participantes
  sender: CTeParticipant;     // Remetente
  receiver: CTeParticipant;   // Destinatário
  shipper?: CTeParticipant;   // Expedidor
  consignee?: CTeParticipant; // Recebedor
  payer: CTePayer;            // Tomador do serviço
  
  // Prestação
  service: CTeService;
  
  // Documentos vinculados
  linkedDocuments: CTeLinkedDocument[];
  
  // NOVO: Tributação IBS/CBS
  ibsCbs?: IBSCBSGroup;
  
  // NOVO: Compras governamentais
  governmentPurchase?: GovernmentPurchase;
  
  // NOVO: Valor total do DF-e
  totalDFeValue?: number;
}

export class CTeDocument extends BaseFiscalDocument<CTeDocumentProps> {
  
  private constructor(props: CTeDocumentProps, id?: UniqueEntityID) {
    super(props, id);
  }
  
  public static create(props: CTeDocumentProps): Result<CTeDocument> {
    // Validações de criação
    const keyResult = CTeKey.create({
      uf: props.branchUF,
      emissionDate: props.emissionDate,
      cnpj: props.emitterCnpj,
      model: 57,
      series: props.series,
      number: props.number,
      emissionType: props.emissionType,
      numericCode: props.numericCode
    });
    
    if (keyResult.isFailure) {
      return Result.fail(keyResult.error);
    }
    
    const cte = new CTeDocument({
      ...props,
      key: keyResult.getValue(),
      model: 57
    });
    
    return Result.ok(cte);
  }
  
  protected async validate(): Promise<Result<void>> {
    // Validações específicas CT-e
    
    // 1. Validar chave
    if (!this.props.key.isValid()) {
      return Result.fail('Chave de acesso inválida');
    }
    
    // 2. Validar participantes
    if (!this.props.sender || !this.props.receiver) {
      return Result.fail('Remetente e destinatário são obrigatórios');
    }
    
    // 3. Validar modal
    if (!this.props.modal.isValid()) {
      return Result.fail('Modal de transporte inválido');
    }
    
    // 4. NOVO: Validar campos IBS/CBS para 2026+
    if (this.requiresIbsCbs()) {
      if (!this.props.ibsCbs) {
        return Result.fail('Grupo IBSCBS é obrigatório a partir de 01/01/2026');
      }
      
      const ibsCbsValidation = this.props.ibsCbs.validate();
      if (ibsCbsValidation.isFailure) {
        return ibsCbsValidation;
      }
    }
    
    return Result.ok();
  }
  
  protected async calculateTaxes(): Promise<Result<void>> {
    const taxEngine = this.getTaxEngine();
    
    // Calcular tributos baseado no regime
    const taxResult = await taxEngine.calculate({
      document: this,
      operation: this.props.serviceType,
      origin: this.props.sender.address,
      destination: this.props.receiver.address,
      value: this.props.service.totalValue
    });
    
    if (taxResult.isFailure) {
      return Result.fail(taxResult.error);
    }
    
    const taxes = taxResult.getValue();
    
    // NOVO: Preencher grupo IBSCBS se aplicável
    if (taxes.ibsCbs) {
      this.props.ibsCbs = IBSCBSGroup.create({
        cst: taxes.ibsCbs.cst,
        cClassTrib: taxes.ibsCbs.classificationCode,
        baseValue: taxes.ibsCbs.baseValue,
        ibsUfRate: taxes.ibsCbs.ibsUfRate,
        ibsUfValue: taxes.ibsCbs.ibsUfValue,
        ibsMunRate: taxes.ibsCbs.ibsMunRate,
        ibsMunValue: taxes.ibsCbs.ibsMunValue,
        cbsRate: taxes.ibsCbs.cbsRate,
        cbsValue: taxes.ibsCbs.cbsValue
      }).getValue();
      
      // Calcular valor total do DF-e
      this.props.totalDFeValue = 
        this.props.service.totalValue +
        this.props.ibsCbs.totalIbs +
        this.props.ibsCbs.cbsValue;
    }
    
    return Result.ok();
  }
  
  protected async buildXml(): Promise<Result<string>> {
    const builder = new CTeXmlBuilder(this);
    return builder.build();
  }
  
  protected getSchemaVersion(): string {
    return '4.00';
  }
  
  private requiresIbsCbs(): boolean {
    return this.props.emissionDate >= new Date('2026-01-01');
  }
  
  // Getters específicos
  get key(): CTeKey {
    return this.props.key as CTeKey;
  }
  
  get modal(): CTeModal {
    return this.props.modal;
  }
  
  get ibsCbs(): IBSCBSGroup | undefined {
    return this.props.ibsCbs;
  }
}
```

#### 3.3.3 Grupo IBSCBS Value Object

```typescript
// src/domain/fiscal/tax/value-objects/IBSCBSGroup.ts

import { ValueObject } from '@/shared/domain/ValueObject';
import { Result } from '@/shared/core/Result';
import { CSTIbsCbs } from './CSTIbsCbs';
import { ClassificacaoTributaria } from './ClassificacaoTributaria';

interface IBSCBSGroupProps {
  // Código Situação Tributária
  cst: CSTIbsCbs;
  
  // Classificação Tributária
  cClassTrib: ClassificacaoTributaria;
  
  // Base de Cálculo
  baseValue: number;
  
  // IBS UF
  ibsUfRate: number;
  ibsUfValue: number;
  ibsUfEffectiveRate?: number;
  
  // IBS Municipal
  ibsMunRate: number;
  ibsMunValue: number;
  ibsMunEffectiveRate?: number;
  
  // CBS
  cbsRate: number;
  cbsValue: number;
  cbsEffectiveRate?: number;
  
  // Diferimento
  deferral?: {
    deferralRate: number;
    ibsDeferredValue: number;
    cbsDeferredValue: number;
  };
  
  // Devolução
  refund?: {
    ibsRefundValue: number;
    cbsRefundValue: number;
  };
  
  // Redução
  reduction?: {
    ibsReductionRate: number;
    cbsReductionRate: number;
  };
  
  // Crédito Presumido
  presumedCredit?: {
    creditCode: string;
    creditRate: number;
    ibsCreditValue: number;
    cbsCreditValue: number;
  };
}

export class IBSCBSGroup extends ValueObject<IBSCBSGroupProps> {
  
  private constructor(props: IBSCBSGroupProps) {
    super(props);
  }
  
  public static create(props: IBSCBSGroupProps): Result<IBSCBSGroup> {
    // Validar CST
    if (!props.cst.isValid()) {
      return Result.fail('CST IBS/CBS inválido');
    }
    
    // Validar classificação tributária
    if (!props.cClassTrib.isValid()) {
      return Result.fail('Código de Classificação Tributária inválido');
    }
    
    // Validar base de cálculo
    if (props.baseValue < 0) {
      return Result.fail('Base de cálculo não pode ser negativa');
    }
    
    // Validar alíquotas
    if (props.ibsUfRate < 0 || props.ibsUfRate > 100) {
      return Result.fail('Alíquota IBS UF inválida');
    }
    
    if (props.ibsMunRate < 0 || props.ibsMunRate > 100) {
      return Result.fail('Alíquota IBS Municipal inválida');
    }
    
    if (props.cbsRate < 0 || props.cbsRate > 100) {
      return Result.fail('Alíquota CBS inválida');
    }
    
    // Validar consistência de valores
    const expectedIbsUf = props.baseValue * (props.ibsUfRate / 100);
    const expectedIbsMun = props.baseValue * (props.ibsMunRate / 100);
    const expectedCbs = props.baseValue * (props.cbsRate / 100);
    
    const tolerance = 0.01; // 1 centavo de tolerância
    
    if (Math.abs(props.ibsUfValue - expectedIbsUf) > tolerance) {
      return Result.fail('Valor IBS UF inconsistente com base e alíquota');
    }
    
    return Result.ok(new IBSCBSGroup(props));
  }
  
  // Getters
  get totalIbs(): number {
    return this.props.ibsUfValue + this.props.ibsMunValue;
  }
  
  get totalTax(): number {
    return this.totalIbs + this.props.cbsValue;
  }
  
  get cst(): CSTIbsCbs {
    return this.props.cst;
  }
  
  get classificationCode(): ClassificacaoTributaria {
    return this.props.cClassTrib;
  }
  
  get cbsValue(): number {
    return this.props.cbsValue;
  }
  
  // Gerar XML
  public toXml(): string {
    let xml = '<IBSCBS>';
    xml += `<CST>${this.props.cst.value}</CST>`;
    xml += `<cClassTrib>${this.props.cClassTrib.value}</cClassTrib>`;
    xml += `<vBC>${this.props.baseValue.toFixed(2)}</vBC>`;
    
    // IBS UF
    xml += `<pIBSUF>${this.props.ibsUfRate.toFixed(2)}</pIBSUF>`;
    xml += `<vIBSUF>${this.props.ibsUfValue.toFixed(2)}</vIBSUF>`;
    
    // IBS Municipal
    xml += `<pIBSMun>${this.props.ibsMunRate.toFixed(2)}</pIBSMun>`;
    xml += `<vIBSMun>${this.props.ibsMunValue.toFixed(2)}</vIBSMun>`;
    
    // CBS
    xml += `<pCBS>${this.props.cbsRate.toFixed(2)}</pCBS>`;
    xml += `<vCBS>${this.props.cbsValue.toFixed(2)}</vCBS>`;
    
    // Totais
    xml += `<vIBS>${this.totalIbs.toFixed(2)}</vIBS>`;
    xml += `<vTotTrib>${this.totalTax.toFixed(2)}</vTotTrib>`;
    
    // Diferimento (se aplicável)
    if (this.props.deferral) {
      xml += '<gDif>';
      xml += `<pDif>${this.props.deferral.deferralRate.toFixed(2)}</pDif>`;
      xml += `<vIBSDif>${this.props.deferral.ibsDeferredValue.toFixed(2)}</vIBSDif>`;
      xml += `<vCBSDif>${this.props.deferral.cbsDeferredValue.toFixed(2)}</vCBSDif>`;
      xml += '</gDif>';
    }
    
    // Devolução (se aplicável)
    if (this.props.refund) {
      xml += '<gDev>';
      xml += `<vIBSDev>${this.props.refund.ibsRefundValue.toFixed(2)}</vIBSDev>`;
      xml += `<vCBSDev>${this.props.refund.cbsRefundValue.toFixed(2)}</vCBSDev>`;
      xml += '</gDev>';
    }
    
    // Redução (se aplicável)
    if (this.props.reduction) {
      xml += '<gRed>';
      xml += `<pRedIBS>${this.props.reduction.ibsReductionRate.toFixed(2)}</pRedIBS>`;
      xml += `<pRedCBS>${this.props.reduction.cbsReductionRate.toFixed(2)}</pRedCBS>`;
      xml += '</gRed>';
    }
    
    // Crédito Presumido (se aplicável)
    if (this.props.presumedCredit) {
      xml += '<gCredPres>';
      xml += `<cCredPres>${this.props.presumedCredit.creditCode}</cCredPres>`;
      xml += `<pCredPres>${this.props.presumedCredit.creditRate.toFixed(2)}</pCredPres>`;
      xml += `<vCredPresIBS>${this.props.presumedCredit.ibsCreditValue.toFixed(2)}</vCredPresIBS>`;
      xml += `<vCredPresCBS>${this.props.presumedCredit.cbsCreditValue.toFixed(2)}</vCredPresCBS>`;
      xml += '</gCredPres>';
    }
    
    xml += '</IBSCBS>';
    
    return xml;
  }
  
  // Validação
  public validate(): Result<void> {
    // Revalidar todas as regras
    const createResult = IBSCBSGroup.create(this.props);
    if (createResult.isFailure) {
      return Result.fail(createResult.error);
    }
    return Result.ok();
  }
}
```

#### 3.3.4 Transition Tax Engine

```typescript
// src/domain/fiscal/tax/engines/TransitionTaxEngine.ts

import { ITaxEngine, TaxCalculationInput, TaxCalculationResult } from './ITaxEngine';
import { Result } from '@/shared/core/Result';
import { CurrentTaxEngine } from './CurrentTaxEngine';
import { NewTaxEngine } from './NewTaxEngine';

/**
 * Motor de Tributação para o Período de Transição (2026-2032)
 * 
 * Características:
 * - Calcula AMBOS os sistemas (atual + novo)
 * - Aplica alíquotas progressivas conforme cronograma
 * - Gerencia compensações
 */
export class TransitionTaxEngine implements ITaxEngine {
  
  private currentEngine: CurrentTaxEngine;
  private newEngine: NewTaxEngine;
  
  constructor() {
    this.currentEngine = new CurrentTaxEngine();
    this.newEngine = new NewTaxEngine();
  }
  
  async calculate(input: TaxCalculationInput): Promise<Result<TaxCalculationResult>> {
    const year = input.document.emissionDate.getFullYear();
    
    // Obter alíquotas do período
    const rates = this.getTransitionRates(year);
    
    // Calcular tributos do sistema atual (com redução progressiva)
    const currentResult = await this.currentEngine.calculate({
      ...input,
      rateMultiplier: rates.currentMultiplier
    });
    
    if (currentResult.isFailure) {
      return Result.fail(currentResult.error);
    }
    
    // Calcular tributos do sistema novo (com aumento progressivo)
    const newResult = await this.newEngine.calculate({
      ...input,
      ibsRate: rates.ibsRate,
      cbsRate: rates.cbsRate
    });
    
    if (newResult.isFailure) {
      return Result.fail(newResult.error);
    }
    
    // Combinar resultados
    const combined: TaxCalculationResult = {
      // Sistema atual (reduzido)
      icms: currentResult.getValue().icms,
      iss: currentResult.getValue().iss,
      pis: currentResult.getValue().pis,
      cofins: currentResult.getValue().cofins,
      
      // Sistema novo (crescente)
      ibsCbs: newResult.getValue().ibsCbs,
      
      // Compensação (IBS/CBS compensa PIS/COFINS)
      compensation: this.calculateCompensation(
        currentResult.getValue(),
        newResult.getValue()
      ),
      
      // Total efetivo
      totalEffective: this.calculateEffectiveTotal(
        currentResult.getValue(),
        newResult.getValue()
      )
    };
    
    return Result.ok(combined);
  }
  
  private getTransitionRates(year: number): TransitionRates {
    // Cronograma oficial de transição
    const schedule: Record<number, TransitionRates> = {
      2026: {
        currentMultiplier: 1.0,    // 100% tributos atuais
        ibsRate: 0.10,             // 0,1% IBS (teste)
        cbsRate: 0.90              // 0,9% CBS (teste)
      },
      2027: {
        currentMultiplier: 0.0,    // PIS/COFINS extintos
        ibsRate: 0.10,             // IBS ainda em teste
        cbsRate: 8.80              // CBS alíquota cheia
      },
      2029: {
        currentMultiplier: 0.90,   // ICMS/ISS 90%
        ibsRate: 1.77,             // IBS 10%
        cbsRate: 8.80
      },
      2030: {
        currentMultiplier: 0.80,   // ICMS/ISS 80%
        ibsRate: 3.54,             // IBS 20%
        cbsRate: 8.80
      },
      2031: {
        currentMultiplier: 0.60,   // ICMS/ISS 60%
        ibsRate: 7.08,             // IBS 40%
        cbsRate: 8.80
      },
      2032: {
        currentMultiplier: 0.40,   // ICMS/ISS 40%
        ibsRate: 10.62,            // IBS 60%
        cbsRate: 8.80
      },
      2033: {
        currentMultiplier: 0.0,    // ICMS/ISS extintos
        ibsRate: 17.70,            // IBS 100%
        cbsRate: 8.80
      }
    };
    
    return schedule[year] || schedule[2026];
  }
  
  private calculateCompensation(
    current: CurrentTaxResult,
    newTax: NewTaxResult
  ): CompensationResult {
    // Em 2026: IBS/CBS compensam PIS/COFINS
    const ibsCbsTotal = newTax.ibsCbs.totalTax;
    const pisCofinsTotal = current.pis + current.cofins;
    
    return {
      ibsCbsPaid: ibsCbsTotal,
      pisCofinsOffset: Math.min(ibsCbsTotal, pisCofinsTotal),
      netDue: pisCofinsTotal - Math.min(ibsCbsTotal, pisCofinsTotal),
      refundable: ibsCbsTotal > pisCofinsTotal ? ibsCbsTotal - pisCofinsTotal : 0
    };
  }
  
  private calculateEffectiveTotal(
    current: CurrentTaxResult,
    newTax: NewTaxResult
  ): number {
    // Total efetivo considerando compensação
    const icmsIss = current.icms + current.iss;
    const pisCofins = current.pis + current.cofins;
    const ibsCbs = newTax.ibsCbs.totalTax;
    
    // PIS/COFINS é compensado pelo IBS/CBS
    const compensation = Math.min(ibsCbs, pisCofins);
    
    return icmsIss + pisCofins + ibsCbs - compensation;
  }
}

interface TransitionRates {
  currentMultiplier: number;
  ibsRate: number;
  cbsRate: number;
}
```

---

## 📐 PARTE 4: DESIGN PATTERNS E BEST PRACTICES

### 4.1 Patterns Recomendados

#### Factory Pattern

```typescript
// src/domain/fiscal/documents/base/FiscalDocumentFactory.ts

export class FiscalDocumentFactory {
  
  private static readonly creators: Map<FiscalDocumentModel, DocumentCreator> = new Map([
    [55, NFeDocument.create],
    [57, CTeDocument.create],
    [58, MDFeDocument.create],
    [67, CTeOSDocument.create]
  ]);
  
  public static create<T extends BaseFiscalDocument>(
    model: FiscalDocumentModel,
    props: FiscalDocumentProps
  ): Result<T> {
    const creator = this.creators.get(model);
    
    if (!creator) {
      return Result.fail(`Modelo ${model} não suportado`);
    }
    
    return creator(props) as Result<T>;
  }
  
  public static registerCreator(
    model: FiscalDocumentModel,
    creator: DocumentCreator
  ): void {
    this.creators.set(model, creator);
  }
}
```

#### Strategy Pattern (Tax Engine)

```typescript
// src/domain/fiscal/tax/TaxEngineFactory.ts

export class TaxEngineFactory {
  
  public static getEngine(date: Date): ITaxEngine {
    if (date < new Date('2026-01-01')) {
      return new CurrentTaxEngine();
    }
    
    if (date < new Date('2033-01-01')) {
      return new TransitionTaxEngine();
    }
    
    return new NewTaxEngine();
  }
  
  // Para testes e simulações
  public static getEngineByRegime(regime: TaxRegime): ITaxEngine {
    switch (regime) {
      case TaxRegime.CURRENT:
        return new CurrentTaxEngine();
      case TaxRegime.TRANSITION:
        return new TransitionTaxEngine();
      case TaxRegime.NEW:
        return new NewTaxEngine();
      default:
        throw new Error(`Regime ${regime} não suportado`);
    }
  }
}
```

#### Builder Pattern (XML)

```typescript
// src/domain/fiscal/xml/builders/CTeXmlBuilder.ts

export class CTeXmlBuilder {
  
  private document: CTeDocument;
  private xml: string = '';
  
  constructor(document: CTeDocument) {
    this.document = document;
  }
  
  public build(): Result<string> {
    try {
      this.xml = '<?xml version="1.0" encoding="UTF-8"?>';
      
      this
        .buildRoot()
        .buildInfCte()
        .buildIde()
        .buildEmit()
        .buildRem()
        .buildDest()
        .buildVPrest()
        .buildImp()
        .buildIBSCBS()  // NOVO
        .buildInfCTeNorm()
        .buildInfCarga()
        .buildModal()
        .closeRoot();
      
      return Result.ok(this.xml);
    } catch (error) {
      return Result.fail(`Erro ao gerar XML: ${error.message}`);
    }
  }
  
  private buildIBSCBS(): CTeXmlBuilder {
    if (!this.document.ibsCbs) {
      return this;
    }
    
    this.xml += this.document.ibsCbs.toXml();
    return this;
  }
  
  // ... outros métodos
}
```

#### Adapter Pattern (NFS-e por Prefeitura)

```typescript
// src/domain/fiscal/documents/nfse/adapters/INFSeAdapter.ts

export interface INFSeAdapter {
  toXml(nfse: NFSeDocument): string;
  fromXml(xml: string): NFSeDocument;
  transmit(nfse: NFSeDocument): Promise<TransmissionResult>;
  cancel(nfse: NFSeDocument, reason: string): Promise<CancelResult>;
  getServiceUrl(environment: Environment): string;
}

// src/domain/fiscal/documents/nfse/adapters/NFSeNacional.ts

export class NFSeNacional implements INFSeAdapter {
  
  toXml(nfse: NFSeDocument): string {
    // Implementação padrão nacional ABRASF
    return `
      <EnviarLoteRpsEnvio>
        <LoteRps>
          <Rps>
            <InfDeclaracaoPrestacaoServico>
              <Rps>
                <IdentificacaoRps>
                  <Numero>${nfse.number}</Numero>
                  <Serie>${nfse.series}</Serie>
                  <Tipo>1</Tipo>
                </IdentificacaoRps>
              </Rps>
              <Servico>
                <Valores>
                  <ValorServicos>${nfse.serviceValue}</ValorServicos>
                  <!-- NOVO: Campos IBS/CBS -->
                  <ValorIBS>${nfse.ibsCbs?.totalIbs || 0}</ValorIBS>
                  <ValorCBS>${nfse.ibsCbs?.cbsValue || 0}</ValorCBS>
                </Valores>
              </Servico>
            </InfDeclaracaoPrestacaoServico>
          </Rps>
        </LoteRps>
      </EnviarLoteRpsEnvio>
    `;
  }
  
  // ... implementação completa
}

// src/domain/fiscal/documents/nfse/adapters/NFSeSaoPaulo.ts

export class NFSeSaoPaulo implements INFSeAdapter {
  
  toXml(nfse: NFSeDocument): string {
    // Implementação específica São Paulo
    return `
      <PedidoEnvioRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">
        <Cabecalho>
          <Versao>1</Versao>
        </Cabecalho>
        <RPS>
          <!-- Layout específico SP -->
        </RPS>
      </PedidoEnvioRPS>
    `;
  }
  
  // ... implementação completa
}

// Factory para adapters
export class NFSeAdapterFactory {
  
  private static adapters: Map<string, INFSeAdapter> = new Map([
    ['NACIONAL', new NFSeNacional()],
    ['3550308', new NFSeSaoPaulo()],  // São Paulo
    ['3304557', new NFSeRioDeJaneiro()],  // Rio de Janeiro
    // ... outros municípios
  ]);
  
  public static getAdapter(municipioCode: string): INFSeAdapter {
    return this.adapters.get(municipioCode) || this.adapters.get('NACIONAL')!;
  }
}
```

### 4.2 Documentos Não Fiscais

```typescript
// src/domain/fiscal/documents/non-fiscal/base/BaseNonFiscalDocument.ts

export abstract class BaseNonFiscalDocument<T> extends Entity<T> {
  
  // Documentos não fiscais NÃO têm:
  // - Chave de acesso
  // - Transmissão SEFAZ
  // - Assinatura digital obrigatória
  
  // Documentos não fiscais TÊM:
  // - Número interno
  // - PDF para impressão
  // - Vínculo com documentos fiscais (opcional)
  
  public abstract generatePdf(): Promise<Buffer>;
  public abstract getNumber(): string;
}

// Recibo
export class ReciboDocument extends BaseNonFiscalDocument<ReciboProps> {
  // ...
}

// Nota de Débito
export class NotaDebitoDocument extends BaseNonFiscalDocument<NotaDebitoProps> {
  
  // Pode vincular a CT-e ou NF-e
  linkedFiscalDocuments?: FiscalKey[];
  
  // Valores
  items: NotaDebitoItem[];
  totalValue: number;
  
  // Motivo
  reason: string;
}

// Prestação de Contas de Viagem
export class PrestacaoContasDocument extends BaseNonFiscalDocument<PrestacaoContasProps> {
  
  // Viagem relacionada
  tripId: string;
  driverId: string;
  
  // Despesas
  expenses: DespesaViagem[];
  
  // Adiantamentos
  advances: Adiantamento[];
  
  // Saldo
  balance: number; // positivo = devolver, negativo = receber
  
  // Comprovantes anexos
  attachments: Attachment[];
}

// Romaneio de Carga
export class RomaneioDocument extends BaseNonFiscalDocument<RomaneioProps> {
  
  // CT-e vinculado
  linkedCTe?: CTeKey;
  
  // Itens
  items: RomaneioItem[];
  
  // Totais
  totalWeight: number;
  totalVolumes: number;
  
  // Lacres
  seals?: string[];
}

// Ordem de Coleta
export class OrdemColetaDocument extends BaseNonFiscalDocument<OrdemColetaProps> {
  
  // Solicitante
  requesterId: string;
  
  // Local de coleta
  pickupAddress: Address;
  pickupContact: Contact;
  
  // Previsão
  scheduledDate: Date;
  
  // Carga
  estimatedWeight: number;
  estimatedVolumes: number;
  description: string;
  
  // Status
  status: 'PENDING' | 'SCHEDULED' | 'COLLECTED' | 'CANCELLED';
}
```

---

## 🔧 PARTE 5: IMPLEMENTAÇÃO PRÁTICA

### 5.1 Schema de Banco de Dados (Drizzle ORM)

```typescript
// src/lib/db/schema/fiscal-documents.ts

import { 
  sqlTable, int, varchar, decimal, datetime, 
  text, uniqueIndex, index, foreignKey 
} from 'drizzle-orm/sql-server-core';

// Tabela principal de documentos fiscais
export const fiscalDocuments = sqlTable('fiscal_documents', {
  id: int('id').primaryKey().identity(),
  
  // Multi-tenant
  organizationId: int('organization_id').notNull(),
  branchId: int('branch_id').notNull(),
  
  // Identificação
  model: int('model').notNull(), // 55, 57, 58, 67
  series: int('series').notNull(),
  number: int('number').notNull(),
  accessKey: varchar('access_key', { length: 44 }).notNull(),
  
  // Datas
  emissionDate: datetime('emission_date').notNull(),
  authorizationDate: datetime('authorization_date'),
  
  // Status
  status: varchar('status', { length: 20 }).notNull(),
  // DRAFT, GENERATED, TRANSMITTED, AUTHORIZED, REJECTED, CANCELLED
  
  // Regime tributário
  taxRegime: varchar('tax_regime', { length: 20 }).notNull(),
  // CURRENT, TRANSITION, NEW
  
  // Valores
  totalValue: decimal('total_value', { precision: 15, scale: 2 }).notNull(),
  totalDFeValue: decimal('total_dfe_value', { precision: 15, scale: 2 }),
  
  // XML
  xml: text('xml'),
  xmlSigned: text('xml_signed'),
  
  // Protocolo
  protocol: varchar('protocol', { length: 20 }),
  
  // Auditoria
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime('created_at').notNull().default(sql`GETUTCDATE()`),
  updatedBy: varchar('updated_by', { length: 36 }),
  updatedAt: datetime('updated_at'),
  deletedAt: datetime('deleted_at'),
}, (table) => ({
  // Índices
  accessKeyIdx: uniqueIndex('ix_fiscal_documents_access_key')
    .on(table.accessKey),
  orgBranchIdx: index('ix_fiscal_documents_org_branch')
    .on(table.organizationId, table.branchId, table.model, table.status),
  emissionDateIdx: index('ix_fiscal_documents_emission_date')
    .on(table.organizationId, table.emissionDate),
}));

// Tabela de tributação IBS/CBS
export const fiscalDocumentIbsCbs = sqlTable('fiscal_document_ibs_cbs', {
  id: int('id').primaryKey().identity(),
  fiscalDocumentId: int('fiscal_document_id').notNull(),
  
  // CST e Classificação
  cst: varchar('cst', { length: 2 }).notNull(),
  cClassTrib: varchar('c_class_trib', { length: 5 }).notNull(),
  
  // Base de Cálculo
  baseValue: decimal('base_value', { precision: 15, scale: 2 }).notNull(),
  
  // IBS UF
  ibsUfRate: decimal('ibs_uf_rate', { precision: 5, scale: 2 }).notNull(),
  ibsUfValue: decimal('ibs_uf_value', { precision: 15, scale: 2 }).notNull(),
  ibsUfEffectiveRate: decimal('ibs_uf_effective_rate', { precision: 5, scale: 2 }),
  
  // IBS Municipal
  ibsMunRate: decimal('ibs_mun_rate', { precision: 5, scale: 2 }).notNull(),
  ibsMunValue: decimal('ibs_mun_value', { precision: 15, scale: 2 }).notNull(),
  ibsMunEffectiveRate: decimal('ibs_mun_effective_rate', { precision: 5, scale: 2 }),
  
  // CBS
  cbsRate: decimal('cbs_rate', { precision: 5, scale: 2 }).notNull(),
  cbsValue: decimal('cbs_value', { precision: 15, scale: 2 }).notNull(),
  cbsEffectiveRate: decimal('cbs_effective_rate', { precision: 5, scale: 2 }),
  
  // Totais
  totalIbs: decimal('total_ibs', { precision: 15, scale: 2 }).notNull(),
  totalTax: decimal('total_tax', { precision: 15, scale: 2 }).notNull(),
  
  // Diferimento
  deferralRate: decimal('deferral_rate', { precision: 5, scale: 2 }),
  ibsDeferredValue: decimal('ibs_deferred_value', { precision: 15, scale: 2 }),
  cbsDeferredValue: decimal('cbs_deferred_value', { precision: 15, scale: 2 }),
  
  // Devolução
  ibsRefundValue: decimal('ibs_refund_value', { precision: 15, scale: 2 }),
  cbsRefundValue: decimal('cbs_refund_value', { precision: 15, scale: 2 }),
  
  // Redução
  ibsReductionRate: decimal('ibs_reduction_rate', { precision: 5, scale: 2 }),
  cbsReductionRate: decimal('cbs_reduction_rate', { precision: 5, scale: 2 }),
  
  // Crédito Presumido
  presumedCreditCode: varchar('presumed_credit_code', { length: 10 }),
  presumedCreditRate: decimal('presumed_credit_rate', { precision: 5, scale: 2 }),
  ibsCreditValue: decimal('ibs_credit_value', { precision: 15, scale: 2 }),
  cbsCreditValue: decimal('cbs_credit_value', { precision: 15, scale: 2 }),
  
  createdAt: datetime('created_at').notNull().default(sql`GETUTCDATE()`),
}, (table) => ({
  fiscalDocumentFk: foreignKey({
    columns: [table.fiscalDocumentId],
    foreignColumns: [fiscalDocuments.id]
  }),
  fiscalDocumentIdx: index('ix_fiscal_document_ibs_cbs_doc')
    .on(table.fiscalDocumentId),
}));

// Tabela de compensações (período de transição)
export const fiscalDocumentCompensations = sqlTable('fiscal_document_compensations', {
  id: int('id').primaryKey().identity(),
  fiscalDocumentId: int('fiscal_document_id').notNull(),
  
  // IBS/CBS pago
  ibsCbsPaid: decimal('ibs_cbs_paid', { precision: 15, scale: 2 }).notNull(),
  
  // Compensação
  pisCofinsOffset: decimal('pis_cofins_offset', { precision: 15, scale: 2 }).notNull(),
  
  // Saldo
  netDue: decimal('net_due', { precision: 15, scale: 2 }).notNull(),
  refundable: decimal('refundable', { precision: 15, scale: 2 }).notNull(),
  
  // Status da compensação
  compensationStatus: varchar('compensation_status', { length: 20 }).notNull(),
  // PENDING, COMPENSATED, REFUNDED
  
  createdAt: datetime('created_at').notNull().default(sql`GETUTCDATE()`),
});
```

### 5.2 API Endpoints

```typescript
// src/app/api/fiscal/documents/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { FiscalDocumentFactory } from '@/domain/fiscal/documents/base/FiscalDocumentFactory';
import { z } from 'zod';

const CreateDocumentSchema = z.object({
  model: z.number().int().refine(m => [55, 57, 58, 67].includes(m)),
  series: z.number().int().positive(),
  // ... outros campos
});

export async function POST(request: NextRequest) {
  const ctx = await getTenantContext();
  const branchId = resolveBranchIdOrThrow(request.headers, ctx);
  
  const body = await request.json();
  const validated = CreateDocumentSchema.parse(body);
  
  // Criar documento via Factory
  const documentResult = FiscalDocumentFactory.create(validated.model, {
    ...validated,
    organizationId: ctx.organizationId,
    branchId,
    createdBy: ctx.userId
  });
  
  if (documentResult.isFailure) {
    return NextResponse.json(
      { error: documentResult.error },
      { status: 400 }
    );
  }
  
  const document = documentResult.getValue();
  
  // Gerar XML
  const generateResult = await document.generate();
  if (generateResult.isFailure) {
    return NextResponse.json(
      { error: generateResult.error },
      { status: 400 }
    );
  }
  
  // Salvar no banco
  // ...
  
  return NextResponse.json({
    success: true,
    accessKey: document.key.value,
    xml: document.xmlSigned
  });
}
```

---

## 📊 PARTE 6: BENCHMARKS E COMPARATIVOS

### 6.1 ERPs de Mercado - Como Implementam

| ERP | Abordagem | Pontos Fortes | Pontos Fracos |
|-----|-----------|---------------|---------------|
| **TOTVS Protheus** | Modular com TSS | Aderência fiscal BR, Consultoria interna | Complexidade customização |
| **SAP Brasil** | Localização BR (Baseline) | Robusto, Global | Custo, Dependência consultoria |
| **Oracle NetSuite** | Addon localizado | Cloud-native | Menos flexível para BR |
| **Sankhya** | Nativo BR | Foco em transportadoras | Menos recursos enterprise |
| **TMS Benner** | Especializado TMS | Forte em transporte | Menos abrangente |

### 6.2 Arquitetura Recomendada para AuraCore

| Aspecto | Recomendação | Justificativa |
|---------|--------------|---------------|
| **Componentes** | Um por tipo de documento | Manutenibilidade, SRP |
| **Tax Engine** | Strategy Pattern com Factory | Flexibilidade transição |
| **XML** | Builder Pattern | Complexidade XML |
| **Validação** | Zod + Validador RTC | Dupla validação |
| **PDF** | Template + Componentes | Reusabilidade |
| **NFS-e** | Adapter por prefeitura | Heterogeneidade municipal |

### 6.3 Métricas de Performance Esperadas

| Operação | Meta | Aceitável |
|----------|------|-----------|
| Cálculo tributário | < 50ms | < 100ms |
| Geração XML | < 200ms | < 500ms |
| Validação local | < 100ms | < 200ms |
| Transmissão SEFAZ | < 3s | < 5s |
| Geração PDF | < 500ms | < 1s |

---

## ✅ PARTE 7: CHECKLIST DE IMPLEMENTAÇÃO

### 7.1 Fase 1: Preparação (Até Dez/2025)

- [ ] Atualizar schemas XSD para versões com IBS/CBS
- [ ] Criar Value Objects: CSTIbsCbs, ClassificacaoTributaria, AliquotaIBS, AliquotaCBS
- [ ] Implementar IBSCBSGroup Value Object
- [ ] Criar tabelas de banco: fiscal_document_ibs_cbs, fiscal_document_compensations
- [ ] Atualizar builders XML para incluir grupo IBSCBS
- [ ] Configurar Validador RTC

### 7.2 Fase 2: Implementação Core (Jan/2026)

- [ ] Implementar TransitionTaxEngine
- [ ] Atualizar CTeDocument com suporte IBSCBS
- [ ] Atualizar NFeDocument com suporte IBSCBS
- [ ] Atualizar MDFeDocument (validação documentos vinculados)
- [ ] Implementar adapters NFS-e com campos IBS/CBS
- [ ] Atualizar templates PDF (DACTE, DANFE, DAMDFE)

### 7.3 Fase 3: Integração (Fev/2026+)

- [ ] Integrar com Validador RTC da SEFAZ
- [ ] Implementar lógica de compensação
- [ ] Criar relatórios de apuração IBS/CBS
- [ ] Implementar Split Payment (quando disponível)
- [ ] Testes de homologação com SEFAZ

### 7.4 Fase 4: Monitoramento

- [ ] Dashboards de conformidade
- [ ] Alertas de rejeição por campos IBS/CBS
- [ ] Métricas de transição
- [ ] Auditoria de compensações

---

## 📚 REFERÊNCIAS

### Legislação
- EC 132/2023 - Emenda Constitucional da Reforma Tributária
- LC 214/2025 - Lei Complementar de Regulamentação
- Ato Conjunto CGIBS/RFB 01/2025 - Obrigações Acessórias

### Notas Técnicas
- NT 2025.001 - CT-e Reforma Tributária (versão 1.05b)
- NT 2025.002 - NF-e/NFC-e Reforma Tributária (versão 1.34)
- Informe Técnico 2025.002 RTC - Tabela cClassTrib

### Portais Oficiais
- Portal Nacional NF-e: https://www.nfe.fazenda.gov.br
- Portal CT-e: https://www.cte.fazenda.gov.br
- Receita Federal: https://www.gov.br/receitafederal

### Ferramentas
- Validador RTC (SVRS): https://www.sefaz.rs.gov.br
- Schemas XML: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx

---

**Documento preparado para AuraCore ERP**  
**Versão 1.0 - Dezembro 2024**  
**Sujeito a atualizações conforme publicação de novas NTs**
