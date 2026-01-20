/**
 * IntegrationsModule - Dependency Injection Configuration
 * E7.9 Integrações - Semana 2
 * 
 * Configura DI para todas as integrações externas
 * Switch entre adapters reais e mocks via env vars
 * 
 * ⚠️ IMPLEMENTATION STATUS (LC-896237):
 * - SefazGatewayAdapter: 1/7 methods (authorizeCte only) → DEFAULT MOCK
 * - BtgBankingAdapter: 6/11 methods (boletos/pix) → DEFAULT MOCK
 * - NodemailerAdapter: 100% implemented → Can use real
 * - OfxParserAdapter: 100% implemented → Can use real
 * 
 * PRODUCTION SAFETY: Defaults to mocks for partial adapters to prevent
 * 100% failure rate when unimplemented methods are called.
 */

import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// Ports
import type { ISefazGateway } from '../../domain/ports/output/ISefazGateway';
import type { IBankingGateway } from '../../domain/ports/output/IBankingGateway';
import type { INotificationService } from '../../domain/ports/output/INotificationService';
import type { IBankStatementParser } from '../../domain/ports/output/IBankStatementParser';
import type { IAgentsGateway } from '../../domain/ports/output/IAgentsGateway';

// Adapters - Real
import { SefazGatewayAdapter } from '../adapters/sefaz/SefazGatewayAdapter';
import { SefazLegacyClientAdapter } from '../adapters/sefaz/SefazLegacyClientAdapter';
import { BtgBankingAdapter } from '../adapters/banking/BtgBankingAdapter';
import { BtgLegacyClientAdapter } from '../adapters/banking/BtgLegacyClientAdapter';
import { NodemailerAdapter } from '../adapters/notification/NodemailerAdapter';
import { OfxParserAdapter } from '../adapters/ofx/OfxParserAdapter';
import { AgentsAdapter } from '../adapters/AgentsAdapter';

// Ports - Legacy Clients
import type { ISefazClient } from '../../domain/ports/output/ISefazClient';
import type { IBtgClient } from '../../domain/ports/output/IBtgClient';

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

  // ⚠️ BREAKING CHANGE WARNING (LC-896237)
  // If no explicit mock configuration is set, warn about the safe defaults
  if (
    process.env.NODE_ENV !== 'test' &&
    process.env.USE_MOCK_INTEGRATIONS !== 'true' &&
    process.env.USE_MOCK_SEFAZ === undefined &&
    process.env.USE_MOCK_BANKING === undefined
  ) {
    console.warn(
      '\n⚠️  [IntegrationsModule] IMPORTANT: No USE_MOCK_* environment variables set.\n' +
      '   Defaulting to MOCKS for SEFAZ and Banking adapters (LC-896237).\n' +
      '   This is a SAFE DEFAULT because real adapters have stub methods that will fail.\n' +
      '\n' +
      '   Implementation Status:\n' +
      '     - SefazGatewayAdapter: 1/7 methods (14%) → Using MockSefazGateway\n' +
      '     - BtgBankingAdapter: 6/11 methods (55%) → Using MockBankingGateway\n' +
      '\n' +
      '   To use REAL adapters (not recommended until E7.11):\n' +
      '     USE_MOCK_SEFAZ=false\n' +
      '     USE_MOCK_BANKING=false\n' +
      '\n' +
      '   To silence this warning:\n' +
      '     USE_MOCK_SEFAZ=true\n' +
      '     USE_MOCK_BANKING=true\n'
    );
  }

  // === SEFAZ Client (Legacy Wrapper) ===
  // E7-Onda A: Registrar adapter que wrapa serviço legado
  // Sempre registrar o client pois é dependência do SefazGatewayAdapter
  container.registerSingleton<ISefazClient>(
    TOKENS.SefazClient,
    SefazLegacyClientAdapter
  );

  // === SEFAZ Gateway ===
  // ⚠️ PARTIAL (1/7 methods): Only authorizeCte is functional
  // Default to mock to prevent production failures on unimplemented methods
  // Use real adapter ONLY if explicitly enabled via USE_MOCK_SEFAZ=false
  if (useMocks || process.env.USE_MOCK_SEFAZ !== 'false') {
    container.registerSingleton<ISefazGateway>(
      TOKENS.SefazGateway,
      MockSefazGateway
    );
    console.log('📝 SEFAZ: Using MockSefazGateway (safe default)');
  } else {
    container.registerSingleton<ISefazGateway>(
      TOKENS.SefazGateway,
      SefazGatewayAdapter
    );
    console.warn('⚠️ SEFAZ: Using SefazGatewayAdapter (6/7 methods will fail! Only authorizeCte works)');
  }

  // === BTG Client (Legacy Wrapper) ===
  // E7-Onda A: Registrar adapter que wrapa serviços legados BTG
  // Sempre registrar o client pois é dependência do BtgBankingAdapter
  container.registerSingleton<IBtgClient>(
    TOKENS.BtgClient,
    BtgLegacyClientAdapter
  );

  // === Banking Gateway ===
  // ⚠️ PARTIAL (6/11 methods): Boletos/Pix work, payment/dda/balance are stub
  // Default to mock to prevent production failures on unimplemented methods
  // Use real adapter ONLY if explicitly enabled via USE_MOCK_BANKING=false
  if (useMocks || process.env.USE_MOCK_BANKING !== 'false') {
    container.registerSingleton<IBankingGateway>(
      TOKENS.BankingGateway,
      MockBankingGateway
    );
    console.log('📝 BANKING: Using MockBankingGateway (safe default)');
  } else {
    container.registerSingleton<IBankingGateway>(
      TOKENS.BankingGateway,
      BtgBankingAdapter
    );
    console.warn('⚠️ BANKING: Using BtgBankingAdapter (5/11 methods will fail! Only boletos/pix work)');
  }

  // === Notification Service ===
  // ✅ COMPLETE (2/2 methods): Full SMTP email via Nodemailer
  // Safe to use in production when SMTP credentials are configured
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
    console.log('✅ NOTIFICATION: Using NodemailerAdapter (full implementation)');
  }

  // === Bank Statement Parser ===
  // ✅ COMPLETE (2/2 methods): Full OFX and CSV parsing
  // Safe to use in production (local parsing, no external dependencies)
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
    console.log('✅ OFX_PARSER: Using OfxParserAdapter (full implementation)');
  }

  // === Agents Gateway ===
  // ✅ COMPLETE (4/4 methods): Full HTTP client for Python agents API
  // Always use real adapter (no mock needed - fails gracefully if service unavailable)
  container.registerSingleton<IAgentsGateway>(
    TOKENS.AgentsGateway,
    AgentsAdapter
  );
  console.log('✅ AGENTS: Using AgentsAdapter');

  initialized = true;
  console.log(`✅ IntegrationsModule initialized (useMocks: ${useMocks})`);
}
