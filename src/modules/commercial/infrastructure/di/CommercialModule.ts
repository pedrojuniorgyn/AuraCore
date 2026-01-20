/**
 * Commercial Module - Dependency Injection
 * 
 * @since E9 Fase 2
 */

import { container } from 'tsyringe';

// Gateways
import { ProposalPdfAdapter } from '../adapters/ProposalPdfAdapter';
import type { IProposalPdfGateway } from '../../domain/ports/output/IProposalPdfGateway';

export const COMMERCIAL_TOKENS = {
  ProposalPdfGateway: Symbol.for('IProposalPdfGateway'),
};

let isRegistered = false;

export function registerCommercialModule(): void {
  if (isRegistered) return;

  // Gateways
  container.registerSingleton<IProposalPdfGateway>(
    COMMERCIAL_TOKENS.ProposalPdfGateway,
    ProposalPdfAdapter
  );

  isRegistered = true;
  console.log('[Commercial Module] DI configured - 1 gateway');
}

export function initializeCommercialModule(): void {
  registerCommercialModule();
}
