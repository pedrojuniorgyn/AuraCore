/**
 * MockSefazGateway - Mock para testes e desenvolvimento
 * E7.9 Integrações - Semana 1
 * 
 * Simula respostas da SEFAZ para:
 * - Testes unitários e de integração
 * - Desenvolvimento local sem certificado
 */

import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  ISefazGateway,
  AuthorizeCteRequest,
  AuthorizeCteResponse,
  CancelCteRequest,
  CancelCteResponse,
  QueryCteStatusRequest,
  QueryCteStatusResponse,
  InutilizeCteRequest,
  InutilizeCteResponse,
  QueryNfeRequest,
  NfeDistribuicaoResponse,
  ManifestNfeRequest,
  AuthorizeMdfeResponse,
} from '../../../domain/ports/output/ISefazGateway';

@injectable()
export class MockSefazGateway implements ISefazGateway {
  private shouldFail = false;
  private failureCode = '999';
  private failureMessage = 'Mock failure';

  // Controle de comportamento para testes
  setFailure(code: string, message: string): void {
    this.shouldFail = true;
    this.failureCode = code;
    this.failureMessage = message;
  }

  resetFailure(): void {
    this.shouldFail = false;
  }

  async authorizeCte(request: AuthorizeCteRequest): Promise<Result<AuthorizeCteResponse, string>> {
    if (this.shouldFail) {
      return Result.ok({
        success: false,
        rejectionCode: this.failureCode,
        rejectionMessage: this.failureMessage,
      });
    }

    const year = new Date().getFullYear();
    const cteKey = `35${year}00000000000000570010000000011000000019`;

    return Result.ok({
      success: true,
      protocolNumber: `MOCK${Date.now()}`,
      authorizationDate: new Date(),
      cteKey,
    });
  }

  async cancelCte(request: CancelCteRequest): Promise<Result<CancelCteResponse, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    return Result.ok({
      protocolNumber: `MOCK_CANCEL_${Date.now()}`,
      cancellationDate: new Date(),
      status: 'CANCELLED',
      message: 'CTe cancelado com sucesso (mock)',
    });
  }

  async queryCteStatus(request: QueryCteStatusRequest): Promise<Result<QueryCteStatusResponse, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    return Result.ok({
      status: 'AUTHORIZED',
      protocolNumber: `MOCK_PROTOCOL_${Date.now()}`,
      authorizationDate: new Date(),
      message: 'CTe autorizado (mock)',
    });
  }

  async inutilizeCte(request: InutilizeCteRequest): Promise<Result<InutilizeCteResponse, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    return Result.ok({
      protocolNumber: `MOCK_INUT_${Date.now()}`,
      inutilizationDate: new Date(),
      status: 'INUTILIZED',
      message: `Numeração ${request.startNumber}-${request.endNumber} inutilizada (mock)`,
    });
  }

  async queryDistribuicaoDFe(
    request: QueryNfeRequest
  ): Promise<Result<NfeDistribuicaoResponse[], string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    // Retornar NFes mock para testes
    return Result.ok([
      {
        nfeKey: '35240100000000000000550010000000011000000019',
        xml: '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">...</nfeProc>',
        schema: 'procNFe',
        nsu: request.lastNsu + 1,
      },
      {
        nfeKey: '35240100000000000000550010000000021000000028',
        xml: '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">...</nfeProc>',
        schema: 'procNFe',
        nsu: request.lastNsu + 2,
      },
    ]);
  }

  async manifestNfe(request: ManifestNfeRequest): Promise<Result<void, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    return Result.ok(undefined);
  }

  async authorizeMdfe(
    mdfeXml: string,
    environment: 'production' | 'homologation'
  ): Promise<Result<AuthorizeMdfeResponse, string>> {
    if (this.shouldFail) {
      return Result.ok({
        success: false,
        rejectionCode: this.failureCode,
        rejectionMessage: this.failureMessage,
      });
    }

    const year = new Date().getFullYear();
    const mdfeKey = `35${year}00000000000000580010000000011000000019`;

    return Result.ok({
      success: true,
      protocolNumber: `MOCK${Date.now()}`,
      mdfeKey,
    });
  }

  async closeMdfe(
    mdfeKey: string,
    environment: 'production' | 'homologation'
  ): Promise<Result<void, string>> {
    if (this.shouldFail) {
      return Result.fail(this.failureMessage);
    }

    return Result.ok(undefined);
  }
}

