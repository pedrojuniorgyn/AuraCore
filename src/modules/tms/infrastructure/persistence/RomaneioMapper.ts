import { Result } from '@/shared/domain';
import { RomaneioDocument, RomaneioDocumentProps } from '../../domain/entities/RomaneioDocument';
import { RomaneioItem, RomaneioItemProps } from '../../domain/entities/RomaneioItem';
import { RomaneioStatus } from '../../domain/value-objects/RomaneioStatus';
import { EspecieEmbalagem } from '../../domain/value-objects/EspecieEmbalagem';

/**
 * Persistence Interface: Romaneio
 * 
 * DEVE espelhar Schema Drizzle COMPLETO (INFRA-008)
 */
export interface RomaneioPersistence {
  id: string;
  organizationId: number;
  branchId: number;
  
  numero: string;
  dataEmissao: Date;
  
  remetenteId: string;
  destinatarioId: string;
  transportadorId: string | null;
  
  tripId: string | null;
  deliveryId: string | null;
  
  cteNumbers: string;  // JSON string
  nfeNumbers: string;  // JSON string
  
  totalVolumes: number;
  pesoLiquidoTotal: string;  // decimal as string
  pesoBrutoTotal: string;    // decimal as string
  cubagemTotal: string;      // decimal as string
  
  status: string;
  
  conferidoPor: string | null;
  dataConferencia: Date | null;
  observacoesConferencia: string | null;
  
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  deletedAt: Date | null;
}

/**
 * Persistence Interface: Romaneio Item
 * 
 * DEVE espelhar Schema Drizzle COMPLETO (INFRA-008)
 */
export interface RomaneioItemPersistence {
  id: string;
  romaneioId: string;
  
  sequencia: number;
  marcacaoVolume: string;
  especieEmbalagem: string;
  quantidade: number;
  
  pesoLiquido: string;   // decimal as string
  pesoBruto: string;     // decimal as string
  
  altura: string;        // decimal as string
  largura: string;       // decimal as string
  comprimento: string;   // decimal as string
  cubagem: string;       // decimal as string
  
  descricaoProduto: string;
  codigoProduto: string | null;
  observacoes: string | null;
}

/**
 * Mapper: RomaneioDocument ↔ Persistence
 * 
 * REGRAS OBRIGATÓRIAS (infrastructure-layer.json):
 * - toPersistence mapeia TODOS os campos (INFRA-009)
 * - toDomain usa reconstitute(), não create() (INFRA-006)
 * - Arrays JSON serializados corretamente
 * - Decimals como strings na persistence
 */
export class RomaneioMapper {
  /**
   * Domain → Persistence
   * DEVE mapear TODOS os campos (INFRA-009)
   */
  static toPersistence(romaneio: RomaneioDocument): RomaneioPersistence {
    return {
      id: romaneio.id,
      organizationId: romaneio.organizationId,
      branchId: romaneio.branchId,
      
      numero: romaneio.numero,
      dataEmissao: romaneio.dataEmissao,
      
      remetenteId: romaneio.remetenteId,
      destinatarioId: romaneio.destinatarioId,
      transportadorId: romaneio.transportadorId || null,
      
      tripId: romaneio.tripId || null,
      deliveryId: romaneio.deliveryId || null,
      
      cteNumbers: JSON.stringify(romaneio.cteNumbers),
      nfeNumbers: JSON.stringify(romaneio.nfeNumbers),
      
      totalVolumes: romaneio.totalVolumes,
      pesoLiquidoTotal: romaneio.pesoLiquidoTotal.toFixed(3),
      pesoBrutoTotal: romaneio.pesoBrutoTotal.toFixed(3),
      cubagemTotal: romaneio.cubagemTotal.toFixed(6),
      
      status: romaneio.status,
      
      conferidoPor: romaneio.conferidoPor || null,
      dataConferencia: romaneio.dataConferencia || null,
      observacoesConferencia: romaneio.observacoesConferencia || null,
      
      createdAt: romaneio.createdAt,
      createdBy: romaneio.createdBy,
      updatedAt: romaneio.updatedAt,
      updatedBy: romaneio.updatedBy,
      deletedAt: null,
    };
  }

