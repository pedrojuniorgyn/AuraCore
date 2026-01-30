import { describe, it, expect } from 'vitest';
import { TaxRegime, TaxRegimeType } from '@/modules/fiscal/domain/tax/value-objects/TaxRegime';
import { Result } from '@/shared/domain';
import { expectOk, expectFail } from '../../../../../../helpers/resultHelper';

describe('TaxRegime', () => {
  describe('create', () => {
    it('should create CURRENT regime', () => {
      const result = TaxRegime.create(TaxRegimeType.CURRENT);

      expect(Result.isOk(result)).toBe(true);
      const regime = result.value as TaxRegime;
      expect(regime.type).toBe(TaxRegimeType.CURRENT);
      expect(regime.isCurrent).toBe(true);
      expect(regime.isTransition).toBe(false);
      expect(regime.isNew).toBe(false);
    });

    it('should create TRANSITION regime', () => {
      const result = TaxRegime.create(TaxRegimeType.TRANSITION);

      expect(Result.isOk(result)).toBe(true);
      const regime = result.value as TaxRegime;
      expect(regime.type).toBe(TaxRegimeType.TRANSITION);
      expect(regime.isCurrent).toBe(false);
      expect(regime.isTransition).toBe(true);
      expect(regime.isNew).toBe(false);
    });

    it('should create NEW regime', () => {
      const result = TaxRegime.create(TaxRegimeType.NEW);

      expect(Result.isOk(result)).toBe(true);
      const regime = result.value as TaxRegime;
      expect(regime.type).toBe(TaxRegimeType.NEW);
      expect(regime.isCurrent).toBe(false);
      expect(regime.isTransition).toBe(false);
      expect(regime.isNew).toBe(true);
    });

    it('should fail with invalid regime type', () => {
      const result = TaxRegime.create('INVALID' as TaxRegimeType);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Invalid tax regime type');
    });
  });

  describe('fromDate', () => {
    it('should return CURRENT for dates before 2026', () => {
      const result = TaxRegime.fromDate(new Date('2025-12-31'));

      expect(Result.isOk(result)).toBe(true);
      const regime = result.value as TaxRegime;
      expect(regime.type).toBe(TaxRegimeType.CURRENT);
    });

    it('should return TRANSITION for dates between 2026-2032', () => {
      const result1 = TaxRegime.fromDate(new Date('2026-01-01'));
      const result2 = TaxRegime.fromDate(new Date('2030-06-15'));
      const result3 = TaxRegime.fromDate(new Date('2032-12-31'));

      expect(Result.isOk(result1)).toBe(true);
      expect((result1.value as TaxRegime).type).toBe(TaxRegimeType.TRANSITION);

      expect(Result.isOk(result2)).toBe(true);
      expect((result2.value as TaxRegime).type).toBe(TaxRegimeType.TRANSITION);

      expect(Result.isOk(result3)).toBe(true);
      expect((result3.value as TaxRegime).type).toBe(TaxRegimeType.TRANSITION);
    });

    it('should return NEW for dates from 2033 onwards', () => {
      const result = TaxRegime.fromDate(new Date('2033-01-01'));

      expect(Result.isOk(result)).toBe(true);
      const regime = result.value as TaxRegime;
      expect(regime.type).toBe(TaxRegimeType.NEW);
    });
  });

  describe('static factories', () => {
    it('should create current regime via static method', () => {
      const regime = expectOk(TaxRegime.current());
      expect(regime.isCurrent).toBe(true);
    });

    it('should create transition regime via static method', () => {
      const regime = expectOk(TaxRegime.transition());
      expect(regime.isTransition).toBe(true);
    });

    it('should create new regime via static method', () => {
      const regime = expectOk(TaxRegime.new());
      expect(regime.isNew).toBe(true);
    });
  });

  describe('description', () => {
    it('should return correct description for each regime', () => {
      const current = expectOk(TaxRegime.current());
      const transition = expectOk(TaxRegime.transition());
      const newRegime = expectOk(TaxRegime.new());

      expect(current.description).toContain('Sistema Atual');
      expect(transition.description).toContain('Transição');
      expect(newRegime.description).toContain('Sistema Novo');
    });
  });

  describe('equals', () => {
    it('should return true for same regime type', () => {
      const regime1 = expectOk(TaxRegime.current());
      const regime2 = expectOk(TaxRegime.current());

      expect(regime1.equals(regime2)).toBe(true);
    });

    it('should return false for different regime types', () => {
      const current = expectOk(TaxRegime.current());
      const transition = expectOk(TaxRegime.transition());

      expect(current.equals(transition)).toBe(false);
    });
  });
});

