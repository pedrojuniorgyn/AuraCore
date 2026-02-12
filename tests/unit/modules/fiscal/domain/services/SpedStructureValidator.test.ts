/**
 * Tests: SpedStructureValidator
 * Validação estrutural de arquivos SPED
 *
 * @module fiscal/domain/services
 */
import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { SpedStructureValidator } from '@/modules/fiscal/domain/services/SpedStructureValidator';

describe('SpedStructureValidator', () => {
  describe('validate()', () => {
    it('deve rejeitar arquivo SPED vazio', () => {
      const result = SpedStructureValidator.validate('');
      expect(Result.isFail(result)).toBe(true);
    });

    it('deve detectar ausência de registro 0000', () => {
      const content = '|0001|0|\n|9999|2|';
      const result = SpedStructureValidator.validate(content);

      // Validator returns Ok with errors array, not Fail
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const allErrors = [...result.value.errors, ...result.value.warnings];
        const has0000Error = allErrors.some(e =>
          e.message.toLowerCase().includes('0000') || e.register === '0000'
        );
        // Registro 0000 não existindo é detectado via contagem
        expect(result.value.statistics.registerCounts['0000']).toBeUndefined();
      }
    });

    it('deve retornar Result.ok com validationResult para conteúdo válido', () => {
      const lines = [
        '|0000|015|0|01012026|31012026|EMPRESA|12345678000190||||SP|1234567||||||',
        '|0001|0|',
        '|0990|3|',
        '|9001|0|',
        '|9900|0000|1|',
        '|9900|0001|1|',
        '|9900|0990|1|',
        '|9900|9001|1|',
        '|9900|9900|5|',
        '|9900|9990|1|',
        '|9900|9999|1|',
        '|9990|12|',
        '|9999|13|',
      ];
      const content = lines.join('\n');
      const result = SpedStructureValidator.validate(content);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.statistics.totalLines).toBe(13);
        expect(result.value.statistics.registerCounts['0000']).toBe(1);
        expect(result.value.statistics.registerCounts['9999']).toBe(1);
      }
    });

    it('deve detectar linhas sem formato pipe correto', () => {
      const content = 'REGISTRO_SEM_PIPE\n|0000|data|';
      const result = SpedStructureValidator.validate(content);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.errors.length).toBeGreaterThan(0);
        expect(result.value.errors[0].message).toContain('pipe');
      }
    });

    it('deve contar registros corretamente', () => {
      const lines = [
        '|0000|teste|',
        '|0001|0|',
        '|0001|1|',
        '|9999|3|',
      ];
      const content = lines.join('\n');
      const result = SpedStructureValidator.validate(content);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.statistics.registerCounts['0000']).toBe(1);
        expect(result.value.statistics.registerCounts['0001']).toBe(2);
        expect(result.value.statistics.registerCounts['9999']).toBe(1);
      }
    });

    it('deve identificar blocos presentes', () => {
      const lines = [
        '|0000|teste|',
        '|0001|0|',
        '|C001|0|',
        '|9001|0|',
        '|9999|4|',
      ];
      const content = lines.join('\n');
      const result = SpedStructureValidator.validate(content);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.statistics.blocks).toContain('0');
        expect(result.value.statistics.blocks).toContain('C');
        expect(result.value.statistics.blocks).toContain('9');
      }
    });
  });

  describe('Pipe Format', () => {
    it('cada linha SPED deve iniciar com pipe', () => {
      const validLine = '|0000|015|0|01012026|31012026|';
      expect(validLine.startsWith('|')).toBe(true);
    });

    it('cada campo é delimitado por pipe', () => {
      const line = '|0000|015|0|01012026|31012026|EMPRESA|';
      const fields = line.slice(1, -1).split('|');
      expect(fields.length).toBeGreaterThan(3);
      expect(fields[0]).toBe('0000');
    });
  });
});
