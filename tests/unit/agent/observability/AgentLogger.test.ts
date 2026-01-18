/**
 * @description Testes para AgentLogger
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentLogger } from '@/agent/observability/AgentLogger';

describe('AgentLogger', () => {
  let logger: AgentLogger;

  beforeEach(() => {
    // Criar logger com console desabilitado para não poluir output dos testes
    logger = new AgentLogger({ enableConsole: false });
  });

  describe('constructor', () => {
    it('deve criar logger com configuração padrão', () => {
      const defaultLogger = new AgentLogger({ enableConsole: false });
      expect(defaultLogger).toBeDefined();
    });

    it('deve aceitar configuração customizada', () => {
      const customLogger = new AgentLogger({
        maxLogs: 500,
        minLevel: 'warn',
        enableConsole: false,
      });
      expect(customLogger).toBeDefined();
    });
  });

  describe('log', () => {
    it('deve registrar log com todos os campos', () => {
      logger.log({
        level: 'info',
        component: 'agent',
        action: 'test.action',
        details: { key: 'value' },
        durationMs: 100,
        userId: 'user-123',
        organizationId: 1,
        branchId: 1,
      });

      const logs = logger.getRecentLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].component).toBe('agent');
      expect(logs[0].action).toBe('test.action');
      expect(logs[0].details).toEqual({ key: 'value' });
      expect(logs[0].durationMs).toBe(100);
      expect(logs[0].userId).toBe('user-123');
    });

    it('deve adicionar timestamp automaticamente', () => {
      logger.log({
        level: 'info',
        component: 'tool',
        action: 'test',
        details: {},
      });

      const logs = logger.getRecentLogs();
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('deve respeitar nível mínimo', () => {
      const warnLogger = new AgentLogger({
        minLevel: 'warn',
        enableConsole: false,
      });

      warnLogger.log({ level: 'debug', component: 'agent', action: 'debug', details: {} });
      warnLogger.log({ level: 'info', component: 'agent', action: 'info', details: {} });
      warnLogger.log({ level: 'warn', component: 'agent', action: 'warn', details: {} });
      warnLogger.log({ level: 'error', component: 'agent', action: 'error', details: {} });

      const logs = warnLogger.getRecentLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].level).toBe('warn');
      expect(logs[1].level).toBe('error');
    });

    it('deve rotacionar logs quando exceder máximo', () => {
      const smallLogger = new AgentLogger({
        maxLogs: 5,
        enableConsole: false,
      });

      for (let i = 0; i < 10; i++) {
        smallLogger.log({
          level: 'info',
          component: 'agent',
          action: `action-${i}`,
          details: {},
        });
      }

      const logs = smallLogger.getRecentLogs();
      expect(logs.length).toBe(5);
      expect(logs[0].action).toBe('action-5');
      expect(logs[4].action).toBe('action-9');
    });
  });

  describe('convenience methods', () => {
    it('deve registrar log debug', () => {
      logger.debug('agent', 'debug.test', { data: 'test' });

      const logs = logger.getRecentLogs();
      expect(logs[0].level).toBe('debug');
    });

    it('deve registrar log info', () => {
      logger.info('tool', 'info.test', { data: 'test' });

      const logs = logger.getRecentLogs();
      expect(logs[0].level).toBe('info');
      expect(logs[0].component).toBe('tool');
    });

    it('deve registrar log warn', () => {
      logger.warn('workflow', 'warn.test');

      const logs = logger.getRecentLogs();
      expect(logs[0].level).toBe('warn');
      expect(logs[0].component).toBe('workflow');
    });

    it('deve registrar log error', () => {
      logger.error('voice', 'error.test', { error: 'something failed' });

      const logs = logger.getRecentLogs();
      expect(logs[0].level).toBe('error');
      expect(logs[0].component).toBe('voice');
    });
  });

  describe('startTimer', () => {
    it('deve retornar função que calcula duração', async () => {
      const timer = logger.startTimer();

      // Simular algum tempo
      await new Promise(resolve => setTimeout(resolve, 50));

      const duration = timer();
      expect(duration).toBeGreaterThanOrEqual(40);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('getRecentLogs', () => {
    it('deve retornar logs mais recentes', () => {
      for (let i = 0; i < 10; i++) {
        logger.log({
          level: 'info',
          component: 'agent',
          action: `action-${i}`,
          details: {},
        });
      }

      const recent = logger.getRecentLogs(3);
      expect(recent.length).toBe(3);
      expect(recent[0].action).toBe('action-7');
      expect(recent[2].action).toBe('action-9');
    });
  });

  describe('getLogsByComponent', () => {
    it('deve filtrar logs por componente', () => {
      logger.info('agent', 'agent.action', {});
      logger.info('tool', 'tool.action', {});
      logger.info('workflow', 'workflow.action', {});
      logger.info('voice', 'voice.action', {});
      logger.info('agent', 'agent.action2', {});

      const agentLogs = logger.getLogsByComponent('agent');
      expect(agentLogs.length).toBe(2);

      const toolLogs = logger.getLogsByComponent('tool');
      expect(toolLogs.length).toBe(1);
    });
  });

  describe('getLogsByLevel', () => {
    it('deve filtrar logs por nível', () => {
      logger.debug('agent', 'debug', {});
      logger.info('agent', 'info', {});
      logger.warn('agent', 'warn', {});
      logger.error('agent', 'error', {});
      logger.error('agent', 'error2', {});

      const errorLogs = logger.getLogsByLevel('error');
      expect(errorLogs.length).toBe(2);

      const infoLogs = logger.getLogsByLevel('info');
      expect(infoLogs.length).toBe(1);
    });
  });

  describe('getLogsByCorrelationId', () => {
    it('deve filtrar logs por correlationId', () => {
      logger.log({
        level: 'info',
        component: 'agent',
        action: 'start',
        details: {},
        correlationId: 'req-123',
      });
      logger.log({
        level: 'info',
        component: 'tool',
        action: 'execute',
        details: {},
        correlationId: 'req-123',
      });
      logger.log({
        level: 'info',
        component: 'agent',
        action: 'other',
        details: {},
        correlationId: 'req-456',
      });

      const logs123 = logger.getLogsByCorrelationId('req-123');
      expect(logs123.length).toBe(2);

      const logs456 = logger.getLogsByCorrelationId('req-456');
      expect(logs456.length).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('deve calcular métricas básicas', () => {
      logger.info('agent', 'action1', {});
      logger.info('tool', 'action2', {});
      logger.error('workflow', 'error1', {});

      const metrics = logger.getMetrics();

      expect(metrics.totalLogs).toBe(3);
      expect(metrics.logsLastHour).toBe(3);
      expect(metrics.errorCount).toBe(1);
    });

    it('deve contar logs por componente', () => {
      logger.info('agent', 'a1', {});
      logger.info('agent', 'a2', {});
      logger.info('tool', 't1', {});
      logger.info('workflow', 'w1', {});

      const metrics = logger.getMetrics();

      expect(metrics.byComponent.agent).toBe(2);
      expect(metrics.byComponent.tool).toBe(1);
      expect(metrics.byComponent.workflow).toBe(1);
      expect(metrics.byComponent.voice).toBe(0);
    });

    it('deve calcular média de duração por componente', () => {
      logger.log({
        level: 'info',
        component: 'tool',
        action: 't1',
        details: {},
        durationMs: 100,
      });
      logger.log({
        level: 'info',
        component: 'tool',
        action: 't2',
        details: {},
        durationMs: 200,
      });

      const metrics = logger.getMetrics();

      expect(metrics.avgDurationByComponent.tool).toBe(150);
    });
  });

  describe('clear', () => {
    it('deve limpar todos os logs', () => {
      logger.info('agent', 'a1', {});
      logger.info('agent', 'a2', {});
      logger.info('agent', 'a3', {});

      expect(logger.getRecentLogs().length).toBe(3);

      logger.clear();

      expect(logger.getRecentLogs().length).toBe(0);
    });
  });
});
