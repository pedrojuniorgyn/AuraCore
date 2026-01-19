# Integrações do Domínio Strategic

O módulo Strategic integra-se com outros módulos do AuraCore para consolidar KPIs em tempo real.

## Arquitetura de Integração

```
┌─────────────────────────────────────────────────────────────────┐
│                     STRATEGIC MODULE                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    KPI Engine                            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ Manual  │  │Financial│  │   TMS   │  │   WMS   │    │   │
│  │  │ Input   │  │ Adapter │  │ Adapter │  │ Adapter │    │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │   │
│  │       │            │            │            │          │   │
│  └───────┼────────────┼────────────┼────────────┼──────────┘   │
│          │            │            │            │               │
└──────────┼────────────┼────────────┼────────────┼───────────────┘
           │            │            │            │
           ▼            ▼            ▼            ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
     │  User    │ │Financial │ │   TMS    │ │   WMS    │
     │  Input   │ │  Module  │ │  Module  │ │  Module  │
     └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Padrão de Integração: Adapters

Cada integração é implementada via Adapter que implementa uma interface de port:

```typescript
// domain/ports/output/IKPIAdapter.ts
export interface IKPIAdapter {
  /**
   * Busca valor atual do KPI.
   */
  getCurrentValue(
    kpiCode: string,
    organizationId: number,
    branchId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Result<number, string>>;
  
  /**
   * Busca histórico do KPI.
   */
  getHistory(
    kpiCode: string,
    organizationId: number,
    branchId: number,
    periods: number
  ): Promise<Result<KPIHistoryPoint[], string>>;
  
  /**
   * Lista KPIs disponíveis nesta fonte.
   */
  listAvailableKPIs(): KPIDefinition[];
}

interface KPIHistoryPoint {
  value: number;
  date: Date;
}

interface KPIDefinition {
  code: string;
  name: string;
  unit: string;
  polarity: 'UP' | 'DOWN';
  description: string;
}
```

## Integração: Financial Module

### KPIs Disponíveis

| Código | Nome | Unidade | Polaridade | Descrição |
|--------|------|---------|------------|-----------|
| FIN_EBITDA | EBITDA | R$ | UP | Earnings Before Interest, Taxes, Depreciation, and Amortization |
| FIN_REVENUE | Receita Líquida | R$ | UP | Faturamento líquido de impostos |
| FIN_GROSS_MARGIN | Margem Bruta | % | UP | (Receita - CMV) / Receita |
| FIN_OPERATING_MARGIN | Margem Operacional | % | UP | Lucro Operacional / Receita |
| FIN_NET_MARGIN | Margem Líquida | % | UP | Lucro Líquido / Receita |
| FIN_OPERATING_COST | Custo Operacional | R$ | DOWN | Total de custos operacionais |
| FIN_OVERHEAD | Despesas Fixas | R$ | DOWN | Custos fixos administrativos |
| FIN_RECEIVABLES_DAYS | Prazo Médio Recebimento | dias | DOWN | DSO - Days Sales Outstanding |
| FIN_PAYABLES_DAYS | Prazo Médio Pagamento | dias | UP | DPO - Days Payables Outstanding |
| FIN_DELINQUENCY | Inadimplência | % | DOWN | Títulos vencidos / Total a receber |

### Implementação do Adapter

```typescript
// infrastructure/adapters/FinancialKPIAdapter.ts
@injectable()
export class FinancialKPIAdapter implements IKPIAdapter {
  constructor(
    @inject(TOKENS.FinancialTitleRepository)
    private financialRepo: IFinancialTitleRepository,
    @inject(TOKENS.AccountingRepository)
    private accountingRepo: IAccountingRepository
  ) {}
  
