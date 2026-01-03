/**
 * IntegrationsModule - Dependency Injection Configuration
 * E7.9 Integrações - Semana 1
 * 
 * Configura DI para todas as integrações externas
 * Switch entre adapters reais e mocks via env vars
 */

import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// Ports
import type { ISefazGateway } from '../../domain/ports/output/ISefazGateway';
import type { IBankingGateway } from '../../domain/ports/output/IBankingGateway';
import type { INotificationService } from '../../domain/ports/output/INotificationService';
import type { IBankStatementParser } from '../../domain/ports/output/IBankStatementParser';

// Adapters - Mocks (usados até implementação real estar pronta)
import { MockSefazGateway } from '../adapters/sefaz/MockSefazGateway';
import { MockBankingGateway } from '../adapters/banking/MockBankingGateway';
import { MockNotificationService } from '../adapters/notification/MockNotificationService';
import { MockBankStatementParser } from '../adapters/ofx/MockBankStatementParser';

// Adapters - Real (não usados ainda - stubs incompletos)
// import { SefazGatewayAdapter } from '../adapters/sefaz/SefazGatewayAdapter';
// import { BtgBankingAdapter } from '../adapters/banking/BtgBankingAdapter';
// import { NodemailerAdapter } from '../adapters/notification/NodemailerAdapter';
// import { OfxParserAdapter } from '../adapters/ofx/OfxParserAdapter';

let initialized = false;

export function initializeIntegrationsModule(): void {
  if (initialized) {
    console.log('⚠️ IntegrationsModule already initialized');
    return;
  }

  const useMocks =
    process.env.NODE_ENV === 'test' ||
    process.env.USE_MOCK_INTEGRATIONS === 'true';

  // SEFAZ
  // ⚠️ IMPORTANTE: SefazGatewayAdapter ainda não está implementado para produção
  // Mesmo que useMocks seja false, vamos usar MockSefazGateway até E7.9 Semana 2
  // TODO: E7.9 Semana 2 - Implementar integração SEFAZ real com mTLS
  // Motivo: Ambos SefazGatewayAdapter e sefaz-client.ts retornam failure em produção
  // Usar mock é mais honesto do que falhar silenciosamente
  container.registerSingleton<ISefazGateway>(
    TOKENS.SefazGateway,
    MockSefazGateway
  );
  
  if (!useMocks) {
    console.warn('⚠️ SEFAZ: Usando MockSefazGateway mesmo em produção (implementação real pendente)');
  }

  // Banking
  // ⚠️ IMPORTANTE: BtgBankingAdapter não está implementado
  // Sempre usar MockBankingGateway até E7.9 Semana 2
  // TODO: E7.9 Semana 2 - Implementar integração BTG Pactual real com OAuth2
  // Motivo: BtgBankingAdapter retorna Result.fail() para todos os métodos
  container.registerSingleton<IBankingGateway>(
    TOKENS.BankingGateway,
    MockBankingGateway
  );
  
  if (!useMocks) {
    console.warn('⚠️ BANKING: Usando MockBankingGateway mesmo em produção (implementação real pendente)');
  }

  // Notification
  // ⚠️ IMPORTANTE: NodemailerAdapter não está implementado
  // Sempre usar MockNotificationService até E7.9 Semana 2
  // TODO: E7.9 Semana 2 - Implementar integração Nodemailer real
  // Motivo: NodemailerAdapter retorna Result.fail() para todos os métodos
  container.registerSingleton<INotificationService>(
    TOKENS.NotificationService,
    MockNotificationService
  );
  
  if (!useMocks) {
    console.warn('⚠️ NOTIFICATION: Usando MockNotificationService mesmo em produção (implementação real pendente)');
  }

  // Bank Statement Parser
  // ⚠️ IMPORTANTE: OfxParserAdapter não está implementado
  // Sempre usar MockBankStatementParser até E7.9 Semana 2
  // TODO: E7.9 Semana 2 - Implementar parsing OFX real
  // Motivo: OfxParserAdapter retorna Result.fail() para todos os métodos
  container.registerSingleton<IBankStatementParser>(
    TOKENS.BankStatementParser,
    MockBankStatementParser
  );
  
  if (!useMocks) {
    console.warn('⚠️ OFX_PARSER: Usando MockBankStatementParser mesmo em produção (implementação real pendente)');
  }

  initialized = true;
  console.log('✅ IntegrationsModule initialized - ALL ADAPTERS USING MOCKS (real implementations pending E7.9 Semana 2)');
}

