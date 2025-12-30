import { Result } from '@/shared/domain';

/**
 * Value Object: Espécie de Embalagem
 * 
 * Representa os tipos de embalagem utilizados no transporte de mercadorias.
 * Conforme padrão Receita Federal para Romaneio de Carga.
 * 
 * Referência: Manual de Preenchimento do Romaneio de Carga (Receita Federal)
 */
export type EspecieEmbalagem =
  | 'CAIXA'       // Caixa de papelão, madeira ou plástico
  | 'PALLET'      // Pallet (estrado)
  | 'FARDO'       // Fardo (mercadorias enfardadas)
  | 'SACO'        // Saco (ráfia, papel, etc.)
  | 'TAMBOR'      // Tambor metálico ou plástico
  | 'CONTAINER'   // Container marítimo
  | 'GRANEL'      // Mercadoria a granel (sem embalagem)
  | 'AVULSO'      // Peças avulsas
  | 'OUTROS';     // Outros tipos não listados

/**
 * Lista de todas as espécies de embalagem válidas
 */
export const ESPECIES_EMBALAGEM: readonly EspecieEmbalagem[] = [
  'CAIXA',
  'PALLET',
  'FARDO',
  'SACO',
  'TAMBOR',
  'CONTAINER',
  'GRANEL',
  'AVULSO',
  'OUTROS',
] as const;

/**
 * Descrições das espécies de embalagem
 */
export const ESPECIES_EMBALAGEM_DESCRICAO: Record<EspecieEmbalagem, string> = {
  CAIXA: 'Caixa (papelão, madeira ou plástico)',
  PALLET: 'Pallet (estrado)',
  FARDO: 'Fardo',
  SACO: 'Saco (ráfia, papel, etc.)',
  TAMBOR: 'Tambor (metálico ou plástico)',
  CONTAINER: 'Container marítimo',
  GRANEL: 'Granel (sem embalagem)',
  AVULSO: 'Avulso (peças soltas)',
  OUTROS: 'Outros',
};

/**
 * Verifica se um valor é uma espécie de embalagem válida
 */
export function isValidEspecieEmbalagem(especie: string): especie is EspecieEmbalagem {
  return ESPECIES_EMBALAGEM.includes(especie as EspecieEmbalagem);
}

/**
 * Cria um Value Object de espécie de embalagem
 */
export function createEspecieEmbalagem(especie: string): Result<EspecieEmbalagem, string> {
  if (!isValidEspecieEmbalagem(especie)) {
    return Result.fail(
      `Invalid especie embalagem: ${especie}. Must be one of: ${ESPECIES_EMBALAGEM.join(', ')}`
    );
  }
  
  return Result.ok(especie);
}

/**
 * Obtém a descrição de uma espécie de embalagem
 */
export function getEspecieEmbalagemDescricao(especie: EspecieEmbalagem): string {
  return ESPECIES_EMBALAGEM_DESCRICAO[especie];
}

