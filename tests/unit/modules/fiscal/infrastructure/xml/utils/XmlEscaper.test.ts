import { describe, it, expect } from 'vitest';
import { XmlEscaper } from '@/modules/fiscal/infrastructure/xml/utils/XmlEscaper';

describe('XmlEscaper', () => {
  describe('escape()', () => {
    it('should escape ampersand', () => {
      expect(XmlEscaper.escape('Empresa & Cia')).toBe('Empresa &amp; Cia');
    });

    it('should escape less than and greater than', () => {
      expect(XmlEscaper.escape('Valor <1000>')).toBe('Valor &lt;1000&gt;');
    });

    it('should escape quotes', () => {
      expect(XmlEscaper.escape('Produto "Premium"')).toBe('Produto &quot;Premium&quot;');
    });

    it('should escape apostrophe', () => {
      expect(XmlEscaper.escape("O'Reilly")).toBe("O&apos;Reilly");
    });

    it('should escape multiple special characters', () => {
      const input = 'A & B <> "C" \'D\'';
      const expected = 'A &amp; B &lt;&gt; &quot;C&quot; &apos;D&apos;';
      expect(XmlEscaper.escape(input)).toBe(expected);
    });

    it('should return same string if no special characters', () => {
      expect(XmlEscaper.escape('Normal text')).toBe('Normal text');
    });

    it('should handle empty string', () => {
      expect(XmlEscaper.escape('')).toBe('');
    });
  });

  describe('unescape()', () => {
    it('should unescape ampersand', () => {
      expect(XmlEscaper.unescape('Empresa &amp; Cia')).toBe('Empresa & Cia');
    });

    it('should unescape less than and greater than', () => {
      expect(XmlEscaper.unescape('Valor &lt;1000&gt;')).toBe('Valor <1000>');
    });

    it('should unescape quotes', () => {
      expect(XmlEscaper.unescape('Produto &quot;Premium&quot;')).toBe('Produto "Premium"');
    });

    it('should unescape apostrophe', () => {
      expect(XmlEscaper.unescape("O&apos;Reilly")).toBe("O'Reilly");
    });

    it('should unescape multiple special characters', () => {
      const input = 'A &amp; B &lt;&gt; &quot;C&quot; &apos;D&apos;';
      const expected = 'A & B <> "C" \'D\'';
      expect(XmlEscaper.unescape(input)).toBe(expected);
    });

    it('should return same string if no escaped characters', () => {
      expect(XmlEscaper.unescape('Normal text')).toBe('Normal text');
    });

    it('should handle empty string', () => {
      expect(XmlEscaper.unescape('')).toBe('');
    });
  });

  describe('roundtrip', () => {
    it('should escape and unescape returning original', () => {
      const original = 'A & B <> "C" \'D\'';
      const escaped = XmlEscaper.escape(original);
      const unescaped = XmlEscaper.unescape(escaped);
      expect(unescaped).toBe(original);
    });
  });

  describe('needsEscape()', () => {
    it('should return true for string with ampersand', () => {
      expect(XmlEscaper.needsEscape('A & B')).toBe(true);
    });

    it('should return true for string with angle brackets', () => {
      expect(XmlEscaper.needsEscape('<tag>')).toBe(true);
    });

    it('should return true for string with quotes', () => {
      expect(XmlEscaper.needsEscape('"text"')).toBe(true);
    });

    it('should return false for normal text', () => {
      expect(XmlEscaper.needsEscape('Normal text')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(XmlEscaper.needsEscape('')).toBe(false);
    });
  });
});

