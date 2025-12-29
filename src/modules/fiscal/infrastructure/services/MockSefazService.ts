import { Result } from '@/shared/domain';
import type { 
  ISefazService, 
  TransmissionResult, 
  AuthorizationResult, 
  CancellationResult, 
  StatusResult 
} from '../../domain/ports/output/ISefazService';
import type { FiscalDocument } from '../../domain/entities/FiscalDocument';
import { FiscalKey } from '../../domain/value-objects/FiscalKey';

/**
 * MockSefazService
 * 
 * Implementação simulada do serviço SEFAZ para desenvolvimento e testes.
 * Simula comportamento real da SEFAZ sem fazer chamadas HTTP.
 * 
 * Características:
 * - Delay simulado (100-300ms) para simular latência de rede
 * - Gera protocolos e chaves fiscais válidas
 * - Retorna sempre sucesso (99% dos casos)
 * - 1% de chance de rejeição para testar error handling
 * 
 * ⚠️ NÃO USAR EM PRODUÇÃO!
 * Para produção, implementar RealSefazService com integração real.
 */
export class MockSefazService implements ISefazService {
  private readonly DELAY_MIN_MS = 100;
  private readonly DELAY_MAX_MS = 300;
  private readonly REJECTION_RATE = 0.01; // 1% de chance de rejeição

  /**
   * Simula delay de rede
   */
  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * (this.DELAY_MAX_MS - this.DELAY_MIN_MS) + this.DELAY_MIN_MS;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Gera protocolo simulado (15 dígitos)
   */
  private generateProtocol(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${timestamp.slice(-11)}${random}`;
  }

  /**
   * Simula chance de rejeição (para testar error handling)
   */
  private shouldReject(): boolean {
    return Math.random() < this.REJECTION_RATE;
  }

  /**
   * Transmite documento para SEFAZ (SIMULADO)
   */
  async transmit(document: FiscalDocument): Promise<Result<TransmissionResult, string>> {
    await this.simulateDelay();

    // Validar documento básico
    if (document.items.length === 0) {
      return Result.fail('Documento sem itens não pode ser transmitido');
    }

    // Simular rejeição ocasional
    if (this.shouldReject()) {
      return Result.fail('SEFAZ MOCK: Documento rejeitado (simulação de erro)');
    }

    const protocolNumber = this.generateProtocol();
    const fiscalKey = document.fiscalKey?.value || '';

    const result: TransmissionResult = {
      success: true,
      protocolNumber,
      fiscalKey,
      transmittedAt: new Date(),
      message: 'Documento transmitido com sucesso (MOCK)'
    };

    return Result.ok(result);
  }

  /**
   * Autoriza documento na SEFAZ (SIMULADO)
   */
  async authorize(fiscalKey: string): Promise<Result<AuthorizationResult, string>> {
    await this.simulateDelay();

    // Validar chave fiscal
    const fiscalKeyResult = FiscalKey.create(fiscalKey);
    if (Result.isFail(fiscalKeyResult)) {
      return Result.fail(`Chave fiscal inválida: ${fiscalKeyResult.error}`);
    }

    // Simular rejeição ocasional
    if (this.shouldReject()) {
      const result: AuthorizationResult = {
        authorized: false,
        protocolNumber: this.generateProtocol(),
        fiscalKey,
        authorizedAt: new Date(),
        statusCode: '302',
        statusMessage: 'Uso Denegado: Irregularidade fiscal do emitente (MOCK)'
      };
      return Result.ok(result);
    }

    // Sucesso
    const result: AuthorizationResult = {
      authorized: true,
      protocolNumber: this.generateProtocol(),
      fiscalKey,
      authorizedAt: new Date(),
      statusCode: '100',
      statusMessage: 'Autorizado o uso da NF-e (MOCK)'
    };

    return Result.ok(result);
  }

  /**
   * Cancela documento na SEFAZ (SIMULADO)
   */
  async cancel(fiscalKey: string, reason: string): Promise<Result<CancellationResult, string>> {
    await this.simulateDelay();

    // Validar chave fiscal
    const fiscalKeyResult = FiscalKey.create(fiscalKey);
    if (Result.isFail(fiscalKeyResult)) {
      return Result.fail(`Chave fiscal inválida: ${fiscalKeyResult.error}`);
    }

    // Validar motivo (SEFAZ exige mínimo 15 caracteres)
    if (reason.length < 15) {
      return Result.fail('Motivo do cancelamento deve ter no mínimo 15 caracteres');
    }

    // Simular rejeição ocasional
    if (this.shouldReject()) {
      const result: CancellationResult = {
        cancelled: false,
        protocolNumber: this.generateProtocol(),
        fiscalKey,
        cancelledAt: new Date(),
        statusCode: '563',
        statusMessage: 'Cancelamento fora do prazo permitido (MOCK)'
      };
      return Result.ok(result);
    }

    // Sucesso
    const result: CancellationResult = {
      cancelled: true,
      protocolNumber: this.generateProtocol(),
      fiscalKey,
      cancelledAt: new Date(),
      statusCode: '101',
      statusMessage: 'Cancelamento de NF-e homologado (MOCK)'
    };

    return Result.ok(result);
  }

  /**
   * Consulta status de documento na SEFAZ (SIMULADO)
   */
  async queryStatus(fiscalKey: string): Promise<Result<StatusResult, string>> {
    await this.simulateDelay();

    // Validar chave fiscal
    const fiscalKeyResult = FiscalKey.create(fiscalKey);
    if (Result.isFail(fiscalKeyResult)) {
      return Result.fail(`Chave fiscal inválida: ${fiscalKeyResult.error}`);
    }

    // Simular status (80% autorizado, 10% cancelado, 10% pendente)
    const random = Math.random();
    let status: 'AUTHORIZED' | 'CANCELLED' | 'PENDING';
    let statusCode: string;
    let statusMessage: string;

    if (random < 0.8) {
      status = 'AUTHORIZED';
      statusCode = '100';
      statusMessage = 'Autorizado o uso da NF-e (MOCK)';
    } else if (random < 0.9) {
      status = 'CANCELLED';
      statusCode = '101';
      statusMessage = 'Cancelamento de NF-e homologado (MOCK)';
    } else {
      status = 'PENDING';
      statusCode = '105';
      statusMessage = 'Lote em processamento (MOCK)';
    }

    const result: StatusResult = {
      fiscalKey,
      status,
      statusCode,
      statusMessage,
      queriedAt: new Date()
    };

    return Result.ok(result);
  }
}

