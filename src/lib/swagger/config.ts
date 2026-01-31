/**
 * OpenAPI Configuration
 *
 * Configuração completa da documentação Swagger/OpenAPI 3.0
 * para o módulo Strategic (BSC, PDCA, GEROT)
 */

import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'AuraCore Strategic API',
        version: '2.0.0',
        description: 'API para módulo de Gestão Estratégica (BSC, PDCA, GEROT)',
        contact: {
          name: 'AuraCore Team',
          email: 'dev@auracore.cloud',
        },
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
          description: 'API Server',
        },
      ],
      tags: [
        { name: 'Strategy', description: 'Planejamento estratégico' },
        { name: 'Goals', description: 'Objetivos estratégicos (BSC)' },
        { name: 'KPIs', description: 'Indicadores de performance' },
        { name: 'Action Plans', description: 'Planos de ação (5W2H/PDCA)' },
        { name: 'GEROT', description: 'Itens de Controle e Verificação' },
        { name: 'Anomalies', description: 'Gestão de anomalias' },
        { name: 'Analytics', description: 'Dashboard e análises' },
        { name: 'War Room', description: 'Reuniões executivas' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              details: { type: 'object' },
            },
          },
          Pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              pageSize: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
          Strategy: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              vision: { type: 'string' },
              mission: { type: 'string' },
              values: { type: 'array', items: { type: 'string' } },
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' },
              status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] },
              versionType: { type: 'string', enum: ['ACTUAL', 'BUDGET', 'FORECAST', 'SCENARIO'] },
            },
          },
          StrategicGoal: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              perspectiveId: { type: 'string', format: 'uuid' },
              code: { type: 'string' },
              name: { type: 'string' },
              targetValue: { type: 'number' },
              currentValue: { type: 'number' },
              weight: { type: 'number' },
              cascadeLevel: { type: 'string', enum: ['CEO', 'DIRECTOR', 'MANAGER', 'TEAM'] },
              status: { type: 'string', enum: ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'CRITICAL', 'ACHIEVED'] },
            },
          },
          KPI: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              code: { type: 'string' },
              name: { type: 'string' },
              unit: { type: 'string' },
              polarity: { type: 'string', enum: ['HIGHER_IS_BETTER', 'LOWER_IS_BETTER'] },
              frequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'] },
              targetValue: { type: 'number' },
              currentValue: { type: 'number' },
              status: { type: 'string', enum: ['ON_TRACK', 'AT_RISK', 'CRITICAL'] },
            },
          },
          ActionPlan: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              code: { type: 'string' },
              what: { type: 'string' },
              why: { type: 'string' },
              who: { type: 'string' },
              whoType: { type: 'string', enum: ['USER', 'EMAIL', 'PARTNER'] },
              where: { type: 'string' },
              whenDeadline: { type: 'string', format: 'date-time' },
              how: { type: 'string' },
              howMuch: { type: 'number' },
              pdcaCycle: { type: 'string', enum: ['PLAN', 'DO', 'CHECK', 'ACT'] },
              status: { type: 'string', enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REPROPOSED'] },
              completionPercent: { type: 'integer', minimum: 0, maximum: 100 },
            },
          },
          ControlItem: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              code: { type: 'string' },
              name: { type: 'string' },
              processArea: { type: 'string' },
              targetValue: { type: 'number' },
              currentValue: { type: 'number' },
              upperLimit: { type: 'number' },
              lowerLimit: { type: 'number' },
              status: { type: 'string' },
            },
          },
          Anomaly: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              code: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
              status: { type: 'string', enum: ['OPEN', 'ANALYZING', 'ACTION_PENDING', 'RESOLVED', 'CANCELLED'] },
              why1: { type: 'string' },
              why2: { type: 'string' },
              why3: { type: 'string' },
              why4: { type: 'string' },
              why5: { type: 'string' },
              rootCause: { type: 'string' },
            },
          },
          BSCDashboard: {
            type: 'object',
            properties: {
              strategy: { '$ref': '#/components/schemas/Strategy' },
              perspectives: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    perspectiveId: { type: 'string' },
                    perspectiveName: { type: 'string' },
                    totalGoals: { type: 'integer' },
                    onTrack: { type: 'integer' },
                    atRisk: { type: 'integer' },
                    critical: { type: 'integer' },
                    avgCompletion: { type: 'number' },
                  },
                },
              },
              kpis: { type: 'object' },
              actionPlans: { type: 'object' },
              gerot: { type: 'object' },
              variance: { type: 'object' },
            },
          },
          VarianceAnalysis: {
            type: 'object',
            properties: {
              kpiId: { type: 'string' },
              actual: { type: 'number' },
              budget: { type: 'number' },
              forecast: { type: 'number' },
              varianceActualBudget: { type: 'number' },
              varianceActualBudgetPct: { type: 'number' },
              status: { type: 'string', enum: ['FAVORABLE', 'ACCEPTABLE', 'UNFAVORABLE'] },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  return spec;
};
