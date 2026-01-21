/**
 * AuraCore SDK Client Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuraCore,
  AuthenticationError,
  ValidationError,
  NetworkError,
} from '../src';

describe('AuraCore', () => {
  describe('constructor', () => {
    it('should throw error when API key is missing', () => {
      expect(() => new AuraCore({ apiKey: '' })).toThrow(
        'API key is required'
      );
    });

    it('should create client with valid API key', () => {
      const client = new AuraCore({
        apiKey: 'ac_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });
      expect(client).toBeInstanceOf(AuraCore);
      expect(client.agents).toBeDefined();
      expect(client.voice).toBeDefined();
      expect(client.rag).toBeDefined();
      expect(client.documents).toBeDefined();
      expect(client.analytics).toBeDefined();
    });

    it('should warn about invalid API key format', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      new AuraCore({ apiKey: 'invalid-key' });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('API key format may be invalid')
      );
      warnSpy.mockRestore();
    });

    it('should accept custom configuration', () => {
      const client = new AuraCore({
        apiKey: 'ac_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        baseUrl: 'https://custom.api.com',
        timeout: 60000,
        headers: { 'X-Custom': 'value' },
        retry: { maxRetries: 5 },
      });
      expect(client).toBeInstanceOf(AuraCore);
    });
  });

  describe('agents resource', () => {
    let client: AuraCore;

    beforeEach(() => {
      client = new AuraCore({
        apiKey: 'ac_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });
    });

    it('should have list method', () => {
      expect(client.agents.list).toBeDefined();
      expect(typeof client.agents.list).toBe('function');
    });

    it('should have get method', () => {
      expect(client.agents.get).toBeDefined();
      expect(typeof client.agents.get).toBe('function');
    });

    it('should have chat method', () => {
      expect(client.agents.chat).toBeDefined();
      expect(typeof client.agents.chat).toBe('function');
    });

    it('should have chatStream method', () => {
      expect(client.agents.chatStream).toBeDefined();
      expect(typeof client.agents.chatStream).toBe('function');
    });
  });

  describe('voice resource', () => {
    let client: AuraCore;

    beforeEach(() => {
      client = new AuraCore({
        apiKey: 'ac_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });
    });

    it('should have transcribe method', () => {
      expect(client.voice.transcribe).toBeDefined();
    });

    it('should have synthesize method', () => {
      expect(client.voice.synthesize).toBeDefined();
    });
  });

  describe('rag resource', () => {
    let client: AuraCore;

    beforeEach(() => {
      client = new AuraCore({
        apiKey: 'ac_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });
    });

    it('should have query method', () => {
      expect(client.rag.query).toBeDefined();
    });

    it('should have listCollections method', () => {
      expect(client.rag.listCollections).toBeDefined();
    });
  });

  describe('documents resource', () => {
    let client: AuraCore;

    beforeEach(() => {
      client = new AuraCore({
        apiKey: 'ac_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });
    });

    it('should have upload method', () => {
      expect(client.documents.upload).toBeDefined();
    });

    it('should have process method', () => {
      expect(client.documents.process).toBeDefined();
    });

    it('should have get method', () => {
      expect(client.documents.get).toBeDefined();
    });

    it('should have delete method', () => {
      expect(client.documents.delete).toBeDefined();
    });

    it('should have list method', () => {
      expect(client.documents.list).toBeDefined();
    });
  });

  describe('analytics resource', () => {
    let client: AuraCore;

    beforeEach(() => {
      client = new AuraCore({
        apiKey: 'ac_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });
    });

    it('should have usage method', () => {
      expect(client.analytics.usage).toBeDefined();
    });

    it('should have topAgents method', () => {
      expect(client.analytics.topAgents).toBeDefined();
    });

    it('should have topTools method', () => {
      expect(client.analytics.topTools).toBeDefined();
    });

    it('should have costEstimate method', () => {
      expect(client.analytics.costEstimate).toBeDefined();
    });
  });

  describe('error classes', () => {
    it('should export AuthenticationError', () => {
      const error = new AuthenticationError('Invalid key');
      expect(error.status).toBe(401);
      expect(error.code).toBe('authentication_error');
    });

    it('should export ValidationError', () => {
      const error = new ValidationError('Invalid input');
      expect(error.status).toBe(422);
      expect(error.code).toBe('validation_error');
    });

    it('should export NetworkError', () => {
      const error = new NetworkError('Connection failed');
      expect(error.status).toBe(0);
      expect(error.code).toBe('network_error');
    });
  });
});
