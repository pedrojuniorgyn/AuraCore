/**
 * IntegrationsModule - Dependency Injection Configuration
 * E7.9 Integrações - Semana 2
 * 
 * Configura DI para todas as integrações externas
 * Switch entre adapters reais e mocks via env vars
 * 
 * ✅ REAL IMPLEMENTATIONS AVAILABLE:
 * - SefazGatewayAdapter (partial - authorizeCte functional)
 * - BtgBankingAdapter (partial - boletos/pix functional)
 * - NodemailerAdapter (full - SMTP email)
 * - OfxParserAdapter (full - OFX/CSV parsing)
 */

import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// Ports
import type { ISefazGateway } from '../../domain/ports/output/ISefazGateway';
import type { IBankingGateway } from '../../domain/ports/output/IBankingGateway';
import type { INotificationService } from '../../domain/ports/output/INotificationService';
import type { IBankStatementParser } from '../../domain/ports/output/IBankStatementParser';

// Adapters - Real
import { SefazGatewayAdapter } from '../adapters/sefaz/SefazGatewayAdapter';
import { BtgBankingAdapter } from '../adapters/banking/BtgBankingAdapter';
import { NodemailerAdapter } from '../adapters/notification/NodemailerAdapter';
import { OfxParserAdapter } from '../adapters/ofx/OfxParserAdapter';

// Adapters - Mocks
import { MockSefazGateway } from '../adapters/sefaz/MockSefazGateway';
import { MockBankingGateway } from '../adapters/banking/MockBankingGateway';
import { MockNotificationService } from '../adapters/notification/MockNotificationService';
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

  // === SEFAZ Gateway ===
  // Partial implementation: authorizeCte functional, others return descriptive errors
  if (useMocks || process.env.USE_MOCK_SEFAZ === 'true') {
    container.registerSingleton<ISefazGateway>(
      TOKENS.SefazGateway,
      MockSefazGateway
    );
    console.log('📝 SEFAZ: Using MockSefazGateway');
  } else {
    container.registerSingleton<ISefazGateway>(
      TOKENS.SefazGateway,
      SefazGatewayAdapter
    );
    console.log('🔌 SEFAZ: Using SefazGatewayAdapter (authorizeCte functional, others pending)');
  }

  // === Banking Gateway ===
  // Partial implementation: boletos and pix functional, payment/dda/balance pending
  if (useMocks || process.env.USE_MOCK_BANKING === 'true') {
    container.registerSingleton<IBankingGateway>(
      TOKENS.BankingGateway,
      MockBankingGateway
    );
    console.log('📝 BANKING: Using MockBankingGateway');
  } else {
    container.registerSingleton<IBankingGateway>(
      TOKENS.BankingGateway,
      BtgBankingAdapter
    );
    console.log('🔌 BANKING: Using BtgBankingAdapter (boletos/pix functional, payment/dda/balance pending)');
  }

  // === Notification Service ===
  // Full implementation: SMTP email via Nodemailer
  if (useMocks || process.env.USE_MOCK_NOTIFICATION === 'true') {
    container.registerSingleton<INotificationService>(
      TOKENS.NotificationService,
      MockNotificationService
    );
    console.log('📝 NOTIFICATION: Using MockNotificationService');
  } else {
    container.registerSingleton<INotificationService>(
      TOKENS.NotificationService,
      NodemailerAdapter
    );
    console.log('🔌 NOTIFICATION: Using NodemailerAdapter (full SMTP support)');
  }

  // === Bank Statement Parser ===
  // Full implementation: OFX and CSV parsing
  if (useMocks || process.env.USE_MOCK_OFX === 'true') {
    container.registerSingleton<IBankStatementParser>(
      TOKENS.BankStatementParser,
      MockBankStatementParser
    );
    console.log('📝 OFX_PARSER: Using MockBankStatementParser');
  } else {
    container.registerSingleton<IBankStatementParser>(
      TOKENS.BankStatementParser,
      OfxParserAdapter
    );
    console.log('🔌 OFX_PARSER: Using OfxParserAdapter (full OFX/CSV support)');
  }

  initialized = true;
  console.log(`✅ IntegrationsModule initialized (useMocks: ${useMocks})`);
}
