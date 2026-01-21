/**
 * API: GET/POST /api/strategic/templates
 * Gerenciamento de templates de planos de ação
 * 
 * @module app/api/strategic/templates
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DEFAULT_TEMPLATES } from '@/lib/templates/default-templates';

export const dynamic = 'force-dynamic';

// Templates legados (serão mesclados com DEFAULT_TEMPLATES)
const legacyTemplates = [
  {
    id: 't1',
    name: 'Melhoria de OTD',
    description: 'Template para criação de planos focados em melhorar o índice de entregas no prazo.',
    icon: '🚚',
    category: 'logistics',
    rating: 4.8,
    usageCount: 45,
    isSystem: true,
    isOwner: false,
    createdBy: { name: 'Sistema' },
    structure: {
      what: 'Implementar ações para aumentar OTD de X% para Y%',
      why: 'O índice de entregas no prazo está impactando a satisfação dos clientes e gerando custos extras com reentregas.',
      where: 'Operação de transporte / Última milha',
      when: '',
      who: '',
      how: [
        'Mapear gargalos de entrega',
        'Revisar rotas críticas',
        'Treinar equipe de entregas',
        'Implementar tracking em tempo real',
      ],
      howMuch: '',
    },
    suggestedTasks: [
      { id: 'st1', title: 'Análise de dados históricos de entregas' },
      { id: 'st2', title: 'Identificar top 10 rotas com maior atraso' },
      { id: 'st3', title: 'Reunião com equipe de última milha' },
      { id: 'st4', title: 'Implementar checklist de saída' },
      { id: 'st5', title: 'Definir SLA por região' },
    ],
  },
  {
    id: 't2',
    name: 'Redução de Custos',
    description: 'Template para identificação e eliminação de desperdícios operacionais.',
    icon: '💰',
    category: 'financial',
    rating: 4.6,
    usageCount: 38,
    isSystem: true,
    isOwner: false,
    createdBy: { name: 'Sistema' },
    structure: {
      what: 'Reduzir custos operacionais em X%',
      why: 'Necessidade de melhorar margem e competitividade.',
      where: 'Todas as áreas operacionais',
      when: '',
      who: '',
      how: [
        'Mapear centro de custos',
        'Identificar desperdícios',
        'Negociar com fornecedores',
        'Otimizar processos',
      ],
      howMuch: '',
    },
    suggestedTasks: [
      { id: 'st1', title: 'Levantar custos por categoria' },
      { id: 'st2', title: 'Benchmark com mercado' },
      { id: 'st3', title: 'Renegociar contratos top 5' },
    ],
  },
  {
    id: 't3',
    name: 'Satisfação do Cliente',
    description: 'Template para melhorar NPS e experiência do cliente.',
    icon: '👥',
    category: 'commercial',
    rating: 4.9,
    usageCount: 52,
    isSystem: true,
    isOwner: false,
    createdBy: { name: 'Sistema' },
    structure: {
      what: 'Aumentar NPS de X para Y',
      why: 'Cliente satisfeito gera recorrência e indicações.',
      where: 'Pontos de contato com cliente',
      when: '',
      who: '',
      how: [
        'Mapear jornada do cliente',
        'Identificar pontos de dor',
        'Treinar equipe de atendimento',
        'Implementar pesquisa pós-venda',
      ],
      howMuch: '',
    },
    suggestedTasks: [
      { id: 'st1', title: 'Pesquisa de satisfação atual' },
      { id: 'st2', title: 'Workshop com equipe comercial' },
      { id: 'st3', title: 'Criar FAQ de atendimento' },
    ],
  },
  {
    id: 't4',
    name: 'Otimização de Rotas',
    description: 'Template para reduzir quilometragem e tempo de entregas.',
    icon: '📍',
    category: 'logistics',
    rating: 4.5,
    usageCount: 29,
    isSystem: true,
    isOwner: false,
    createdBy: { name: 'Sistema' },
    structure: {
      what: 'Reduzir km rodado em X% e tempo de entrega em Y%',
      why: 'Rotas ineficientes geram custos desnecessários com combustível e desgaste de frota.',
      where: 'Operação de distribuição',
      when: '',
      who: '',
      how: [
        'Analisar rotas atuais',
        'Implementar roteirizador',
        'Definir janelas de entrega',
        'Agrupar entregas por região',
      ],
      howMuch: '',
    },
    suggestedTasks: [
      { id: 'st1', title: 'Mapear rotas atuais' },
      { id: 'st2', title: 'Calcular distância média por entrega' },
      { id: 'st3', title: 'Avaliar ferramentas de roteirização' },
    ],
  },
  {
    id: 't5',
    name: 'Gestão de Avarias',
    description: 'Template para reduzir perdas com avarias em cargas.',
    icon: '📦',
    category: 'quality',
    rating: 4.3,
    usageCount: 18,
    isSystem: true,
    isOwner: false,
    createdBy: { name: 'Sistema' },
    structure: {
      what: 'Reduzir índice de avarias de X% para Y%',
      why: 'Avarias geram prejuízos financeiros e insatisfação de clientes.',
      where: 'Operação de carga/descarga e transporte',
      when: '',
      who: '',
      how: [
        'Identificar principais causas de avaria',
        'Treinar equipe de manuseio',
        'Melhorar embalagens',
        'Implementar checklist de verificação',
      ],
      howMuch: '',
    },
    suggestedTasks: [
      { id: 'st1', title: 'Levantar histórico de avarias' },
      { id: 'st2', title: 'Classificar por tipo de carga' },
      { id: 'st3', title: 'Definir padrões de embalagem' },
    ],
  },
  {
    id: 't6',
    name: 'Melhoria de Fluxo de Caixa',
    description: 'Template para otimizar entradas e saídas financeiras.',
    icon: '💵',
    category: 'financial',
    rating: 4.7,
    usageCount: 33,
    isSystem: true,
    isOwner: false,
    createdBy: { name: 'Sistema' },
    structure: {
      what: 'Melhorar fluxo de caixa em X%',
      why: 'Fluxo de caixa saudável garante operação sustentável.',
      where: 'Financeiro e Comercial',
      when: '',
      who: '',
      how: [
        'Analisar ciclo de recebimento',
        'Negociar prazos com fornecedores',
        'Implementar cobrança ativa',
        'Revisar política de crédito',
      ],
      howMuch: '',
    },
    suggestedTasks: [
      { id: 'st1', title: 'Mapear aging de recebíveis' },
      { id: 'st2', title: 'Definir régua de cobrança' },
      { id: 'st3', title: 'Renegociar top 10 fornecedores' },
    ],
  },
];

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Buscar templates do usuário do banco
    // const userTemplates = await templateRepository.findByOrganization(orgId, branchId);

    // Mesclar templates padrão do sistema com templates legados
    const allTemplates = [...DEFAULT_TEMPLATES, ...legacyTemplates];

    return NextResponse.json({
      templates: allTemplates,
    });
  } catch (error) {
    console.error('GET /api/strategic/templates error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await request.json();
    
    // TODO: Salvar template no banco
    // const newTemplate = await templateRepository.create({
    //   ...template,
    //   organizationId,
    //   branchId,
    //   createdBy: session.user.id,
    // });

    console.log('Creating template:', template);

    return NextResponse.json({ 
      success: true, 
      id: `template-${Date.now()}`,
    });
  } catch (error) {
    console.error('POST /api/strategic/templates error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
