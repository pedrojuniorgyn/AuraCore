import { StockItem } from '../entities/StockItem';
import { StockQuantity } from '../value-objects/StockQuantity';

/**
 * IStockRepository: Port para repositório de estoque
 * 
 * E7.8 WMS - Semana 1
 * 
 * Padrão: Repository Pattern com multi-tenancy obrigatório
 */

export interface IStockRepository {
  /**
   * Busca item de estoque por ID
   * 
   * @param id ID do item de estoque
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockItem | null
   */
  findById(id: string, organizationId: number, branchId: number): Promise<StockItem | null>;

  /**
   * Busca item de estoque por produto e localização
   * 
   * @param productId ID do produto
   * @param locationId ID da localização
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockItem | null
   */
  findByProductAndLocation(
    productId: string,
    locationId: string,
    organizationId: number,
    branchId: number
  ): Promise<StockItem | null>;

  /**
   * Busca todos os itens de estoque de um produto
   * 
   * @param productId ID do produto
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockItem[]
   */
  findByProduct(productId: string, organizationId: number, branchId: number): Promise<StockItem[]>;

  /**
   * Busca todos os itens de estoque de uma localização
   * 
   * @param locationId ID da localização
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockItem[]
   */
  findByLocation(locationId: string, organizationId: number, branchId: number): Promise<StockItem[]>;

  /**
   * Busca itens de estoque com quantidade disponível (> 0)
   * 
   * @param productId ID do produto
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockItem[]
   */
  findAvailableByProduct(productId: string, organizationId: number, branchId: number): Promise<StockItem[]>;

  /**
   * Obtém a quantidade total disponível de um produto (somando todas as localizações)
   * 
   * @param productId ID do produto
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockQuantity
   */
  getAvailableQuantity(productId: string, organizationId: number, branchId: number): Promise<StockQuantity>;

  /**
   * Obtém a quantidade total em estoque de um produto (somando todas as localizações)
   * 
   * @param productId ID do produto
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockQuantity
   */
  getTotalQuantity(productId: string, organizationId: number, branchId: number): Promise<StockQuantity>;

  /**
   * Busca itens de estoque próximos do vencimento
   * 
   * @param days Dias até o vencimento
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockItem[]
   */
  findNearExpiration(days: number, organizationId: number, branchId: number): Promise<StockItem[]>;

  /**
   * Busca itens de estoque vencidos
   * 
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns StockItem[]
   */
  findExpired(organizationId: number, branchId: number): Promise<StockItem[]>;

  /**
   * Verifica se um item de estoque existe
   * 
   * @param id ID do item de estoque
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns boolean
   */
  exists(id: string, organizationId: number, branchId: number): Promise<boolean>;

  /**
   * Lista itens de estoque com paginação e filtros
   * E7.8 WMS Semana 3
   */
  findMany(
    organizationId: number,
    branchId: number,
    filters: {
      productId?: string;
      locationId?: string;
      warehouseId?: string;
      minQuantity?: number;
      hasStock?: boolean;
      lotNumber?: string;
      expired?: boolean;
    },
    pagination: { page: number; limit: number }
  ): Promise<StockItem[]>;

  /**
   * Conta itens de estoque com filtros
   * E7.8 WMS Semana 3
   */
  count(
    organizationId: number,
    branchId: number,
    filters: {
      productId?: string;
      locationId?: string;
      warehouseId?: string;
      minQuantity?: number;
      hasStock?: boolean;
      lotNumber?: string;
      expired?: boolean;
    }
  ): Promise<number>;

  /**
   * Salva um item de estoque (insert ou update)
   * 
   * @param stockItem Item de estoque a salvar
   * @returns void
   */
  save(stockItem: StockItem): Promise<void>;

  /**
   * Deleta um item de estoque (soft delete)
   * 
   * @param id ID do item de estoque
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns void
   */
  delete(id: string, organizationId: number, branchId: number): Promise<void>;
}

