/**
 * DANFe Domain Services
 *
 * Serviços de domínio para parsing e validação de DANFe.
 *
 * @module fiscal/domain/services/danfe
 * @see E-Agent-Fase-D2
 */

export { DANFeParser } from './DANFeParser';
export { DANFeValidator, type DANFeValidationResult } from './DANFeValidator';
export {
  DANFeFieldExtractor,
  type DANFeEmitente,
  type DANFeDestinatario,
  type DANFeTotais,
} from './DANFeFieldExtractor';
