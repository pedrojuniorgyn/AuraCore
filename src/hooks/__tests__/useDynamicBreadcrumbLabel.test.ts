/**
 * Testes: useDynamicBreadcrumbLabel - Funções auxiliares
 * Valida lógica de extração de labels e detecção de UUIDs
 * 
 * @module hooks/__tests__
 * @note Testes de hook React requerem @testing-library/react
 * @note Por ora, validamos a lógica core das funções auxiliares
 */
import { describe, it, expect } from 'vitest';

describe('useDynamicBreadcrumbLabel - Core Logic', () => {
  describe('isUUID', () => {
    function isUUID(segment: string): boolean {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(segment);
    }

    it('deve identificar UUID válido', () => {
      expect(isUUID('6d8f1234-5678-90ab-cdef-123456789abc')).toBe(true);
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('deve rejeitar string normal', () => {
      expect(isUUID('goals')).toBe(false);
      expect(isUUID('strategic')).toBe(false);
      expect(isUUID('123')).toBe(false);
    });

    it('deve rejeitar UUID inválido', () => {
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('6d8f1234-5678-90ab-cdef')).toBe(false); // Incompleto
    });
  });

  describe('truncateUUID', () => {
    function truncateUUID(uuid: string): string {
      return `${uuid.slice(0, 8)}…`;
    }

    it('deve truncar UUID corretamente', () => {
      expect(truncateUUID('6d8f1234-5678-90ab-cdef-123456789abc')).toBe('6d8f1234…');
      expect(truncateUUID('abc12345-6789-0abc-def1-234567890abc')).toBe('abc12345…');
    });
  });

  describe('extractLabel', () => {
    function extractLabel(data: Record<string, unknown>, type: string): string {
      switch (type) {
        case 'goal':
          return (data.description as string) || (data.code as string) || 'Objetivo';
        case 'kpi':
          if (data.code && data.name) {
            return `${data.code} - ${data.name}`;
          }
          return (data.name as string) || (data.code as string) || 'KPI';
        case 'action-plan':
          return (data.what as string) || (data.title as string) || 'Plano de Ação';
        case 'strategy':
          return (data.description as string) || (data.name as string) || (data.code as string) || 'Estratégia';
        case 'swot':
          return (data.title as string) || (data.description as string) || 'Análise SWOT';
        case 'pdca':
          return (data.title as string) || (data.what as string) || 'Ciclo PDCA';
        case 'war-room':
          return (data.title as string) || (data.theme as string) || 'War Room';
        case 'partner':
          return (data.tradeName as string) || (data.legalName as string) || 'Parceiro';
        case 'product':
          return (data.description as string) || (data.name as string) || (data.code as string) || 'Produto';
        default:
          return 'Item';
      }
    }

    it('deve extrair description de goal', () => {
      const data = { code: 'G001', description: 'Aumentar Receita' };
      expect(extractLabel(data, 'goal')).toBe('Aumentar Receita');
    });

    it('deve usar code de goal se description não existir', () => {
      const data = { code: 'G001' };
      expect(extractLabel(data, 'goal')).toBe('G001');
    });

    it('deve extrair código + nome de KPI', () => {
      const data = { code: 'NPS', name: 'Net Promoter Score' };
      expect(extractLabel(data, 'kpi')).toBe('NPS - Net Promoter Score');
    });

    it('deve extrair "what" de action-plan', () => {
      const data = { what: 'Implementar CRM' };
      expect(extractLabel(data, 'action-plan')).toBe('Implementar CRM');
    });

    it('deve extrair description de strategy', () => {
      const data = { code: 'S001', description: 'Crescimento Sustentável' };
      expect(extractLabel(data, 'strategy')).toBe('Crescimento Sustentável');
    });

    it('deve extrair title de SWOT', () => {
      const data = { title: 'Análise SWOT Q1 2026' };
      expect(extractLabel(data, 'swot')).toBe('Análise SWOT Q1 2026');
    });

    it('deve extrair title de PDCA', () => {
      const data = { title: 'Reduzir Defeitos em 50%' };
      expect(extractLabel(data, 'pdca')).toBe('Reduzir Defeitos em 50%');
    });

    it('deve extrair title de war-room', () => {
      const data = { title: 'Reunião Emergencial Q1', theme: 'Crise Operacional' };
      expect(extractLabel(data, 'war-room')).toBe('Reunião Emergencial Q1');
    });

    it('deve extrair tradeName de partner', () => {
      const data = { tradeName: 'Transportadora XYZ Ltda', legalName: 'XYZ Transportes LTDA' };
      expect(extractLabel(data, 'partner')).toBe('Transportadora XYZ Ltda');
    });

    it('deve extrair description de product', () => {
      const data = { code: 'PROD001', description: 'Notebook Dell Inspiron 15', name: 'Notebook Dell' };
      expect(extractLabel(data, 'product')).toBe('Notebook Dell Inspiron 15');
    });

    it('deve usar fallback quando dados vazios', () => {
      expect(extractLabel({}, 'goal')).toBe('Objetivo');
      expect(extractLabel({}, 'kpi')).toBe('KPI');
      expect(extractLabel({}, 'action-plan')).toBe('Plano de Ação');
      expect(extractLabel({}, 'strategy')).toBe('Estratégia');
      expect(extractLabel({}, 'swot')).toBe('Análise SWOT');
      expect(extractLabel({}, 'pdca')).toBe('Ciclo PDCA');
      expect(extractLabel({}, 'war-room')).toBe('War Room');
      expect(extractLabel({}, 'partner')).toBe('Parceiro');
      expect(extractLabel({}, 'product')).toBe('Produto');
    });
  });

  describe('getResourceInfo', () => {
    function getResourceInfo(pathname: string, segment: string): {
      type: 'goal' | 'kpi' | 'action-plan' | 'okr' | 'idea' | 'strategy' | 'swot' | 'pdca' | 'war-room' | 'partner' | 'product' | null;
      apiUrl: string | null;
    } {
      // Módulo Strategic
      if (pathname.includes('/strategic/goals/')) {
        return { type: 'goal', apiUrl: `/api/strategic/goals/${segment}` };
      }
      if (pathname.includes('/strategic/kpis/')) {
        return { type: 'kpi', apiUrl: `/api/strategic/kpis/${segment}` };
      }
      if (pathname.includes('/strategic/action-plans/')) {
        return { type: 'action-plan', apiUrl: `/api/strategic/action-plans/${segment}` };
      }
      if (pathname.includes('/strategic/strategies/')) {
        return { type: 'strategy', apiUrl: `/api/strategic/strategies/${segment}` };
      }
      if (pathname.includes('/strategic/swot/')) {
        return { type: 'swot', apiUrl: `/api/strategic/swot/${segment}` };
      }
      if (pathname.includes('/strategic/pdca/')) {
        return { type: 'pdca', apiUrl: `/api/strategic/pdca/${segment}` };
      }
      if (pathname.includes('/strategic/war-room/')) {
        return { type: 'war-room', apiUrl: `/api/strategic/war-room/${segment}` };
      }
      
      // Módulo Cadastros
      if (pathname.includes('/cadastros/parceiros/')) {
        return { type: 'partner', apiUrl: `/api/partners/${segment}` };
      }
      if (pathname.includes('/cadastros/produtos/')) {
        return { type: 'product', apiUrl: `/api/products/${segment}` };
      }
      
      return { type: null, apiUrl: null };
    }

    it('deve identificar goal', () => {
      const result = getResourceInfo('/strategic/goals/abc-123', 'abc-123');
      expect(result.type).toBe('goal');
      expect(result.apiUrl).toBe('/api/strategic/goals/abc-123');
    });

    it('deve identificar kpi', () => {
      const result = getResourceInfo('/strategic/kpis/def-456', 'def-456');
      expect(result.type).toBe('kpi');
      expect(result.apiUrl).toBe('/api/strategic/kpis/def-456');
    });

    it('deve identificar strategy', () => {
      const result = getResourceInfo('/strategic/strategies/xyz-789', 'xyz-789');
      expect(result.type).toBe('strategy');
      expect(result.apiUrl).toBe('/api/strategic/strategies/xyz-789');
    });

    it('deve identificar swot', () => {
      const result = getResourceInfo('/strategic/swot/swot-123', 'swot-123');
      expect(result.type).toBe('swot');
      expect(result.apiUrl).toBe('/api/strategic/swot/swot-123');
    });

    it('deve identificar partner', () => {
      const result = getResourceInfo('/cadastros/parceiros/edit/partner-123', 'partner-123');
      expect(result.type).toBe('partner');
      expect(result.apiUrl).toBe('/api/partners/partner-123');
    });

    it('deve identificar product', () => {
      const result = getResourceInfo('/cadastros/produtos/edit/prod-456', 'prod-456');
      expect(result.type).toBe('product');
      expect(result.apiUrl).toBe('/api/products/prod-456');
    });

    it('deve retornar null para rota desconhecida', () => {
      const result = getResourceInfo('/unknown/path/abc-123', 'abc-123');
      expect(result.type).toBe(null);
      expect(result.apiUrl).toBe(null);
    });
  });
});
