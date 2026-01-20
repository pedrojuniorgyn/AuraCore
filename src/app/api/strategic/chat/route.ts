/**
 * API: POST /api/strategic/chat
 * Chatbot Aurora AI para o módulo Strategic
 * 
 * Usa Google Gemini para gerar respostas contextualizadas
 * com dados estratégicos do tenant.
 * 
 * @module app/api/strategic/chat
 */
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IKPIRepository } from '@/modules/strategic/domain/ports/output/IKPIRepository';
import type { IActionPlanRepository } from '@/modules/strategic/domain/ports/output/IActionPlanRepository';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';

// Google Generative AI - usando import dinâmico para evitar erro se não configurado
let genAI: { getGenerativeModel: (config: { model: string }) => { generateContent: (prompt: string) => Promise<{ response: { text: () => string } }> } } | null = null;

async function initializeAI() {
  if (!process.env.GOOGLE_AI_API_KEY) return null;
  
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    return new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  } catch {
    console.warn('Google AI não configurado');
    return null;
  }
}

interface ChatAction {
  label: string;
  href: string;
}

/**
 * Detecta ações sugeridas baseado na pergunta do usuário
 */
function detectActions(message: string): ChatAction[] {
  const lower = message.toLowerCase();
  
  if (lower.includes('kpi') || lower.includes('indicador') || lower.includes('otd') || lower.includes('ebitda')) {
    return [
      { label: 'Ver KPIs', href: '/strategic/kpis' },
      { label: 'Criar Plano de Ação', href: '/strategic/action-plans' },
    ];
  }
  
  if (lower.includes('plano') || lower.includes('ação') || lower.includes('atrasad') || lower.includes('5w2h')) {
    return [
      { label: 'Ver Planos', href: '/strategic/action-plans' },
      { label: 'Kanban PDCA', href: '/strategic/pdca' },
    ];
  }
  
  if (lower.includes('status') || lower.includes('geral') || lower.includes('resumo')) {
    return [
      { label: 'Dashboard', href: '/strategic/dashboard' },
      { label: 'War Room', href: '/strategic/war-room' },
    ];
  }
  
  if (lower.includes('bsc') || lower.includes('perspectiva') || lower.includes('objetivo') || lower.includes('meta')) {
    return [
      { label: 'Mapa BSC', href: '/strategic/map' },
      { label: 'Objetivos', href: '/strategic/goals' },
    ];
  }
  
  if (lower.includes('swot') || lower.includes('força') || lower.includes('fraqueza') || lower.includes('oportunidade')) {
    return [
      { label: 'Análise SWOT', href: '/strategic/swot' },
    ];
  }
  
  if (lower.includes('pdca') || lower.includes('ciclo') || lower.includes('melhoria')) {
    return [
      { label: 'Kanban PDCA', href: '/strategic/pdca' },
    ];
  }
  
  return [
    { label: 'Dashboard', href: '/strategic/dashboard' },
  ];
}

/**
 * Gera resposta sem IA (fallback)
 */
function generateFallbackResponse(
  message: string, 
  context: {
    healthScore: number;
    totalKpis: number;
    criticalKpis: number;
    alertKpis: number;
    totalGoals: number;
    overdueActions: number;
  }
): string {
  const lower = message.toLowerCase();
  
  if (lower.includes('status') || lower.includes('geral') || lower.includes('como')) {
    const healthLabel = context.healthScore >= 80 ? 'Excelente' : 
                       context.healthScore >= 60 ? 'Bom' : 
                       context.healthScore >= 40 ? 'Atenção' : 'Crítico';
    
    return `**Status Estratégico Atual**\n\n` +
           `Health Score: ${context.healthScore}% (${healthLabel})\n\n` +
           `**KPIs:**\n- Total: ${context.totalKpis}\n- Críticos: ${context.criticalKpis}\n- Em alerta: ${context.alertKpis}\n\n` +
           `**Objetivos:** ${context.totalGoals} cadastrados\n` +
           `**Planos atrasados:** ${context.overdueActions}\n\n` +
           `${context.criticalKpis > 0 ? 'Recomendo verificar os KPIs críticos com urgência.' : 'Indicadores dentro do esperado!'}`;
  }
  
  if (lower.includes('kpi') || lower.includes('crítico') || lower.includes('indicador')) {
    if (context.criticalKpis === 0) {
      return `Ótimas notícias! Não há KPIs em estado crítico no momento.\n\n` +
             `Total de KPIs monitorados: ${context.totalKpis}\n` +
             `KPIs em alerta (amarelo): ${context.alertKpis}`;
    }
    return `Há **${context.criticalKpis} KPI(s) crítico(s)** que requerem atenção imediata.\n\n` +
           `Total de KPIs: ${context.totalKpis}\n` +
           `Em alerta: ${context.alertKpis}\n\n` +
           `Recomendo criar planos de ação para os KPIs críticos.`;
  }
  
  if (lower.includes('plano') || lower.includes('ação') || lower.includes('atrasad')) {
    if (context.overdueActions === 0) {
      return `Excelente! Não há planos de ação atrasados.\n\nTodos os planos estão sendo executados dentro do prazo.`;
    }
    return `Há **${context.overdueActions} plano(s) de ação atrasado(s)**.\n\n` +
           `Recomendo revisar os prazos e responsáveis no Kanban PDCA.`;
  }
  
  if (lower.includes('bsc') || lower.includes('perspectiva')) {
    return `O **Balanced Scorecard** está organizado em 4 perspectivas:\n\n` +
           `1. **Financeira** - Resultados econômicos\n` +
           `2. **Cliente** - Satisfação e relacionamento\n` +
           `3. **Processos** - Eficiência operacional\n` +
           `4. **Aprendizado** - Desenvolvimento organizacional\n\n` +
           `Atualmente temos ${context.totalGoals} objetivos estratégicos cadastrados.`;
  }
  
  return `Posso ajudar você com:\n\n` +
         `- **Status geral** da estratégia\n` +
         `- **KPIs críticos** e indicadores\n` +
         `- **Planos de ação** atrasados\n` +
         `- **BSC** e perspectivas\n` +
         `- **PDCA** e ciclos de melhoria\n\n` +
         `O que gostaria de saber?`;
}

