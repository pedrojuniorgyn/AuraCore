/**
 * Testes Unitários - ClaudeAnswerGenerator
 *
 * @module tests/unit/modules/fiscal/infrastructure/rag
 * @see E-Agent-Fase-D4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { ClaudeAnswerGenerator } from '@/modules/fiscal/infrastructure/rag/ClaudeAnswerGenerator';
import { mockChunks } from '../../domain/services/rag/fixtures/rag-mock';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClaudeAnswerGenerator', () => {
  let generator: ClaudeAnswerGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    generator = new ClaudeAnswerGenerator();
  });

  // ==========================================================================
  // GENERATE
  // ==========================================================================

  describe('generate', () => {
    it('should generate answer successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg-123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'A alíquota é 12%.\n\nCITATIONS_JSON:\n[{"source": "Lei 87/96, Art. 13", "excerpt": "12%", "relevance": 0.9}]',
            },
          ],
          model: 'claude-sonnet-4-20250514',
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      const result = await generator.generate('Qual a alíquota?', mockChunks);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.answer).toContain('12%');
        expect(result.value.citations.length).toBeGreaterThan(0);
      }
    });

    it('should fail if API key is not set', async () => {
      process.env.ANTHROPIC_API_KEY = '';
      const generatorNoKey = new ClaudeAnswerGenerator();

      const result = await generatorNoKey.generate('Test?', mockChunks);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('ANTHROPIC_API_KEY');
      }
    });

    it('should fail if query is empty', async () => {
      const result = await generator.generate('', mockChunks);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('vazia');
      }
    });

    it('should fail if context is empty', async () => {
      const result = await generator.generate('Test?', []);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('vazio');
      }
    });

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const result = await generator.generate('Test?', mockChunks);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('429');
      }
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await generator.generate('Test?', mockChunks);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Network error');
      }
    });

    it('should parse response without citations block', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg-123',
          content: [{ type: 'text', text: 'A resposta é simples.' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      const result = await generator.generate('Test?', mockChunks);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.answer).toBe('A resposta é simples.');
        // Should generate automatic citations from context
        expect(result.value.citations.length).toBeGreaterThan(0);
      }
    });

    it('should respect maxTokens option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg-123',
          content: [{ type: 'text', text: 'Resposta.' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      await generator.generate('Test?', mockChunks, { maxTokens: 1024 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"max_tokens":1024'),
        })
      );
    });

    it('should respect temperature option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg-123',
          content: [{ type: 'text', text: 'Resposta.' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      await generator.generate('Test?', mockChunks, { temperature: 0.5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"temperature":0.5'),
        })
      );
    });
  });

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  describe('healthCheck', () => {
    it('should return true when API key is set', async () => {
      const result = await generator.healthCheck();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    it('should fail if API key is not set', async () => {
      process.env.ANTHROPIC_API_KEY = '';
      const generatorNoKey = new ClaudeAnswerGenerator();

      const result = await generatorNoKey.healthCheck();

      expect(Result.isFail(result)).toBe(true);
    });
  });
});
