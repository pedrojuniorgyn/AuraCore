/**
 * Módulo DI Contracts
 * Registra dependencies do módulo de análise de contratos
 * 
 * @module contracts/infrastructure/di
 */
import { container } from 'tsyringe';
import { CONTRACTS_TOKENS } from './tokens';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// Application - Use Cases
import { AnalyzeContractUseCase } from '../../application/commands/analyze-contract';
import { AnalyzeFreightContractUseCase } from '../../application/commands/analyze-freight-contract';

export function registerContractsModule(): void {
  // ============================================================================
  // USE CASES - Commands
  // ============================================================================
  
  // Análise genérica de contratos
  container.register(CONTRACTS_TOKENS.AnalyzeContractUseCase, {
    useClass: AnalyzeContractUseCase,
  });

  // Análise especializada de contratos de frete (com Docling)
  container.register(CONTRACTS_TOKENS.AnalyzeFreightContractUseCase, {
    useClass: AnalyzeFreightContractUseCase,
  });
  
  // Token global para compatibilidade
  container.register(TOKENS.AnalyzeFreightContractUseCase, {
    useClass: AnalyzeFreightContractUseCase,
  });

  console.log('[Contracts Module] DI registrado: 2 use cases');
}
