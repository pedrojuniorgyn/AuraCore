import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { RomaneioDocument } from '@/modules/tms/domain/entities/RomaneioDocument';
import { RomaneioItem } from '@/modules/tms/domain/entities/RomaneioItem';
import {
  RomaneioMapper,
  RomaneioPersistence,
  RomaneioItemPersistence,
} from '@/modules/tms/infrastructure/persistence/RomaneioMapper';

describe('RomaneioMapper', () => {
  const createValidRomaneio = () => {
    const result = RomaneioDocument.create({
      id: 'rom-123',
      organizationId: 1,
      branchId: 1,
      numero: 'ROM-001',
      dataEmissao: new Date(2025, 0, 15),
      remetenteId: 'remetente-1',
      destinatarioId: 'destinatario-1',
      transportadorId: 'transportador-1',
      tripId: 'trip-1',
      deliveryId: 'delivery-1',
      cteNumbers: ['CTE-001', 'CTE-002'],
      nfeNumbers: ['NFE-001'],
      createdBy: 'user-1',
      updatedBy: 'user-1',
    });

    if (Result.isFail(result)) {
      throw new Error('Failed to create romaneio');
    }

    const itemResult = RomaneioItem.create({
      id: 'item-1',
      romaneioId: 'rom-123',
      sequencia: 1,
      marcacaoVolume: 'VOL-001',
      especieEmbalagem: 'CAIXA',
      quantidade: 2,
      pesoLiquido: 10.5,
      pesoBruto: 12.0,
      altura: 0.5,
      largura: 0.4,
      comprimento: 0.6,
      descricaoProduto: 'Produto Teste',
      codigoProduto: 'PROD-001',
      observacoes: 'Item de teste',
    });

    if (Result.isFail(itemResult)) {
      throw new Error('Failed to create item');
    }

    result.value.addItem(itemResult.value);
    return result.value;
  };

  describe('toPersistence', () => {
    it('should map all fields', () => {
      const romaneio = createValidRomaneio();
      const persistence = RomaneioMapper.toPersistence(romaneio);

      expect(persistence.id).toBe('rom-123');
      expect(persistence.organizationId).toBe(1);
      expect(persistence.branchId).toBe(1);
      expect(persistence.numero).toBe('ROM-001');
      expect(persistence.remetenteId).toBe('remetente-1');
      expect(persistence.destinatarioId).toBe('destinatario-1');
      expect(persistence.transportadorId).toBe('transportador-1');
      expect(persistence.tripId).toBe('trip-1');
      expect(persistence.deliveryId).toBe('delivery-1');
      expect(persistence.status).toBe('DRAFT');
      expect(persistence.createdBy).toBe('user-1');
      expect(persistence.updatedBy).toBe('user-1');
    });

    it('should serialize arrays as JSON', () => {
      const romaneio = createValidRomaneio();
      const persistence = RomaneioMapper.toPersistence(romaneio);

      expect(persistence.cteNumbers).toBe('["CTE-001","CTE-002"]');
      expect(persistence.nfeNumbers).toBe('["NFE-001"]');
    });

    it('should format decimals correctly', () => {
      const romaneio = createValidRomaneio();
      const persistence = RomaneioMapper.toPersistence(romaneio);

      // Pesos com 3 decimais
      expect(persistence.pesoLiquidoTotal).toMatch(/^\d+\.\d{3}$/);
      expect(persistence.pesoBrutoTotal).toMatch(/^\d+\.\d{3}$/);
      
      // Cubagem com 6 decimais
      expect(persistence.cubagemTotal).toMatch(/^\d+\.\d{6}$/);
    });

    it('should handle null optional fields', () => {
      const result = RomaneioDocument.create({
        id: 'rom-456',
        organizationId: 1,
        branchId: 1,
        numero: 'ROM-002',
        dataEmissao: new Date(2025, 0, 15),
        remetenteId: 'remetente-1',
        destinatarioId: 'destinatario-1',
        cteNumbers: [],
        nfeNumbers: [],
        createdBy: 'user-1',
        updatedBy: 'user-1',
      });

      if (Result.isFail(result)) {
        throw new Error('Failed to create romaneio');
      }

      const persistence = RomaneioMapper.toPersistence(result.value);

      expect(persistence.transportadorId).toBeNull();
      expect(persistence.tripId).toBeNull();
      expect(persistence.deliveryId).toBeNull();
      expect(persistence.conferidoPor).toBeNull();
      expect(persistence.dataConferencia).toBeNull();
      expect(persistence.observacoesConferencia).toBeNull();
    });
  });

  describe('toDomain', () => {
    it('should reconstituteРомaneio correctly', () => {
      const persistence: RomaneioPersistence = {
        id: 'rom-123',
        organizationId: 1,
        branchId: 1,
        numero: 'ROM-001',
        dataEmissao: new Date(2025, 0, 15),
        remetenteId: 'remetente-1',
        destinatarioId: 'destinatario-1',
        transportadorId: 'transportador-1',
        tripId: 'trip-1',
        deliveryId: 'delivery-1',
        cteNumbers: '["CTE-001","CTE-002"]',
        nfeNumbers: '["NFE-001"]',
        totalVolumes: 2,
        pesoLiquidoTotal: '21.000',
        pesoBrutoTotal: '24.000',
        cubagemTotal: '0.240000',
        status: 'DRAFT',
        conferidoPor: null,
        dataConferencia: null,
        observacoesConferencia: null,
        createdAt: new Date(2025, 0, 15),
        createdBy: 'user-1',
        updatedAt: new Date(2025, 0, 15),
        updatedBy: 'user-1',
        deletedAt: null,
      };

      const result = RomaneioMapper.toDomain(persistence, []);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const romaneio = result.value;
        expect(romaneio.id).toBe('rom-123');
        expect(romaneio.numero).toBe('ROM-001');
        expect(romaneio.cteNumbers).toEqual(['CTE-001', 'CTE-002']);
        expect(romaneio.nfeNumbers).toEqual(['NFE-001']);
        expect(romaneio.totalVolumes).toBe(2);
        expect(romaneio.pesoLiquidoTotal).toBe(21.0);
        expect(romaneio.pesoBrutoTotal).toBe(24.0);
        expect(romaneio.cubagemTotal).toBe(0.24);
      }
    });

    it('should reconstitute with items', () => {
      const persistence: RomaneioPersistence = {
        id: 'rom-123',
        organizationId: 1,
        branchId: 1,
        numero: 'ROM-001',
        dataEmissao: new Date(2025, 0, 15),
        remetenteId: 'remetente-1',
        destinatarioId: 'destinatario-1',
        transportadorId: null,
        tripId: null,
        deliveryId: null,
        cteNumbers: '[]',
        nfeNumbers: '[]',
        totalVolumes: 1,
        pesoLiquidoTotal: '10.500',
        pesoBrutoTotal: '12.000',
        cubagemTotal: '0.120000',
        status: 'DRAFT',
        conferidoPor: null,
        dataConferencia: null,
        observacoesConferencia: null,
        createdAt: new Date(2025, 0, 15),
        createdBy: 'user-1',
        updatedAt: new Date(2025, 0, 15),
        updatedBy: 'user-1',
        deletedAt: null,
      };

      const itemPersistence: RomaneioItemPersistence = {
        id: 'item-1',
        romaneioId: 'rom-123',
        sequencia: 1,
        marcacaoVolume: 'VOL-001',
        especieEmbalagem: 'CAIXA',
        quantidade: 1,
        pesoLiquido: '10.500',
        pesoBruto: '12.000',
        altura: '0.500',
        largura: '0.400',
        comprimento: '0.600',
        cubagem: '0.120000',
        descricaoProduto: 'Produto Teste',
        codigoProduto: null,
        observacoes: null,
      };

      const itemResult = RomaneioMapper.itemToDomain(itemPersistence);
      expect(Result.isOk(itemResult)).toBe(true);

      if (Result.isOk(itemResult)) {
        const result = RomaneioMapper.toDomain(persistence, [itemResult.value]);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          const romaneio = result.value;
          expect(romaneio.items.length).toBe(1);
          expect(romaneio.items[0].id).toBe('item-1');
        }
      }
    });
  });

  describe('itemToPersistence', () => {
    it('should map all item fields', () => {
      const itemResult = RomaneioItem.create({
        id: 'item-1',
        romaneioId: 'rom-123',
        sequencia: 1,
        marcacaoVolume: 'VOL-001',
        especieEmbalagem: 'CAIXA',
        quantidade: 2,
        pesoLiquido: 10.5,
        pesoBruto: 12.0,
        altura: 0.5,
        largura: 0.4,
        comprimento: 0.6,
        descricaoProduto: 'Produto Teste',
        codigoProduto: 'PROD-001',
        observacoes: 'Teste',
      });

      if (Result.isFail(itemResult)) {
        throw new Error('Failed to create item');
      }

      const persistence = RomaneioMapper.itemToPersistence(itemResult.value);

      expect(persistence.id).toBe('item-1');
      expect(persistence.romaneioId).toBe('rom-123');
      expect(persistence.sequencia).toBe(1);
      expect(persistence.marcacaoVolume).toBe('VOL-001');
      expect(persistence.especieEmbalagem).toBe('CAIXA');
      expect(persistence.quantidade).toBe(2);
      expect(persistence.descricaoProduto).toBe('Produto Teste');
      expect(persistence.codigoProduto).toBe('PROD-001');
      expect(persistence.observacoes).toBe('Teste');
    });

    it('should format item decimals correctly', () => {
      const itemResult = RomaneioItem.create({
        id: 'item-1',
        romaneioId: 'rom-123',
        sequencia: 1,
        marcacaoVolume: 'VOL-001',
        especieEmbalagem: 'CAIXA',
        quantidade: 1,
        pesoLiquido: 10.5,
        pesoBruto: 12.0,
        altura: 0.5,
        largura: 0.4,
        comprimento: 0.6,
        descricaoProduto: 'Produto Teste',
      });

      if (Result.isFail(itemResult)) {
        throw new Error('Failed to create item');
      }

      const persistence = RomaneioMapper.itemToPersistence(itemResult.value);

      // Pesos e dimensões com 3 decimais
      expect(persistence.pesoLiquido).toMatch(/^\d+\.\d{3}$/);
      expect(persistence.pesoBruto).toMatch(/^\d+\.\d{3}$/);
      expect(persistence.altura).toMatch(/^\d+\.\d{3}$/);
      expect(persistence.largura).toMatch(/^\d+\.\d{3}$/);
      expect(persistence.comprimento).toMatch(/^\d+\.\d{3}$/);
      
      // Cubagem com 6 decimais
      expect(persistence.cubagem).toMatch(/^\d+\.\d{6}$/);
    });
  });

  describe('itemToDomain', () => {
    it('should reconstitute item correctly', () => {
      const persistence: RomaneioItemPersistence = {
        id: 'item-1',
        romaneioId: 'rom-123',
        sequencia: 1,
        marcacaoVolume: 'VOL-001',
        especieEmbalagem: 'CAIXA',
        quantidade: 2,
        pesoLiquido: '10.500',
        pesoBruto: '12.000',
        altura: '0.500',
        largura: '0.400',
        comprimento: '0.600',
        cubagem: '0.120000',
        descricaoProduto: 'Produto Teste',
        codigoProduto: 'PROD-001',
        observacoes: 'Observação teste',
      };

      const result = RomaneioMapper.itemToDomain(persistence);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const item = result.value;
        expect(item.id).toBe('item-1');
        expect(item.sequencia).toBe(1);
        expect(item.quantidade).toBe(2);
        expect(item.pesoLiquido).toBe(10.5);
        expect(item.pesoBruto).toBe(12.0);
        expect(item.altura).toBe(0.5);
        expect(item.largura).toBe(0.4);
        expect(item.comprimento).toBe(0.6);
        expect(item.cubagem).toBe(0.12);
        expect(item.codigoProduto).toBe('PROD-001');
        expect(item.observacoes).toBe('Observação teste');
      }
    });

    it('should handle null optional fields', () => {
      const persistence: RomaneioItemPersistence = {
        id: 'item-1',
        romaneioId: 'rom-123',
        sequencia: 1,
        marcacaoVolume: 'VOL-001',
        especieEmbalagem: 'CAIXA',
        quantidade: 1,
        pesoLiquido: '10.500',
        pesoBruto: '12.000',
        altura: '0.500',
        largura: '0.400',
        comprimento: '0.600',
        cubagem: '0.120000',
        descricaoProduto: 'Produto Teste',
        codigoProduto: null,
        observacoes: null,
      };

      const result = RomaneioMapper.itemToDomain(persistence);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const item = result.value;
        expect(item.codigoProduto).toBeUndefined();
        expect(item.observacoes).toBeUndefined();
      }
    });
  });
});

