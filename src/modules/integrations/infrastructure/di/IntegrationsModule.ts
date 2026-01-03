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

// Adapters
import { SefazGatewayAdapter } from '../adapters/sefaz/SefazGatewayAdapter';
import { MockSefazGateway } from '../adapters/sefaz/MockSefazGateway';
import { BtgBankingAdapter } from '../adapters/banking/BtgBankingAdapter';
import { MockBankingGateway } from '../adapters/banking/MockBankingGateway';
import { NodemailerAdapter } from '../adapters/notification/NodemailerAdapter';
import { MockNotificationService } from '../adapters/notification/MockNotificationService';
import { OfxParserAdapter } from '../adapters/ofx/OfxParserAdapter';
import { MockBankStatementParser } from '../adapters/ofx/MockBankStatementParser';

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
  if (useMocks) {
    container.registerSingleton<ISefazGateway>(
      TOKENS.SefazGateway,
      MockSefazGateway
    );
  } else {
    container.registerSingleton<ISefazGateway>(
      TOKENS.SefazGateway,
      SefazGatewayAdapter
    );
  }

  // Banking
  if (useMocks) {
    container.registerSingleton<IBankingGateway>(
      TOKENS.BankingGateway,
      MockBankingGateway
    );
  } else {
    container.registerSingleton<IBankingGateway>(
      TOKENS.BankingGateway,
      BtgBankingAdapter
    );
  }

  // Notification
  if (useMocks) {
    container.registerSingleton<INotificationService>(
      TOKENS.NotificationService,
      MockNotificationService
    );
  } else {
    container.registerSingleton<INotificationService>(
      TOKENS.NotificationService,
      NodemailerAdapter
    );
  }

  // Bank Statement Parser
  // Sempre usar o adapter real, pois parsing é local
  if (useMocks) {
    container.registerSingleton<IBankStatementParser>(
      TOKENS.BankStatementParser,
      MockBankStatementParser
    );
  } else {
    container.registerSingleton<IBankStatementParser>(
      TOKENS.BankStatementParser,
      OfxParserAdapter
    );
  }

  initialized = true;
  console.log(`✅ IntegrationsModule initialized (mocks: ${useMocks})`);
}

