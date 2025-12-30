import { Result } from '@/shared/domain';
import { 
  INFSeAdapter, 
  Environment, 
  TransmissionResult, 
  CancelResult 
} from '../../../domain/nfse/ports/INFSeAdapter';
import { NFSeDocument } from '../../../domain/nfse/entities/NFSeDocument';
import { NFSeXmlBuilder } from '../xml/NFSeXmlBuilder';

/**
 * Adapter: NFS-e Nacional (ABRASF 2.04)
 * 
 * ⚠️ MOCK ADAPTER para desenvolvimento e testes
 * 
 * IMPORTANTE: Este adapter simula comportamento da API ABRASF 2.04
 * para permitir desenvolvimento sem integração real com prefeituras.
 * Os métodos transmit() e cancel() retornam resultados simulados.
 * 
 * Para PRODUÇÃO, implementar adapters específicos por município
 * que herdem de INFSeAdapter e façam chamadas HTTP/SOAP reais:
 * - Cliente com certificado digital A1/A3
 * - Retry logic com backoff exponencial
 * - Logging completo de requisições/respostas
 * - Tratamento de erros específicos por município
 * 
 * Funcionalidades implementadas:
 * - Geração de XML conforme ABRASF 2.04 ✅
 * - Validação de campos obrigatórios ✅
 * - Transmissão (MOCK) ⚠️
 * - Cancelamento (MOCK) ⚠️
 * 
 * @see NFSeAdapterFactory para registro de adapters por município
 * 
 * Base Legal:
 * - ABRASF 2.04 (Padrão técnico)
 * - LC 116/2003 (Lista de serviços)
 * - Legislação municipal específica
 */
export class NFSeNacional implements INFSeAdapter {
  private readonly standardName = 'ABRASF';
  private readonly standardVersion = '2.04';

  /**
   * URLs dos web services por ambiente
   * Nota: URLs podem variar por município. Esta é a estrutura padrão.
   */
  private readonly serviceUrls = {
    [Environment.PRODUCTION]: 'https://nfse.abrasf.org.br/producao/GerarNfse',
    [Environment.HOMOLOGATION]: 'https://nfse.abrasf.org.br/homologacao/GerarNfse',
  };

  /**
   * Converte NFSeDocument para XML ABRASF 2.04
   */
  toXml(nfse: NFSeDocument): Result<string, string> {
    try {
      // Validar campos obrigatórios
      const validation = NFSeXmlBuilder.validate(nfse);
      if (!validation.valid) {
        return Result.fail(`Validation errors: ${validation.errors.join(', ')}`);
      }

      // Gerar XML
      const xml = NFSeXmlBuilder.buildRps(nfse);
      
      return Result.ok(xml);
    } catch (error) {
      return Result.fail(`Failed to generate XML: ${(error as Error).message}`);
    }
  }

  /**
   * Converte XML de resposta para NFSeDocument
   * 
   * Nota: Implementação simplificada. Em produção, usar parser XML robusto.
   */
  fromXml(xml: string): Result<NFSeDocument, string> {
    try {
      // TODO: Implementar parser XML completo
      // Por enquanto, retorna erro indicando necessidade de implementação
      return Result.fail('XML parsing not yet implemented. Use existing NFSeDocument.');
    } catch (error) {
      return Result.fail(`Failed to parse XML: ${(error as Error).message}`);
    }
  }

  /**
   * Transmite NFS-e para a prefeitura
   * 
   * Nota: Implementação simplificada para mock/testes.
   * Em produção, implementar:
   * - Cliente SOAP/REST conforme município
   * - Certificado digital A1/A3
   * - Retry logic com backoff exponencial
   * - Logging completo de requisições/respostas
   */
  async transmit(
    nfse: NFSeDocument, 
    environment: Environment
  ): Promise<Result<TransmissionResult, string>> {
    try {
      // Validar que documento está PENDING
      if (!nfse.isPending) {
        return Result.fail('Document must be in PENDING status to transmit');
      }

      // Gerar XML
      const xmlResult = this.toXml(nfse);
      if (Result.isFail(xmlResult)) {
        return Result.fail(xmlResult.error);
      }

      const xml = xmlResult.value;
      const url = this.getServiceUrl(environment);

      // Simulação de transmissão (mock)
      // TODO: Implementar cliente HTTP/SOAP real
      const mockSuccess = Math.random() > 0.1; // 90% sucesso

      if (mockSuccess) {
        const numeroNfse = `${Date.now()}`;
        const codigoVerificacao = this.generateVerificationCode();

        return Result.ok({
          success: true,
          protocol: `PROT-${Date.now()}`,
          numeroNfse,
          codigoVerificacao,
          message: 'NFS-e autorizada com sucesso',
        });
      } else {
        return Result.ok({
          success: false,
          protocol: `PROT-${Date.now()}`,
          message: 'Erro na validação',
          errors: ['Inscrição municipal inválida', 'Código de serviço não encontrado'],
        });
      }
    } catch (error) {
      return Result.fail(`Transmission failed: ${(error as Error).message}`);
    }
  }

  /**
   * Cancela NFS-e autorizada
   * 
   * Nota: Implementação simplificada para mock/testes.
   * Em produção, implementar cliente SOAP/REST conforme município.
   */
  async cancel(
    nfse: NFSeDocument, 
    reason: string, 
    environment: Environment
  ): Promise<Result<CancelResult, string>> {
    try {
      // Validar que documento está AUTHORIZED
      if (!nfse.isAuthorized) {
        return Result.fail('Only authorized documents can be cancelled');
      }

      // Validar motivo
      if (!reason || reason.trim().length < 15) {
        return Result.fail('Cancellation reason must have at least 15 characters');
      }

      // Gerar XML de cancelamento
      const xml = NFSeXmlBuilder.buildCancelamento(nfse, reason);
      const url = this.getServiceUrl(environment);

      // Simulação de cancelamento (mock)
      // TODO: Implementar cliente HTTP/SOAP real
      const mockSuccess = Math.random() > 0.05; // 95% sucesso

      if (mockSuccess) {
        return Result.ok({
          success: true,
          protocol: `CANCEL-${Date.now()}`,
          message: 'NFS-e cancelada com sucesso',
        });
      } else {
        return Result.ok({
          success: false,
          protocol: `CANCEL-${Date.now()}`,
          message: 'Erro no cancelamento',
          errors: ['Prazo de cancelamento expirado'],
        });
      }
    } catch (error) {
      return Result.fail(`Cancellation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Retorna URL do web service
   */
  getServiceUrl(environment: Environment): string {
    return this.serviceUrls[environment];
  }

  /**
   * Retorna nome do padrão
   */
  getStandardName(): string {
    return this.standardName;
  }

  /**
   * Retorna versão do padrão
   */
  getStandardVersion(): string {
    return this.standardVersion;
  }

  /**
   * Gera código de verificação (mock)
   */
  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 9; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