export async function POST(request: Request) {
  try {
    const tenantContext = await getTenantContext();
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    // Buscar dados do contexto estratégico
    const kpiRepository = container.resolve<IKPIRepository>(STRATEGIC_TOKENS.KPIRepository);
    const actionPlanRepository = container.resolve<IActionPlanRepository>(STRATEGIC_TOKENS.ActionPlanRepository);
    const goalRepository = container.resolve<IStrategicGoalRepository>(STRATEGIC_TOKENS.StrategicGoalRepository);

    // Buscar KPIs
    const { items: allKpis } = await kpiRepository.findMany({
      organizationId: tenantContext.organizationId,
      branchId: tenantContext.branchId,
      page: 1,
      pageSize: 100,
    });

    // Buscar planos de ação vencidos
    const { items: overduePlans } = await actionPlanRepository.findMany({
      organizationId: tenantContext.organizationId,
      branchId: tenantContext.branchId,
      overdueOnly: true,
      page: 1,
      pageSize: 10,
    });

    // Buscar objetivos
    const { items: goals } = await goalRepository.findMany({
      organizationId: tenantContext.organizationId,
      branchId: tenantContext.branchId,
      page: 1,
      pageSize: 100,
    });

    // Calcular estatísticas
    const criticalKpis = allKpis.filter(k => k.status === 'RED').length;
    const alertKpis = allKpis.filter(k => k.status === 'YELLOW').length;
    const greenKpis = allKpis.filter(k => k.status === 'GREEN').length;
    const healthScore = allKpis.length > 0 
      ? Math.round((greenKpis / allKpis.length) * 100) 
      : 0;

    const context = {
      healthScore,
      totalKpis: allKpis.length,
      criticalKpis,
      alertKpis,
      totalGoals: goals.length,
      overdueActions: overduePlans.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED').length,
    };

    // Detectar ações sugeridas
    const actions = detectActions(message);

    // Tentar usar IA se configurada
    if (!genAI) {
      genAI = await initializeAI();
    }

    let responseText: string;

    if (genAI) {
      try {
        const systemPrompt = `Você é a Aurora AI, assistente de gestão estratégica do AuraCore ERP.

CONTEXTO ESTRATÉGICO ATUAL:
- Health Score: ${context.healthScore}%
- Total de KPIs: ${context.totalKpis}
- KPIs Críticos (vermelho): ${context.criticalKpis}
- KPIs em Alerta (amarelo): ${context.alertKpis}
- Total de Objetivos: ${context.totalGoals}
- Planos de Ação Atrasados: ${context.overdueActions}

REGRAS IMPORTANTES:
1. Seja conciso e objetivo (máximo 3 parágrafos curtos)
2. Use os dados do contexto fornecido
3. Responda sempre em português brasileiro
4. Sugira ações concretas quando relevante
5. Use formatação markdown simples (**negrito** para destaques)
6. Não invente dados - use apenas o contexto fornecido

PERGUNTA DO USUÁRIO: ${message}

Responda de forma profissional e útil:`;

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(systemPrompt);
        responseText = result.response.text();
      } catch (aiError) {
        console.error('AI generation error:', aiError);
        responseText = generateFallbackResponse(message, context);
      }
    } else {
      // Fallback sem IA
      responseText = generateFallbackResponse(message, context);
    }

    return NextResponse.json({ 
      response: responseText, 
      actions,
      context: {
        healthScore: context.healthScore,
        criticalKpis: context.criticalKpis,
      }
    });

  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('POST /api/strategic/chat error:', error);
    return NextResponse.json({ 
      response: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.',
      actions: [{ label: 'Dashboard', href: '/strategic/dashboard' }]
    });
  }
}
