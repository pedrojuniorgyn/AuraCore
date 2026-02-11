/**
 * API: POST /api/strategic/templates/[id]/use
 * Cria itens a partir de um template
 *
 * @module app/api/strategic/templates/[id]/use
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DEFAULT_TEMPLATES } from '@/lib/templates/default-templates';
import type { UseTemplateRequest, UseTemplateResult, TemplateItem } from '@/lib/templates/template-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: templateId } = await context.params;
    const body: UseTemplateRequest = await request.json();
    const { variables, selectedItems } = body;

    // Buscar template
    // TODO: Em produção, buscar do banco
    const template = DEFAULT_TEMPLATES.find((t) => t.id === templateId);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Filtrar itens selecionados
    let itemsToCreate: TemplateItem[] = template.items || [];
    if (selectedItems && selectedItems.length > 0) {
      itemsToCreate = itemsToCreate.filter((i) => selectedItems.includes(i.id));
    }

    // Substituir variáveis
    const replaceVariables = (text: string): string => {
      let result = text;
      Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
      return result;
    };

    // Criar itens
    const createdItems: UseTemplateResult['createdItems'] = [];
    const errors: string[] = [];

    for (const item of itemsToCreate) {
      try {
        const itemName = replaceVariables(item.name);

        // TODO: Em produção, criar no banco de dados
        // switch (item.type) {
        //   case 'kpi':
        //     await kpiRepository.create({...});
        //     break;
        //   case 'action_plan':
        //     await actionPlanRepository.create({...});
        //     break;
        // }

        const createdId = `${item.type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        createdItems.push({
          type: item.type,
          id: createdId,
          name: itemName,
        });

        logger.info('Created from template:', {
          templateId,
          itemType: item.type,
          itemName,
          createdId,
          userId: session.user.id,
        });
      } catch (err) {
        errors.push(`Erro ao criar ${item.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Incrementar contador de uso do template
    // TODO: await templateRepository.incrementUsageCount(templateId);

    const result: UseTemplateResult = {
      success: errors.length === 0,
      createdItems,
      errors: errors.length > 0 ? errors : undefined,
    };

    return NextResponse.json(result);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('POST /api/strategic/templates/[id]/use error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
