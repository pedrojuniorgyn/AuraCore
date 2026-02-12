/**
 * 📋 ACCOUNTING_TOKENS - DI Token Registry
 * 
 * Extraído de AccountingModule.ts para evitar dependências circulares.
 * Use Cases que precisam de @inject(ACCOUNTING_TOKENS.xxx) devem importar daqui.
 */

export const ACCOUNTING_TOKENS = {
  ManagementAccountingGateway: Symbol.for('IManagementAccountingGateway'),
  CostCenterAllocationGateway: Symbol.for('ICostCenterAllocationGateway'),
  ChartOfAccountsRepository: Symbol.for('IChartOfAccountsRepository'),
  // F2.4: Chart of Accounts Use Cases
  ListChartOfAccountsUseCase: Symbol.for('ListChartOfAccountsUseCase'),
  GetChartAccountByIdUseCase: Symbol.for('GetChartAccountByIdUseCase'),
  SuggestChartAccountCodeUseCase: Symbol.for('SuggestChartAccountCodeUseCase'),
  CreateChartAccountUseCase: Symbol.for('CreateChartAccountUseCase'),
  UpdateChartAccountUseCase: Symbol.for('UpdateChartAccountUseCase'),
  DeleteChartAccountUseCase: Symbol.for('DeleteChartAccountUseCase'),
  // F3.5: Accounting Period
  CloseAccountingPeriodUseCase: Symbol.for('CloseAccountingPeriodUseCase'),
  GenerateTrialBalanceUseCase: Symbol.for('GenerateTrialBalanceUseCase'),
};
