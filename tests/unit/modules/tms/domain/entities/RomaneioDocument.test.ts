import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { RomaneioDocument } from '@/modules/tms/domain/entities/RomaneioDocument';
import { RomaneioItem } from '@/modules/tms/domain/entities/RomaneioItem';

describe('RomaneioDocument', () => {
  const createValidRomaneio = () => {
    const result = RomaneioDocument.create({
      id: 'rom-123',
      organizationId: 1,
      branchId: 1,
      numero: 'ROM-001',
      dataEmissao: new Date(2025, 0, 15),
      remetenteId: 'remetente-1',
      destinatarioId: 'destinatario-1',
      cteNumbers: [],
      nfeNumbers: [],
      createdBy: 'user-1',
      updatedBy: 'user-1',
    });

    if (Result.isFail(result)) {
      throw new Error('Failed to create valid romaneio');
    }

    return result.value;
  };

  const createValidItem = (sequencia: number = 1) => {
    const result = RomaneioItem.create({
      id: `item-${sequencia}`,
      romaneioId: 'rom-123',
      sequencia,
      marcacaoVolume: `VOL-${sequencia.toString().padStart(3, '0')}`,
      especieEmbalagem: 'CAIXA',
      quantidade: 1,
      pesoLiquido: 10.5,
      pesoBruto: 12.0,
      altura: 0.5,
      largura: 0.4,
      comprimento: 0.6,
      descricaoProduto: 'Produto Teste',
    });

    if (Result.isFail(result)) {
      throw new Error('Failed to create valid item');
    }

    return result.value;
  };

  describe('create', () => {
    it('should create romaneio with status DRAFT', () => {
      const romaneio = createValidRomaneio();

      expect(romaneio.status).toBe('DRAFT');
      expect(romaneio.numero).toBe('ROM-001');
      expect(romaneio.items).toEqual([]);
      expect(romaneio.totalVolumes).toBe(0);
    });

    it('should fail without remetenteId', () => {
      const result = RomaneioDocument.create({
        id: 'rom-123',
        organizationId: 1,
        branchId: 1,
        numero: 'ROM-001',
        dataEmissao: new Date(),
        remetenteId: '',
        destinatarioId: 'destinatario-1',
        cteNumbers: [],
        nfeNumbers: [],
        createdBy: 'user-1',
        updatedBy: 'user-1',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Remetente ID is required');
      }
    });

    it('should fail without destinatarioId', () => {
      const result = RomaneioDocument.create({
        id: 'rom-123',
        organizationId: 1,
        branchId: 1,
        numero: 'ROM-001',
        dataEmissao: new Date(),
        remetenteId: 'remetente-1',
        destinatarioId: '',
        cteNumbers: [],
        nfeNumbers: [],
        createdBy: 'user-1',
        updatedBy: 'user-1',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Destinatário ID is required');
      }
    });
  });

  describe('addItem', () => {
    it('should add item and recalculate totals', () => {
      const romaneio = createValidRomaneio();
      const item = createValidItem();

      const result = romaneio.addItem(item);

      expect(Result.isOk(result)).toBe(true);
      expect(romaneio.items.length).toBe(1);
      expect(romaneio.totalVolumes).toBe(1);
      expect(romaneio.pesoLiquidoTotal).toBe(10.5);
      expect(romaneio.pesoBrutoTotal).toBe(12.0);
      expect(romaneio.cubagemTotal).toBe(0.12); // 0.5 * 0.4 * 0.6
    });

    it('should increment sequencia automatically when adding multiple items', () => {
      const romaneio = createValidRomaneio();
      const item1 = createValidItem(1);
      const item2 = createValidItem(2);

      romaneio.addItem(item1);
      romaneio.addItem(item2);

      expect(romaneio.items.length).toBe(2);
      expect(romaneio.items[0].sequencia).toBe(1);
      expect(romaneio.items[1].sequencia).toBe(2);
    });

    it('should fail if status is not DRAFT', () => {
      const romaneio = createValidRomaneio();
      const item = createValidItem();
      
      romaneio.addItem(item);
      romaneio.emit();

      const result = romaneio.addItem(createValidItem(2));

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('not in DRAFT status');
      }
    });
  });

  describe('removeItem', () => {
    it('should remove item and recalculate totals', () => {
      const romaneio = createValidRomaneio();
      const item1 = createValidItem(1);
      const item2 = createValidItem(2);

      romaneio.addItem(item1);
      romaneio.addItem(item2);

      const result = romaneio.removeItem('item-1');

      expect(Result.isOk(result)).toBe(true);
      expect(romaneio.items.length).toBe(1);
      expect(romaneio.items[0].id).toBe('item-2');
    });

    it('should fail if item not found', () => {
      const romaneio = createValidRomaneio();

      const result = romaneio.removeItem('item-999');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('not found');
      }
    });

    it('should fail if status is not DRAFT', () => {
      const romaneio = createValidRomaneio();
      const item = createValidItem();
      
      romaneio.addItem(item);
      romaneio.emit();

      const result = romaneio.removeItem('item-1');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('not in DRAFT status');
      }
    });
  });

  describe('emit', () => {
    it('should change status to EMITTED', () => {
      const romaneio = createValidRomaneio();
      const item = createValidItem();
      
      romaneio.addItem(item);
      const result = romaneio.emit();

      expect(Result.isOk(result)).toBe(true);
      expect(romaneio.status).toBe('EMITTED');
    });

    it('should fail if items is empty', () => {
      const romaneio = createValidRomaneio();

      const result = romaneio.emit();

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('without items');
      }
    });

    it('should fail if status is not DRAFT', () => {
      const romaneio = createValidRomaneio();
      const item = createValidItem();
      
      romaneio.addItem(item);
      romaneio.emit();

      const result = romaneio.emit();

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Cannot emit');
      }
    });
  });

  describe('registerConference', () => {
    it('should change status to DELIVERED', () => {
      const romaneio = createValidRomaneio();
      const item = createValidItem();
      
      romaneio.addItem(item);
      romaneio.emit();

      const result = romaneio.registerConference({
        conferidoPor: 'user-2',
        observacoes: 'Conferido e aprovado',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(romaneio.status).toBe('DELIVERED');
      expect(romaneio.conferidoPor).toBe('user-2');
      expect(romaneio.dataConferencia).toBeInstanceOf(Date);
      expect(romaneio.observacoesConferencia).toBe('Conferido e aprovado');
    });

    it('should fail if status is not EMITTED', () => {
      const romaneio = createValidRomaneio();

      const result = romaneio.registerConference({
        conferidoPor: 'user-2',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Cannot register conference');
      }
    });

    it('should fail without conferidoPor', () => {
      const romaneio = createValidRomaneio();
      const item = createValidItem();
      
      romaneio.addItem(item);
      romaneio.emit();

      const result = romaneio.registerConference({
        conferidoPor: '',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Conferido por is required');
      }
    });
  });

  describe('cancel', () => {
    it('should cancel from DRAFT', () => {
      const romaneio = createValidRomaneio();

      const result = romaneio.cancel();

      expect(Result.isOk(result)).toBe(true);
      expect(romaneio.status).toBe('CANCELLED');
    });

    it('should cancel from EMITTED', () => {
      const romaneio = createValidRomaneio();
      const item = createValidItem();
      
      romaneio.addItem(item);
      romaneio.emit();

      const result = romaneio.cancel();

      expect(Result.isOk(result)).toBe(true);
      expect(romaneio.status).toBe('CANCELLED');
    });

    it('should fail from DELIVERED', () => {
      const romaneio = createValidRomaneio();
      const item = createValidItem();
      
      romaneio.addItem(item);
      romaneio.emit();
      romaneio.registerConference({ conferidoPor: 'user-2' });

      const result = romaneio.cancel();

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Cannot cancel');
      }
    });
  });

  describe('calculateTotals', () => {
    it('should sum correctly with multiple items', () => {
      const romaneio = createValidRomaneio();
      
      // Item 1: 2 volumes
      const item1Result = RomaneioItem.create({
        id: 'item-1',
        romaneioId: 'rom-123',
        sequencia: 1,
        marcacaoVolume: 'VOL-001',
        especieEmbalagem: 'CAIXA',
        quantidade: 2,
        pesoLiquido: 10.0,
        pesoBruto: 12.0,
        altura: 0.5,
        largura: 0.4,
        comprimento: 0.6,
        descricaoProduto: 'Produto 1',
      });

      // Item 2: 3 volumes
      const item2Result = RomaneioItem.create({
        id: 'item-2',
        romaneioId: 'rom-123',
        sequencia: 2,
        marcacaoVolume: 'VOL-002',
        especieEmbalagem: 'PALLET',
        quantidade: 3,
        pesoLiquido: 20.0,
        pesoBruto: 25.0,
        altura: 1.0,
        largura: 0.8,
        comprimento: 1.2,
        descricaoProduto: 'Produto 2',
      });

      if (Result.isFail(item1Result) || Result.isFail(item2Result)) {
        throw new Error('Failed to create items');
      }

      romaneio.addItem(item1Result.value);
      romaneio.addItem(item2Result.value);

      // Totals: 2 + 3 = 5 volumes
      expect(romaneio.totalVolumes).toBe(5);
      
      // Peso líquido: (10 * 2) + (20 * 3) = 20 + 60 = 80
      expect(romaneio.pesoLiquidoTotal).toBe(80);
      
      // Peso bruto: (12 * 2) + (25 * 3) = 24 + 75 = 99
      expect(romaneio.pesoBrutoTotal).toBe(99);
      
      // Cubagem: (0.12 * 2) + (0.96 * 3) = 0.24 + 2.88 = 3.12
      expect(romaneio.cubagemTotal).toBeCloseTo(3.12, 2);
    });
  });
});