  /**
   * Persistence → Domain
   * DEVE usar reconstitute() (INFRA-006)
   */
  static toDomain(
    persistence: RomaneioPersistence,
    items: RomaneioItem[]
  ): Result<RomaneioDocument, string> {
    try {
      // Parse JSON arrays
      const cteNumbers = JSON.parse(persistence.cteNumbers) as string[];
      const nfeNumbers = JSON.parse(persistence.nfeNumbers) as string[];

      // Reconstituir props
      const props: RomaneioDocumentProps = {
        id: persistence.id,
        organizationId: persistence.organizationId,
        branchId: persistence.branchId,
        
        numero: persistence.numero,
        dataEmissao: persistence.dataEmissao,
        
        remetenteId: persistence.remetenteId,
        destinatarioId: persistence.destinatarioId,
        transportadorId: persistence.transportadorId || undefined,
        
        tripId: persistence.tripId || undefined,
        deliveryId: persistence.deliveryId || undefined,
        
        cteNumbers,
        nfeNumbers,
        
        totalVolumes: persistence.totalVolumes,
        pesoLiquidoTotal: parseFloat(persistence.pesoLiquidoTotal),
        pesoBrutoTotal: parseFloat(persistence.pesoBrutoTotal),
        cubagemTotal: parseFloat(persistence.cubagemTotal),
        
        status: persistence.status as RomaneioStatus,
        
        items,
        
        conferidoPor: persistence.conferidoPor || undefined,
        dataConferencia: persistence.dataConferencia || undefined,
        observacoesConferencia: persistence.observacoesConferencia || undefined,
        
        createdAt: persistence.createdAt,
        createdBy: persistence.createdBy,
        updatedAt: persistence.updatedAt,
        updatedBy: persistence.updatedBy,
      };

      // Usar reconstitute, NÃO create (INFRA-006)
      return RomaneioDocument.reconstitute(
        props,
        persistence.createdAt,
        persistence.updatedAt
      );
    } catch (error) {
      return Result.fail(`Failed to map romaneio from persistence: ${(error as Error).message}`);
    }
  }

  /**
   * Item Domain → Persistence
   */
  static itemToPersistence(item: RomaneioItem): RomaneioItemPersistence {
    return {
      id: item.id,
      romaneioId: item.romaneioId,
      
      sequencia: item.sequencia,
      marcacaoVolume: item.marcacaoVolume,
      especieEmbalagem: item.especieEmbalagem,
      quantidade: item.quantidade,
      
      pesoLiquido: item.pesoLiquido.toFixed(3),
      pesoBruto: item.pesoBruto.toFixed(3),
      
      altura: item.altura.toFixed(3),
      largura: item.largura.toFixed(3),
      comprimento: item.comprimento.toFixed(3),
      cubagem: item.cubagem.toFixed(6),
      
      descricaoProduto: item.descricaoProduto,
      codigoProduto: item.codigoProduto || null,
      observacoes: item.observacoes || null,
    };
  }

  /**
   * Item Persistence → Domain
   * DEVE usar reconstitute() (INFRA-006)
   */
  static itemToDomain(persistence: RomaneioItemPersistence): Result<RomaneioItem, string> {
    try {
      const props: RomaneioItemProps = {
        id: persistence.id,
        romaneioId: persistence.romaneioId,
        
        sequencia: persistence.sequencia,
        marcacaoVolume: persistence.marcacaoVolume,
        especieEmbalagem: persistence.especieEmbalagem as EspecieEmbalagem,
        quantidade: persistence.quantidade,
        
        pesoLiquido: parseFloat(persistence.pesoLiquido),
        pesoBruto: parseFloat(persistence.pesoBruto),
        
        altura: parseFloat(persistence.altura),
        largura: parseFloat(persistence.largura),
        comprimento: parseFloat(persistence.comprimento),
        cubagem: parseFloat(persistence.cubagem),
        
        descricaoProduto: persistence.descricaoProduto,
        codigoProduto: persistence.codigoProduto || undefined,
        observacoes: persistence.observacoes || undefined,
      };

      // Usar reconstitute, NÃO create (INFRA-006)
      return RomaneioItem.reconstitute(props);
    } catch (error) {
      return Result.fail(`Failed to map romaneio item from persistence: ${(error as Error).message}`);
    }
  }
}

