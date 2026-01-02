import { StockMovement } from '../entities/StockMovement';
import { MovementType } from '../value-objects/MovementType';

/**
 * IMovementRepository: Port para repositório de movimentações de estoque
 * 
 * E7.8 WMS - Semana 1
 * 
 * Padrão: Repository Pattern com multi-tenancy obrigatório
 */

export interface IMovementRepository {
  /**
   * Busca movimentação por ID
   * 
   * @param id ID da movimentação
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockMovement | null
   */
  findById(id: string, organizationId: number, branchId: number): Promise<StockMovement | null>;

  /**
   * Busca todas as movimentações de um produto
   * 
   * @param productId ID do produto
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockMovement[]
   */
  findByProduct(productId: string, organizationId: number, branchId: number): Promise<StockMovement[]>;

  /**
   * Busca todas as movimentações de uma localização (origem ou destino)
   * 
   * @param locationId ID da localização
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockMovement[]
   */
  findByLocation(locationId: string, organizationId: number, branchId: number): Promise<StockMovement[]>;

  /**
   * Busca movimentações por intervalo de datas
   * 
   * @param startDate Data inicial
   * @param endDate Data final
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockMovement[]
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    organizationId: number,
    branchId: number
  ): Promise<StockMovement[]>;

  /**
   * Busca movimentações por tipo
   * 
   * @param type Tipo de movimentação
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockMovement[]
   */
  findByType(type: MovementType, organizationId: number, branchId: number): Promise<StockMovement[]>;

  /**
   * Busca movimentações por referência (ex: documento fiscal, pedido)
   * 
   * @param referenceType Tipo de referência
   * @param referenceId ID da referência
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockMovement[]
   */
  findByReference(
    referenceType: string,
    referenceId: string,
    organizationId: number,
    branchId: number
  ): Promise<StockMovement[]>;

  /**
   * Busca movimentações de entrada de um produto
   * 
   * @param productId ID do produto
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockMovement[]
   */
  findEntriesByProduct(productId: string, organizationId: number, branchId: number): Promise<StockMovement[]>;

  /**
   * Busca movimentações de saída de um produto
   * 
   * @param productId ID do produto
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockMovement[]
   */
  findExitsByProduct(productId: string, organizationId: number, branchId: number): Promise<StockMovement[]>;

  /**
   * Busca movimentações de um usuário
   * 
   * @param userId ID do usuário
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockMovement[]
   */
  findByUser(userId: string, organizationId: number, branchId: number): Promise<StockMovement[]>;

  /**
   * Verifica se uma movimentação existe
   * 
   * @param id ID da movimentação
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns boolean
   */
  exists(id: string, organizationId: number, branchId: number): Promise<boolean>;

  /**
   * Lista movimentações com paginação e filtros
   * E7.8 WMS Semana 3
   */
  findMany(
    organizationId: number,
    branchId: number,
    filters: {
      productId?: string;
      locationId?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: { page: number; limit: number }
  ): Promise<StockMovement[]>;

  /**
   * Conta movimentações com filtros
   * E7.8 WMS Semana 3
   */
  count(
    organizationId: number,
    branchId: number,
    filters: {
      productId?: string;
      locationId?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<number>;

  /**
   * Salva uma movimentação (insert apenas - movimentações não são alteradas)
   * 
   * @param movement Movimentação a salvar
   * @returns void
   */
  save(movement: StockMovement): Promise<void>;
}

