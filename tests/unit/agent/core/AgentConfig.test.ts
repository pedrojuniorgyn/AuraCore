/**
 * @description Testes para AgentConfig
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createDefaultConfig,
  DEFAULT_WORKSPACE_SCOPES,
} from '@/agent/core/AgentConfig';

describe('AgentConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('DEFAULT_WORKSPACE_SCOPES', () => {
    it('deve incluir scopes do Gmail', () => {
      expect(DEFAULT_WORKSPACE_SCOPES).toContain(
        'https://www.googleapis.com/auth/gmail.readonly'
      );
      expect(DEFAULT_WORKSPACE_SCOPES).toContain(
        'https://www.googleapis.com/auth/gmail.send'
      );
    });

    it('deve incluir scopes do Drive', () => {
      expect(DEFAULT_WORKSPACE_SCOPES).toContain(
        'https://www.googleapis.com/auth/drive.readonly'
      );
    });

    it('deve incluir scopes do Calendar', () => {
      expect(DEFAULT_WORKSPACE_SCOPES).toContain(
        'https://www.googleapis.com/auth/calendar.events'
      );
    });

    it('deve incluir scopes do Sheets', () => {
      expect(DEFAULT_WORKSPACE_SCOPES).toContain(
        'https://www.googleapis.com/auth/spreadsheets'
      );
    });
  });

  describe('createDefaultConfig', () => {
    it('deve criar configuração com valores padrão', () => {
      const config = createDefaultConfig();

      expect(config.gemini.model).toBe('gemini-3-pro');
      expect(config.gemini.fastModel).toBe('gemini-2.5-flash');
      expect(config.gemini.location).toBe('us-central1');
      expect(config.gemini.maxOutputTokens).toBe(8192);
      expect(config.gemini.temperature).toBe(0.7);
    });

    it('deve usar variáveis de ambiente quando disponíveis', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      process.env.GEMINI_MODEL = 'gemini-custom';
      process.env.VERTEX_AI_LOCATION = 'us-east1';

      const config = createDefaultConfig();

      expect(config.gemini.projectId).toBe('test-project');
      expect(config.gemini.model).toBe('gemini-custom');
      expect(config.gemini.location).toBe('us-east1');
    });

    it('deve incluir configuração de Document AI', () => {
      process.env.DOCUMENT_AI_PROCESSOR_ID = 'processor-123';
      process.env.DOCUMENT_AI_LOCATION = 'eu';

      const config = createDefaultConfig();

      expect(config.documentAI.invoiceProcessorId).toBe('processor-123');
      expect(config.documentAI.location).toBe('eu');
    });

    it('deve incluir configuração de Speech', () => {
      const config = createDefaultConfig();

      expect(config.speech?.sttModel).toBe('chirp_2');
      expect(config.speech?.ttsModel).toBe('chirp_3_hd');
      expect(config.speech?.languageCode).toBe('pt-BR');
    });

    it('deve incluir scopes padrão do Workspace', () => {
      const config = createDefaultConfig();

      expect(config.workspace.scopes).toEqual(
        expect.arrayContaining([...DEFAULT_WORKSPACE_SCOPES])
      );
    });
  });
});
