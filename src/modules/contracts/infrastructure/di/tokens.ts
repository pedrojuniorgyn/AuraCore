/**
 * Contracts Module DI Tokens
 * Tokens locais para injeção de dependências do módulo Contracts
 * 
 * @module contracts/infrastructure/di
 */

export const CONTRACTS_TOKENS = {
  // Use Cases - Commands
  AnalyzeContractUseCase: Symbol('Contracts.AnalyzeContractUseCase'),
  AnalyzeFreightContractUseCase: Symbol('Contracts.AnalyzeFreightContractUseCase'),
} as const;
