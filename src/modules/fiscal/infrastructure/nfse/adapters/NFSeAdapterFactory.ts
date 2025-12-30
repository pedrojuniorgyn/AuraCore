import { INFSeAdapter } from '../../../domain/nfse/ports/INFSeAdapter';
import { NFSeNacional } from './NFSeNacional';

/**
 * Factory: Cria adaptadores de NFS-e conforme município
 * 
 * Responsável por retornar o adaptador correto baseado no código do município.
 * 
 * Padrões suportados:
 * - ABRASF 2.04 (Nacional) - Padrão default
 * - Padrões específicos podem ser adicionados futuramente
 * 
 * Estrutura para expansão:
 * - São Paulo: código 3550308
 * - Rio de Janeiro: código 3304557
 * - Belo Horizonte: código 3106200
 * - etc.
 */
export class NFSeAdapterFactory {
  private static readonly adapters = new Map<string, INFSeAdapter>();

  /**
   * Retorna adaptador conforme código do município
   * 
   * @param municipioCode Código IBGE do município (7 dígitos)
   * @returns Adaptador de NFS-e apropriado
   */
  static getAdapter(municipioCode: string): INFSeAdapter {
    // Verificar se já existe instância em cache
    if (this.adapters.has(municipioCode)) {
      return this.adapters.get(municipioCode)!;
    }

    // Criar adaptador conforme município
    const adapter = this.createAdapter(municipioCode);
    
    // Cachear para reutilização
    this.adapters.set(municipioCode, adapter);
    
    return adapter;
  }

  /**
   * Cria adaptador conforme município
   */
  private static createAdapter(municipioCode: string): INFSeAdapter {
    // Mapeamento de municípios com padrões específicos
    // Por enquanto, todos usam ABRASF 2.04
    
    // Futuros padrões específicos:
    // case '3550308': // São Paulo
    //   return new NFSeSaoPaulo();
    // case '3304557': // Rio de Janeiro
    //   return new NFSeRioDeJaneiro();
    
    // Padrão default: ABRASF 2.04 (Nacional)
    return new NFSeNacional();
  }

  /**
   * Limpa cache de adaptadores
   * Útil para testes
   */
  static clearCache(): void {
    this.adapters.clear();
  }

  /**
   * Retorna lista de municípios com suporte específico
   */
  static getSupportedMunicipalities(): string[] {
    // Por enquanto, apenas ABRASF 2.04 (universal)
    // Futuramente, retornar lista de códigos com adaptadores específicos
    return [];
  }

  /**
   * Verifica se município tem adaptador específico
   */
  static hasSpecificAdapter(municipioCode: string): boolean {
    return this.getSupportedMunicipalities().includes(municipioCode);
  }
}

