import { describe, it, expect, beforeEach } from 'vitest';
import { NFSeAdapterFactory } from '@/modules/fiscal/infrastructure/nfse/adapters/NFSeAdapterFactory';
import { NFSeNacional } from '@/modules/fiscal/infrastructure/nfse/adapters/NFSeNacional';

describe('NFSeAdapterFactory', () => {
  beforeEach(() => {
    // Limpar cache antes de cada teste
    NFSeAdapterFactory.clearCache();
  });

  describe('getAdapter', () => {
    it('should return NFSeNacional for any municipality by default', () => {
      const adapter = NFSeAdapterFactory.getAdapter('3550308'); // São Paulo
      expect(adapter).toBeInstanceOf(NFSeNacional);
    });

    it('should return same instance for same municipality (cache)', () => {
      const adapter1 = NFSeAdapterFactory.getAdapter('3550308');
      const adapter2 = NFSeAdapterFactory.getAdapter('3550308');
      expect(adapter1).toBe(adapter2);
    });

    it('should return different instances for different municipalities', () => {
      const adapter1 = NFSeAdapterFactory.getAdapter('3550308'); // São Paulo
      const adapter2 = NFSeAdapterFactory.getAdapter('3304557'); // Rio de Janeiro
      expect(adapter1).not.toBe(adapter2);
    });
  });

  describe('clearCache', () => {
    it('should clear adapter cache', () => {
      const adapter1 = NFSeAdapterFactory.getAdapter('3550308');
      NFSeAdapterFactory.clearCache();
      const adapter2 = NFSeAdapterFactory.getAdapter('3550308');
      expect(adapter1).not.toBe(adapter2);
    });
  });

  describe('hasSpecificAdapter', () => {
    it('should return false for municipalities without specific adapter', () => {
      expect(NFSeAdapterFactory.hasSpecificAdapter('3550308')).toBe(false);
      expect(NFSeAdapterFactory.hasSpecificAdapter('3304557')).toBe(false);
    });
  });

  describe('getSupportedMunicipalities', () => {
    it('should return empty array (only ABRASF 2.04 for now)', () => {
      const municipalities = NFSeAdapterFactory.getSupportedMunicipalities();
      expect(municipalities).toEqual([]);
    });
  });
});

