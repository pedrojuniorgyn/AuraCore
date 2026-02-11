import { Result } from '@/shared/domain';
import { RomaneioDocument } from '../../entities/RomaneioDocument';
import { RomaneioStatus } from '../../value-objects/RomaneioStatus';

/**
 * Filtros para busca de romaneios
 * 
 * IMPORTANTE (ENFORCE-003, ENFORCE-004):
 * - branchId é OBRIGATÓRIO (nunca opcional)
 * - Todos os métodos DEVEM filtrar por organizationId + branchId
 */
export interface FindRomaneiosFilters {
  organizationId: number;
  branchId: number; // OBRIGATÓRIO (ENFORCE-004)
  
  status?: RomaneioStatus;
  remetenteId?: string;
  destinatarioId?: string;
  transportadorId?: string;
  tripId?: string;
  deliveryId?: string;
  dataEmissaoInicio?: Date;
  dataEmissaoFim?: Date;
  
  // Paginação
  limit?: number;
  offset?: number;
}

/**
 * Port (Interface): Repositório de Romaneios
 * 
 * Define o contrato para persistência de RomaneioDocument.
 * 
 * REGRAS CRÍTICAS (infrastructure-layer.json):
 * - TODOS os métodos DEVEM filtrar por organizationId + branchId (INFRA-004)
 * - branchId NUNCA é opcional (ENFORCE-004)
 * - Soft delete com deletedAt (filtrar IS NULL)
 * - UPDATE persiste TODOS os campos mutáveis (INFRA-005)
 */
export interface IRomaneioRepository {
  /**
   * Busca romaneio por ID
   * 
   * @param id ID do romaneio
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @returns Romaneio ou null se não encontrado
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<RomaneioDocument | null, string>>;

  /**
   * Busca romaneio por número
   * 
   * @param numero Número do romaneio
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @returns Romaneio ou null se não encontrado
   */
  findByNumero(
    numero: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<RomaneioDocument | null, string>>;

  /**
   * Busca romaneios com filtros
   * 
   * @param filters Filtros de busca (branchId obrigatório)
   * @returns Lista de romaneios
   */
  findMany(filters: FindRomaneiosFilters): Promise<Result<RomaneioDocument[], string>>;

  /**
   * Busca romaneios de uma viagem
   * 
   * @param tripId ID da viagem
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @returns Lista de romaneios
   */
  findByTrip(
    tripId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<RomaneioDocument[], string>>;

  /**
   * Busca romaneios de uma entrega
   * 
   * @param deliveryId ID da entrega
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @returns Lista de romaneios
   */
  findByDelivery(
    deliveryId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<RomaneioDocument[], string>>;

  /**
   * Verifica se número de romaneio já existe
   * 
   * @param numero Número do romaneio
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @param excludeId ID para excluir da verificação (usado em updates)
   * @returns true se existe, false caso contrário
   */
  exists(
    numero: string,
    organizationId: number,
    branchId: number,
    excludeId?: string
  ): Promise<Result<boolean, string>>;

  /**
   * Salva romaneio (INSERT ou UPDATE)
   * 
   * INSERT: Persiste TODOS os campos
   * UPDATE: Atualiza TODOS os campos mutáveis (INFRA-005)
   * 
   * @param romaneio Romaneio a salvar
   * @returns Romaneio salvo
   */
  save(romaneio: RomaneioDocument): Promise<Result<RomaneioDocument, string>>;

  /**
   * Deleta romaneio (soft delete)
   * 
   * @param id ID do romaneio
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @returns void
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>>;

  /**
   * Conta romaneios com filtros
   * 
   * @param filters Filtros de busca (branchId obrigatório)
   * @returns Total de romaneios
   */
  count(filters: FindRomaneiosFilters): Promise<Result<number, string>>;
}