  async getCurrentValue(
    kpiCode: string,
    organizationId: number,
    branchId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Result<number, string>> {
    switch (kpiCode) {
      case 'FIN_EBITDA':
        return this.calculateEBITDA(organizationId, branchId, periodStart, periodEnd);
      
      case 'FIN_REVENUE':
        return this.calculateRevenue(organizationId, branchId, periodStart, periodEnd);
      
      case 'FIN_DELINQUENCY':
        return this.calculateDelinquency(organizationId, branchId);
      
      default:
        return Result.fail(`KPI não suportado: ${kpiCode}`);
    }
  }
  
  private async calculateEBITDA(
    organizationId: number,
    branchId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Result<number, string>> {
    // Buscar lançamentos contábeis do período
    const entries = await this.accountingRepo.findByPeriod({
      organizationId,
      branchId,
      startDate: periodStart,
      endDate: periodEnd,
      accountTypes: ['REVENUE', 'EXPENSE', 'DEPRECIATION', 'AMORTIZATION']
    });
    
    // Calcular EBITDA = Receita - Despesas + Depreciação + Amortização
    let revenue = 0;
    let expenses = 0;
    let depreciation = 0;
    let amortization = 0;
    
    for (const entry of entries) {
      switch (entry.accountType) {
        case 'REVENUE':
          revenue += entry.amount;
          break;
        case 'EXPENSE':
          expenses += entry.amount;
          break;
        case 'DEPRECIATION':
          depreciation += entry.amount;
          break;
        case 'AMORTIZATION':
          amortization += entry.amount;
          break;
      }
    }
    
    const ebitda = revenue - expenses + depreciation + amortization;
    return Result.ok(ebitda);
  }
  
  private async calculateDelinquency(
    organizationId: number,
    branchId: number
  ): Promise<Result<number, string>> {
    const summary = await this.financialRepo.getReceivablesSummary({
      organizationId,
      branchId,
      status: ['OPEN', 'OVERDUE']
    });
    
    if (summary.totalAmount === 0) {
      return Result.ok(0);
    }
    
    const delinquencyRate = (summary.overdueAmount / summary.totalAmount) * 100;
    return Result.ok(delinquencyRate);
  }
  
  listAvailableKPIs(): KPIDefinition[] {
    return [
      { code: 'FIN_EBITDA', name: 'EBITDA', unit: 'R$', polarity: 'UP', description: 'EBITDA do período' },
      { code: 'FIN_REVENUE', name: 'Receita Líquida', unit: 'R$', polarity: 'UP', description: 'Faturamento líquido' },
      { code: 'FIN_DELINQUENCY', name: 'Inadimplência', unit: '%', polarity: 'DOWN', description: 'Taxa de inadimplência' },
      // ... outros
    ];
  }
}
```

## Integração: TMS Module

### KPIs Disponíveis

| Código | Nome | Unidade | Polaridade | Descrição |
|--------|------|---------|------------|-----------|
| TMS_OTD | On-Time Delivery | % | UP | Entregas no prazo / Total de entregas |
| TMS_LEAD_TIME | Lead Time Médio | dias | DOWN | Tempo médio entre coleta e entrega |
| TMS_COST_PER_KM | Custo por Km | R$/km | DOWN | Custo total / Km rodados |
| TMS_COST_PER_DELIVERY | Custo por Entrega | R$ | DOWN | Custo total / Entregas realizadas |
| TMS_VEHICLE_UTILIZATION | Utilização de Frota | % | UP | Horas em uso / Horas disponíveis |
| TMS_DAMAGE_RATE | Taxa de Avarias | % | DOWN | Entregas com avaria / Total entregas |
| TMS_RETURN_RATE | Taxa de Devolução | % | DOWN | Devoluções / Total entregas |
| TMS_FUEL_EFFICIENCY | Eficiência Combustível | km/L | UP | Km rodados / Litros consumidos |
| TMS_DELIVERY_COUNT | Entregas Realizadas | un | UP | Total de entregas no período |
| TMS_CARGO_VOLUME | Volume Transportado | ton | UP | Toneladas transportadas |

### Implementação do Adapter

```typescript
// infrastructure/adapters/TMSKPIAdapter.ts
@injectable()
export class TMSKPIAdapter implements IKPIAdapter {
  constructor(
    @inject(TOKENS.FreightRepository)
    private freightRepo: IFreightRepository,
    @inject(TOKENS.DeliveryRepository)
    private deliveryRepo: IDeliveryRepository,
    @inject(TOKENS.VehicleRepository)
    private vehicleRepo: IVehicleRepository
  ) {}
  
  async getCurrentValue(
    kpiCode: string,
    organizationId: number,
    branchId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Result<number, string>> {
    switch (kpiCode) {
      case 'TMS_OTD':
        return this.calculateOTD(organizationId, branchId, periodStart, periodEnd);
      
      case 'TMS_LEAD_TIME':
        return this.calculateLeadTime(organizationId, branchId, periodStart, periodEnd);
      
      case 'TMS_COST_PER_KM':
        return this.calculateCostPerKm(organizationId, branchId, periodStart, periodEnd);
      
      case 'TMS_DAMAGE_RATE':
        return this.calculateDamageRate(organizationId, branchId, periodStart, periodEnd);
      
      default:
        return Result.fail(`KPI não suportado: ${kpiCode}`);
    }
  }
  
  private async calculateOTD(
    organizationId: number,
    branchId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Result<number, string>> {
    const deliveries = await this.deliveryRepo.findByPeriod({
      organizationId,
      branchId,
      startDate: periodStart,
      endDate: periodEnd,
      status: 'DELIVERED'
    });
    
    if (deliveries.length === 0) {
      return Result.ok(100); // Sem entregas = 100% OTD
    }
    
    const onTimeCount = deliveries.filter(d => 
      d.deliveredAt <= d.promisedDate
    ).length;
    
    const otd = (onTimeCount / deliveries.length) * 100;
    return Result.ok(otd);
  }
  
  private async calculateLeadTime(
    organizationId: number,
    branchId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Result<number, string>> {
    const deliveries = await this.deliveryRepo.findByPeriod({
      organizationId,
      branchId,
      startDate: periodStart,
      endDate: periodEnd,
      status: 'DELIVERED'
    });
    
    if (deliveries.length === 0) {
      return Result.ok(0);
    }
    
    const totalDays = deliveries.reduce((sum, d) => {
      const days = Math.ceil(
        (d.deliveredAt.getTime() - d.collectedAt.getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);
    
    const avgLeadTime = totalDays / deliveries.length;
    return Result.ok(avgLeadTime);
  }
  
  listAvailableKPIs(): KPIDefinition[] {
    return [
      { code: 'TMS_OTD', name: 'On-Time Delivery', unit: '%', polarity: 'UP', description: 'Percentual de entregas no prazo' },
      { code: 'TMS_LEAD_TIME', name: 'Lead Time Médio', unit: 'dias', polarity: 'DOWN', description: 'Tempo médio de entrega' },
      { code: 'TMS_COST_PER_KM', name: 'Custo por Km', unit: 'R$/km', polarity: 'DOWN', description: 'Custo médio por quilômetro' },
      { code: 'TMS_DAMAGE_RATE', name: 'Taxa de Avarias', unit: '%', polarity: 'DOWN', description: 'Percentual de avarias' },
      // ... outros
    ];
  }
}
```

## Integração: WMS Module

### KPIs Disponíveis

| Código | Nome | Unidade | Polaridade | Descrição |
|--------|------|---------|------------|-----------|
| WMS_INVENTORY_ACCURACY | Acuracidade de Estoque | % | UP | Estoque físico vs sistema |
| WMS_INVENTORY_TURNOVER | Giro de Estoque | x | UP | CMV / Estoque médio |
| WMS_SPACE_UTILIZATION | Ocupação de Armazém | % | UP | Posições ocupadas / Total |
| WMS_PICKING_ACCURACY | Acuracidade de Picking | % | UP | Picks corretos / Total picks |
| WMS_PICKING_PRODUCTIVITY | Produtividade Picking | un/h | UP | Itens separados / Hora |
| WMS_RECEIVING_TIME | Tempo de Recebimento | min | DOWN | Tempo médio de conferência |
| WMS_SHIPPING_TIME | Tempo de Expedição | min | DOWN | Tempo médio de expedição |
| WMS_STOCK_DAYS | Dias de Estoque | dias | DOWN | Estoque / Consumo médio diário |
| WMS_STOCKOUT_RATE | Taxa de Ruptura | % | DOWN | SKUs em falta / Total SKUs |
| WMS_ABC_A_COVERAGE | Cobertura Classe A | % | UP | Itens A disponíveis / Total A |

### Implementação do Adapter

```typescript
// infrastructure/adapters/WMSKPIAdapter.ts
@injectable()
export class WMSKPIAdapter implements IKPIAdapter {
  constructor(
    @inject(TOKENS.InventoryRepository)
    private inventoryRepo: IInventoryRepository,
    @inject(TOKENS.WarehouseRepository)
    private warehouseRepo: IWarehouseRepository
  ) {}
  
  async getCurrentValue(
    kpiCode: string,
    organizationId: number,
    branchId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Result<number, string>> {
    switch (kpiCode) {
      case 'WMS_INVENTORY_ACCURACY':
        return this.calculateInventoryAccuracy(organizationId, branchId);
      
      case 'WMS_SPACE_UTILIZATION':
        return this.calculateSpaceUtilization(organizationId, branchId);
      
      case 'WMS_INVENTORY_TURNOVER':
        return this.calculateTurnover(organizationId, branchId, periodStart, periodEnd);
      
      case 'WMS_STOCKOUT_RATE':
        return this.calculateStockoutRate(organizationId, branchId);
      
      default:
        return Result.fail(`KPI não suportado: ${kpiCode}`);
    }
  }
  
  private async calculateInventoryAccuracy(
    organizationId: number,
    branchId: number
  ): Promise<Result<number, string>> {
    const summary = await this.inventoryRepo.getAccuracySummary({
      organizationId,
      branchId
    });
    
    if (summary.totalItems === 0) {
      return Result.ok(100);
    }
    
    const accuracy = (summary.accurateItems / summary.totalItems) * 100;
    return Result.ok(accuracy);
  }
  
  private async calculateSpaceUtilization(
    organizationId: number,
    branchId: number
  ): Promise<Result<number, string>> {
    const warehouse = await this.warehouseRepo.getCapacitySummary({
      organizationId,
      branchId
    });
    
    if (warehouse.totalPositions === 0) {
      return Result.ok(0);
    }
    
    const utilization = (warehouse.occupiedPositions / warehouse.totalPositions) * 100;
    return Result.ok(utilization);
  }
  
  listAvailableKPIs(): KPIDefinition[] {
    return [
      { code: 'WMS_INVENTORY_ACCURACY', name: 'Acuracidade de Estoque', unit: '%', polarity: 'UP', description: 'Precisão do inventário' },
      { code: 'WMS_SPACE_UTILIZATION', name: 'Ocupação de Armazém', unit: '%', polarity: 'UP', description: 'Utilização do espaço' },
      { code: 'WMS_INVENTORY_TURNOVER', name: 'Giro de Estoque', unit: 'x', polarity: 'UP', description: 'Velocidade de rotação' },
      { code: 'WMS_STOCKOUT_RATE', name: 'Taxa de Ruptura', unit: '%', polarity: 'DOWN', description: 'Itens em falta' },
      // ... outros
    ];
  }
}
```

## Configuração de DI

```typescript
// infrastructure/di/strategic.container.ts
import { container } from 'tsyringe';

// Adapters de KPI
container.register<IKPIAdapter>(TOKENS.FinancialKPIAdapter, {
  useClass: FinancialKPIAdapter
});

container.register<IKPIAdapter>(TOKENS.TMSKPIAdapter, {
  useClass: TMSKPIAdapter
});

container.register<IKPIAdapter>(TOKENS.WMSKPIAdapter, {
  useClass: WMSKPIAdapter
});

// Factory de Adapters
container.register<IKPIAdapterFactory>(TOKENS.KPIAdapterFactory, {
  useFactory: (c) => ({
    getAdapter(sourceType: string): IKPIAdapter | null {
      switch (sourceType) {
        case 'FINANCIAL':
          return c.resolve(TOKENS.FinancialKPIAdapter);
        case 'TMS':
          return c.resolve(TOKENS.TMSKPIAdapter);
        case 'WMS':
          return c.resolve(TOKENS.WMSKPIAdapter);
        default:
          return null;
      }
    }
  })
});
```

## Scheduler de Atualização

```typescript
// infrastructure/jobs/KPIUpdateJob.ts
@injectable()
export class KPIUpdateJob {
  constructor(
    @inject(TOKENS.KPIRepository) private kpiRepo: IKPIRepository,
    @inject(TOKENS.KPIAdapterFactory) private adapterFactory: IKPIAdapterFactory,
    @inject(TOKENS.EventBus) private eventBus: IEventBus
  ) {}
  
  /**
   * Executa atualização de KPIs automáticos.
   * Agendado para rodar a cada hora.
   */
  async execute(): Promise<void> {
    const kpis = await this.kpiRepo.findBySourceType(['FINANCIAL', 'TMS', 'WMS']);
    
    for (const kpi of kpis) {
      const adapter = this.adapterFactory.getAdapter(kpi.sourceType);
      if (!adapter) continue;
      
      const periodEnd = new Date();
      const periodStart = this.getPeriodStart(kpi.frequency, periodEnd);
      
      const valueResult = await adapter.getCurrentValue(
        kpi.sourceConfig?.kpiCode || kpi.code,
        kpi.organizationId,
        kpi.branchId,
        periodStart,
        periodEnd
      );
      
      if (valueResult.isOk()) {
        const previousValue = kpi.currentValue;
        await kpi.updateValue(valueResult.value, periodEnd, kpi.sourceType);
        await this.kpiRepo.save(kpi);
        
        // Verificar alerta
        const status = kpi.target.calculateStatus(valueResult.value);
        if (status === 'RED') {
          this.eventBus.publish(new KPIAlertTriggeredEvent(
            kpi.id,
            kpi.code,
            kpi.name,
            'CRITICAL',
            valueResult.value,
            kpi.target.value,
            kpi.target.calculateVariancePercent(valueResult.value),
            kpi.daysInCurrentStatus
          ));
        }
      }
    }
  }
  
  private getPeriodStart(frequency: KPIFrequency, periodEnd: Date): Date {
    const start = new Date(periodEnd);
    
    switch (frequency) {
      case 'DAILY':
        start.setDate(start.getDate() - 1);
        break;
      case 'WEEKLY':
        start.setDate(start.getDate() - 7);
        break;
      case 'MONTHLY':
        start.setMonth(start.getMonth() - 1);
        break;
    }
    
    return start;
  }
}
```

## Integração Futura: Fiscal Module

### KPIs Planejados

| Código | Nome | Descrição |
|--------|------|-----------|
| FISCAL_SPED_COMPLIANCE | Compliance SPED | % de obrigações entregues |
| FISCAL_TAX_CREDITS | Créditos Tributários | Valor de créditos acumulados |
| FISCAL_AUDIT_ISSUES | Pendências Fiscais | Quantidade de alertas ativos |

Esta integração será implementada na Fase 4 (KPIs) do épico E10.
