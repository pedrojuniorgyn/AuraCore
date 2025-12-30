import { Result } from '@/shared/domain';
import { NFSeDocument } from '../entities/NFSeDocument';

/**
 * Ambiente de execução
 */
export enum Environment {
  PRODUCTION = 'production',
  HOMOLOGATION = 'homologation',
}

/**
 * Resultado da transmissão
 */
export interface TransmissionResult {
  success: boolean;
  protocol: string;
  numeroNfse?: string;
  codigoVerificacao?: string;
  message?: string;
  errors?: string[];
}

/**
 * Resultado do cancelamento
 */
export interface CancelResult {
  success: boolean;
  protocol: string;
  message?: string;
  errors?: string[];
}

/**
 * Port (Interface): Adapter de NFS-e
 * 
 * Define o contrato para adaptadores de NFS-e que devem:
 * 1. Converter NFSeDocument para XML conforme padrão específico
 * 2. Converter XML de resposta para NFSeDocument
 * 3. Transmitir NFS-e para a prefeitura
 * 4. Cancelar NFS-e autorizada
 * 5. Fornecer URL do web service conforme ambiente
 * 
 * Implementações conhecidas:
 * - NFSeNacional: Padrão ABRASF 2.04 (nacional)
 * - NFSeSaoPaulo: Padrão específico de São Paulo
 * - NFSeRioDeJaneiro: Padrão específico do Rio de Janeiro
 * 
 * Base Legal:
 * - ABRASF 2.04 (Padrão nacional)
 * - Legislação municipal específica
 */
export interface INFSeAdapter {
  /**
   * Converte NFSeDocument para XML conforme padrão do adaptador
   * 
   * @param nfse Documento NFS-e
   * @returns XML formatado ou erro
   */
  toXml(nfse: NFSeDocument): Result<string, string>;

  /**
   * Converte XML de resposta da prefeitura para NFSeDocument
   * 
   * @param xml XML da resposta
   * @returns Documento NFS-e ou erro
   */
  fromXml(xml: string): Result<NFSeDocument, string>;

  /**
   * Transmite NFS-e para a prefeitura
   * 
   * @param nfse Documento NFS-e
   * @param environment Ambiente (produção ou homologação)
   * @returns Resultado da transmissão
   */
  transmit(nfse: NFSeDocument, environment: Environment): Promise<Result<TransmissionResult, string>>;

  /**
   * Cancela NFS-e autorizada
   * 
   * @param nfse Documento NFS-e autorizado
   * @param reason Motivo do cancelamento (mínimo 15 caracteres)
   * @param environment Ambiente (produção ou homologação)
   * @returns Resultado do cancelamento
   */
  cancel(
    nfse: NFSeDocument,
    reason: string,
    environment: Environment
  ): Promise<Result<CancelResult, string>>;

  /**
   * Retorna URL do web service conforme ambiente
   * 
   * @param environment Ambiente (produção ou homologação)
   * @returns URL do web service
   */
  getServiceUrl(environment: Environment): string;

  /**
   * Retorna o nome do padrão implementado pelo adaptador
   * 
   * @returns Nome do padrão (ex: "ABRASF 2.04", "São Paulo", etc.)
   */
  getStandardName(): string;

  /**
   * Retorna versão do padrão implementado
   * 
   * @returns Versão (ex: "2.04", "1.00", etc.)
   */
  getStandardVersion(): string;
}

