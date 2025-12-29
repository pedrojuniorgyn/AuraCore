import { Result } from '@/shared/domain';
import type { FiscalDocument } from '../../entities/FiscalDocument';

/**
 * Resultado da transmissão SEFAZ
 */
export interface TransmissionResult {
  success: boolean;
  protocolNumber: string;
  fiscalKey: string;
  transmittedAt: Date;
  message?: string;
}

/**
 * Resultado da autorização SEFAZ
 */
export interface AuthorizationResult {
  authorized: boolean;
  protocolNumber: string;
  fiscalKey: string;
  authorizedAt: Date;
  statusCode: string; // Ex: "100" = Autorizado
  statusMessage: string;
}

/**
 * Resultado do cancelamento SEFAZ
 */
export interface CancellationResult {
  cancelled: boolean;
  protocolNumber: string;
  fiscalKey: string;
  cancelledAt: Date;
  statusCode: string;
  statusMessage: string;
}

/**
 * Resultado da consulta de status SEFAZ
 */
export interface StatusResult {
  fiscalKey: string;
  status: 'AUTHORIZED' | 'REJECTED' | 'CANCELLED' | 'PENDING' | 'UNKNOWN';
  statusCode: string;
  statusMessage: string;
  queriedAt: Date;
}

/**
 * Port: ISefazService
 * 
 * Interface para integração com SEFAZ (Secretaria da Fazenda).
 * Permite transmissão, autorização, cancelamento e consulta de documentos fiscais.
 * 
 * Implementações:
 * - MockSefazService: Para testes/desenvolvimento (retorna sucesso simulado)
 * - RealSefazService: Para produção (integração real com webservices SEFAZ)
 * 
 * Padrão: Hexagonal Architecture (Port)
 */
export interface ISefazService {
  /**
   * Transmite documento para SEFAZ
   * 
   * @param document Documento fiscal a ser transmitido
   * @returns Resultado da transmissão com protocolo e chave fiscal
   */
  transmit(document: FiscalDocument): Promise<Result<TransmissionResult, string>>;

  /**
   * Solicita autorização de documento na SEFAZ
   * 
   * @param fiscalKey Chave fiscal do documento (44 dígitos)
   * @returns Resultado da autorização com status
   */
  authorize(fiscalKey: string): Promise<Result<AuthorizationResult, string>>;

  /**
   * Solicita cancelamento de documento autorizado
   * 
   * @param fiscalKey Chave fiscal do documento
   * @param reason Motivo do cancelamento (mínimo 15 caracteres - exigência SEFAZ)
   * @returns Resultado do cancelamento
   */
  cancel(fiscalKey: string, reason: string): Promise<Result<CancellationResult, string>>;

  /**
   * Consulta status atual de um documento na SEFAZ
   * 
   * @param fiscalKey Chave fiscal do documento
   * @returns Status atual do documento
   */
  queryStatus(fiscalKey: string): Promise<Result<StatusResult, string>>;
}

