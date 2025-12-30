import { describe, it, expect } from 'vitest';
import { Money } from '@/shared/domain/value-objects/Money';
import { moneyToWords } from '@/modules/financial/domain/value-objects/receipt/MoneyInWords';

describe('MoneyInWords', () => {
  it('should convert simple values correctly', () => {
    const money1 = Money.create(1, 'BRL').value;
    expect(moneyToWords(money1)).toBe('um real');

    const money2 = Money.create(2, 'BRL').value;
    expect(moneyToWords(money2)).toBe('dois reais');

    const money100 = Money.create(100, 'BRL').value;
    expect(moneyToWords(money100)).toBe('cem reais');
  });

  it('should convert values with centavos correctly', () => {
    const money = Money.create(1.50, 'BRL').value;
    const result = moneyToWords(money);
    
    expect(result).toContain('um real');
    expect(result).toContain('cinquenta centavos');
  });

  it('should convert large values correctly', () => {
    const money = Money.create(1234.56, 'BRL').value;
    const result = moneyToWords(money);
    
    expect(result).toContain('mil');
    expect(result).toContain('duzentos');
    expect(result).toContain('trinta');
    expect(result).toContain('quatro reais');
    expect(result).toContain('cinquenta');
    expect(result).toContain('seis centavos');
  });

  it('should convert zero correctly', () => {
    const money = Money.create(0, 'BRL').value;
    expect(moneyToWords(money)).toBe('zero reais');
  });

  it('should convert only centavos correctly', () => {
    const money = Money.create(0.50, 'BRL').value;
    expect(moneyToWords(money)).toBe('cinquenta centavos');
  });

  it('should convert teens correctly', () => {
    const money11 = Money.create(11, 'BRL').value;
    expect(moneyToWords(money11)).toBe('onze reais');

    const money15 = Money.create(15, 'BRL').value;
    expect(moneyToWords(money15)).toBe('quinze reais');

    const money19 = Money.create(19, 'BRL').value;
    expect(moneyToWords(money19)).toBe('dezenove reais');
  });

  it('should convert hundreds correctly', () => {
    const money200 = Money.create(200, 'BRL').value;
    expect(moneyToWords(money200)).toBe('duzentos reais');

    const money500 = Money.create(500, 'BRL').value;
    expect(moneyToWords(money500)).toBe('quinhentos reais');
  });

  it('should convert thousands correctly', () => {
    const money = Money.create(1000, 'BRL').value;
    expect(moneyToWords(money)).toContain('mil reais');

    const money5000 = Money.create(5000, 'BRL').value;
    expect(moneyToWords(money5000)).toContain('cinco mil');
  });
});

