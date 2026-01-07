import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { RomaneioItem } from '@/modules/tms/domain/entities/RomaneioItem';
import { EspecieEmbalagem } from '@/modules/tms/domain/value-objects/EspecieEmbalagem';

describe('RomaneioItem', () => {
  const createValidItemProps = () => ({
    id: 'item-1',
    romaneioId: 'rom-1',
    sequencia: 1,
    marcacaoVolume: 'VOL-001',
    especieEmbalagem: 'CAIXA' as EspecieEmbalagem,
    quantidade: 1,
    pesoLiquido: 10.5,
    pesoBruto: 12.0,
    altura: 0.5,
    largura: 0.4,
    comprimento: 0.6,
    descricaoProduto: 'Produto Teste',
  });

  describe('create', () => {
    it('should calculate cubagem automatically', () => {
      const result = RomaneioItem.create(createValidItemProps());

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // Cubagem = altura * largura * comprimento = 0.5 * 0.4 * 0.6 = 0.12
        expect(result.value.cubagem).toBe(0.12);
      }
    });

    it('should fail without marcacaoVolume', () => {
      const props = createValidItemProps();
      props.marcacaoVolume = '';

      const result = RomaneioItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Marcação de volume is required');
      }
    });

    it('should fail if quantidade <= 0', () => {
      const props = createValidItemProps();
      props.quantidade = 0;

      const result = RomaneioItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Quantidade must be greater than 0');
      }
    });

    it('should fail if pesoLiquido is negative', () => {
      const props = createValidItemProps();
      props.pesoLiquido = -1;

      const result = RomaneioItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Peso líquido cannot be negative');
      }
    });

    it('should fail if pesoBruto is negative', () => {
      const props = createValidItemProps();
      props.pesoBruto = -1;

      const result = RomaneioItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Peso bruto cannot be negative');
      }
    });

    it('should fail if pesoBruto < pesoLiquido', () => {
      const props = createValidItemProps();
      props.pesoLiquido = 20.0;
      props.pesoBruto = 10.0;

      const result = RomaneioItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Peso bruto must be greater than or equal to peso líquido');
      }
    });

    it('should validate especieEmbalagem', () => {
      const props = createValidItemProps();
      props.especieEmbalagem = 'INVALID' as unknown as EspecieEmbalagem;

      const result = RomaneioItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Invalid especie embalagem');
      }
    });

    it('should accept CAIXA as valid especieEmbalagem', () => {
      const props = createValidItemProps();
      props.especieEmbalagem = 'CAIXA' as EspecieEmbalagem;
      const result = RomaneioItem.create(props);
      expect(Result.isOk(result)).toBe(true);
    });

    it('should accept PALLET as valid especieEmbalagem', () => {
      const props = createValidItemProps();
      props.especieEmbalagem = 'PALLET' as EspecieEmbalagem;
      const result = RomaneioItem.create(props);
      expect(Result.isOk(result)).toBe(true);
    });

    it('should accept GRANEL as valid especieEmbalagem', () => {
      const props = createValidItemProps();
      props.especieEmbalagem = 'GRANEL' as EspecieEmbalagem;
      const result = RomaneioItem.create(props);
      expect(Result.isOk(result)).toBe(true);
    });

    it('should fail if descricaoProduto is empty', () => {
      const props = createValidItemProps();
      props.descricaoProduto = '';

      const result = RomaneioItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Descrição do produto is required');
      }
    });

    it('should fail if altura <= 0', () => {
      const props = createValidItemProps();
      props.altura = 0;

      const result = RomaneioItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Altura must be greater than 0');
      }
    });

    it('should fail if largura <= 0', () => {
      const props = createValidItemProps();
      props.largura = 0;

      const result = RomaneioItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Largura must be greater than 0');
      }
    });

    it('should fail if comprimento <= 0', () => {
      const props = createValidItemProps();
      props.comprimento = 0;

      const result = RomaneioItem.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Comprimento must be greater than 0');
      }
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute item from persistence', () => {
      const props = createValidItemProps();
      const propsWithCubagem = {
        ...props,
        cubagem: 0.12,
      };

      const result = RomaneioItem.reconstitute(propsWithCubagem);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe('item-1');
        expect(result.value.cubagem).toBe(0.12);
      }
    });

    it('should fail if id is empty', () => {
      const props = createValidItemProps();
      const propsWithCubagem = {
        ...props,
        id: '',
        cubagem: 0.12,
      };

      const result = RomaneioItem.reconstitute(propsWithCubagem);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('id is required');
      }
    });

    it('should fail if romaneioId is empty', () => {
      const props = createValidItemProps();
      const propsWithCubagem = {
        ...props,
        romaneioId: '',
        cubagem: 0.12,
      };

      const result = RomaneioItem.reconstitute(propsWithCubagem);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('romaneioId is required');
      }
    });

    it('should fail if especieEmbalagem is invalid', () => {
      const props = createValidItemProps();
      const propsWithCubagem = {
        ...props,
        especieEmbalagem: 'INVALID_ESPECIE' as unknown as EspecieEmbalagem,
        cubagem: 0.12,
      };

      const result = RomaneioItem.reconstitute(propsWithCubagem);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Invalid especieEmbalagem');
      }
    });
  });
});

