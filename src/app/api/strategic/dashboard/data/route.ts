import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Fetch real data from repositories
    // const kpiRepository = container.resolve<IKpiRepository>('IKpiRepository');
    // const actionPlanRepository = container.resolve<IActionPlanRepository>('IActionPlanRepository');

    // Generate mock data with some randomness for demo
    const healthScore = 72 + Math.floor(Math.random() * 10) - 5;
    const previousHealthScore = 69;

    const mockData = {
      healthScore,
      previousHealthScore,
      lastUpdate: new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      
      alerts: [
        { 
          id: '1', 
          type: 'CRITICAL' as const, 
          title: 'OTD abaixo da meta', 
          value: '67% (meta: 95%)' 
        },
        { 
          id: '2', 
          type: 'CRITICAL' as const, 
          title: 'EBITDA negativo', 
          value: '-2.5%' 
        },
        { 
          id: '3', 
          type: 'WARNING' as const, 
          title: 'NPS em queda', 
          value: '72 (meta: 80)' 
        },
        { 
          id: '4', 
          type: 'WARNING' as const, 
          title: 'Prazo médio entregas', 
          value: '+2 dias vs meta' 
        },
      ],
      
      perspectives: [
        { 
          type: 'FINANCIAL' as const, 
          score: 75, 
          trend: -2, 
          kpiCount: 5 
        },
        { 
          type: 'CUSTOMER' as const, 
          score: 82, 
          trend: 5, 
          kpiCount: 3 
        },
        { 
          type: 'INTERNAL' as const, 
          score: 68, 
          trend: -8, 
          kpiCount: 8 
        },
        { 
          type: 'LEARNING' as const, 
          score: 91, 
          trend: 3, 
          kpiCount: 4 
        },
      ],
      
      actions: [
        { 
          id: '1', 
          code: 'PDC-002', 
          title: 'Reverter queda OTD', 
          daysRemaining: -3, 
          status: 'LATE' as const 
        },
        { 
          id: '2', 
          code: 'PDC-005', 
          title: 'Reduzir custos operacionais', 
          daysRemaining: 5, 
          status: 'AT_RISK' as const 
        },
        { 
          id: '3', 
          code: 'PDC-008', 
          title: 'Capacitar equipe entregas', 
          daysRemaining: 7, 
          status: 'ON_TIME' as const 
        },
        { 
          id: '4', 
          code: 'PDC-012', 
          title: 'Implementar rastreamento real-time', 
          daysRemaining: 15, 
          status: 'ON_TIME' as const 
        },
        { 
          id: '5', 
          code: 'PDC-015', 
          title: 'Revisar contratos transportadoras', 
          daysRemaining: 2, 
          status: 'AT_RISK' as const 
        },
      ],
      
      trendData: [
        { day: 'Seg', value: 68 },
        { day: 'Ter', value: 72 },
        { day: 'Qua', value: 70 },
        { day: 'Qui', value: 75 },
        { day: 'Sex', value: healthScore },
      ],
      
      auroraInsight: getRandomInsight(healthScore),
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getRandomInsight(healthScore: number): string {
  const insights = [
    `O Health Score está em ${healthScore}%. Para atingir a meta de 80%, recomendo focar nos 2 KPIs críticos identificados.`,
    'O KPI OTD apresenta tendência de queda nas últimas 2 semanas. Sugestão: revisar rotas e capacidade de entregas.',
    'A perspectiva de Cliente melhorou 5% este mês. Continue monitorando o NPS para consolidar o progresso.',
    '3 planos de ação estão próximos do vencimento. Priorize PDC-002 e PDC-005 para evitar impacto no score.',
    'Detectei correlação entre atrasos e região Sul. Considere reforçar operação nessa área.',
  ];
  
  return insights[Math.floor(Math.random() * insights.length)];
}
