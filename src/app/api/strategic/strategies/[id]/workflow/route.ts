/**
 * API Routes: /api/strategic/strategies/[id]/workflow
 * POST - Execute workflow actions (submit, approve, reject, requestChanges)
 * GET - Get workflow history
 *
 * @module app/api/strategic/strategies
 * @see TASK01-RESEND-NOTIFICATIONS - Integração com notificações por email
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { ApprovalWorkflowService } from '@/modules/strategic/domain/services/ApprovalWorkflowService';
import { Strategy } from '@/modules/strategic/domain/entities/Strategy';
import { ApprovalHistory } from '@/modules/strategic/domain/entities/ApprovalHistory';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import { NotificationService } from '@/shared/infrastructure/notifications/NotificationService';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import type { IApprovalHistoryRepository } from '@/modules/strategic/domain/ports/output/IApprovalHistoryRepository';
import type { IApprovalPermissionRepository } from '@/modules/strategic/domain/ports/output/IApprovalPermissionRepository';
import type { ApprovalPermissionService } from '@/modules/strategic/application/services/ApprovalPermissionService';
import '@/modules/strategic/infrastructure/di/StrategicModule';

const workflowActionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'requestChanges']),
  userId: z.number().int().positive(),
  reason: z.string().trim().optional(),
  comments: z.string().trim().optional(),
});

/**
 * POST /api/strategic/strategies/{id}/workflow
 * Execute workflow action
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);
    const { id: strategyId } = await context.params;

    if (!strategyId) {
      return NextResponse.json(
        { error: 'strategyId is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = workflowActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, userId, reason, comments } = parsed.data;

    // Get repositories and services
    const strategyRepo = container.resolve<IStrategyRepository>(
      STRATEGIC_TOKENS.StrategyRepository
    );
    const historyRepo = container.resolve<IApprovalHistoryRepository>(
      STRATEGIC_TOKENS.ApprovalHistoryRepository
    );
    const permissionService = container.resolve<ApprovalPermissionService>(
      STRATEGIC_TOKENS.ApprovalPermissionService
    );

    // Find strategy
    const strategy = await strategyRepo.findById(
      strategyId,
      tenantContext.organizationId,
      branchId
    );

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    // Execute action
    let result: Result<
      { strategy: Strategy; historyEntry: ApprovalHistory },
      string
    >;
    switch (action) {
      case 'submit':
        result = ApprovalWorkflowService.submitForApproval(
          strategy,
          userId,
          comments
        );
        break;

      case 'approve': {
        // SECURITY-CRITICAL: Validar permissão de aprovação
        // Este check é obrigatório antes de chamar ApprovalWorkflowService.approve()
        const hasPermission = await permissionService.canApprove(
          userId,
          tenantContext.organizationId,
          branchId
        );

        // ApprovalWorkflowService.approve() valida hasPermission internamente,
        // mas a validação real DEVE ser feita aqui com permissionService
        result = ApprovalWorkflowService.approve(
          strategy,
          userId,
          hasPermission,
          comments
        );
        break;
      }

      case 'reject': {
        if (!reason) {
          return NextResponse.json(
            { error: 'Reason is required for rejection' },
            { status: 400 }
          );
        }

        // SECURITY-CRITICAL: Validar permissão de aprovação
        const hasPermission = await permissionService.canApprove(
          userId,
          tenantContext.organizationId,
          branchId
        );

        result = ApprovalWorkflowService.reject(
          strategy,
          userId,
          hasPermission,
          reason,
          comments
        );
        break;
      }

      case 'requestChanges': {
        if (!reason) {
          return NextResponse.json(
            { error: 'Reason is required for requesting changes' },
            { status: 400 }
          );
        }

        // SECURITY-CRITICAL: Validar permissão de aprovação
        const hasPermission = await permissionService.canApprove(
          userId,
          tenantContext.organizationId,
          branchId
        );

        result = ApprovalWorkflowService.requestChanges(
          strategy,
          userId,
          hasPermission,
          reason,
          comments
        );
        break;
      }

      default:
        // Exhaustive check: se chegar aqui, Zod validation falhou
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Save strategy and history
    const { strategy: updatedStrategy, historyEntry } = result.value;

    const saveResult = await strategyRepo.save(updatedStrategy);
    if (!Result.isOk(saveResult)) {
      return NextResponse.json(
        { error: saveResult.error },
        { status: 500 }
      );
    }

    // Salvar histórico de aprovação (audit trail)
    // Nota: historyRepo.save() faz throw em caso de erro (não retorna Result)
    try {
      await historyRepo.save(historyEntry);
    } catch (historyError) {
      const errorMsg = historyError instanceof Error ? historyError.message : String(historyError);
      console.error('❌ Falha ao salvar histórico de aprovação:', errorMsg);
      // Estratégia já foi salva - retornar HTTP 200 com warning.
      // Usar success: true porque a operação principal (workflow action) foi bem-sucedida.
      // O warning indica que o audit trail está incompleto, mas a ação foi executada.
      // NOTA: Evitamos HTTP 207 porque response.ok() retorna true para 2xx,
      // e success: false nesse contexto seria semanticamente confuso.
      return NextResponse.json(
        {
          success: true,
          warning: 'Ação executada mas histórico não foi registrado. Audit trail incompleto.',
          data: {
            strategyId: updatedStrategy.id,
            workflowStatus: updatedStrategy.workflowStatus.value,
            action,
          },
        },
        { status: 200 }
      );
    }

    // ========================================
    // NOTIFICAÇÕES (Email + In-App)
    // ========================================
    // Enviar notificações de forma assíncrona (não bloqueia resposta)
    sendWorkflowNotifications(
      action,
      updatedStrategy,
      userId,
      reason || comments,
      tenantContext.organizationId,
      branchId
    ).catch((notifError) => {
      // Log error mas não falha a request (notificações são best-effort)
      console.error('❌ Erro ao enviar notificações de workflow:', notifError);
    });

    return NextResponse.json({
      success: true,
      data: {
        strategyId: updatedStrategy.id,
        workflowStatus: updatedStrategy.workflowStatus.value,
        action,
      },
    });
  } catch (error) {
    // API-ERR-001: getTenantContext() and resolveBranchIdOrThrow() throw NextResponse
    if (error instanceof NextResponse) {
      return error; // Return original 401/403/400 response
    }
    console.error('Error executing workflow action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Envia notificações de workflow (email + in-app)
 * Esta função é chamada de forma assíncrona para não bloquear a resposta
 */
async function sendWorkflowNotifications(
  action: 'submit' | 'approve' | 'reject' | 'requestChanges',
  strategy: Strategy,
  actorUserId: number,
  commentOrReason: string | undefined,
  organizationId: number,
  branchId: number
): Promise<void> {
  try {
    const notificationService = container.resolve(NotificationService);
    const approvalPermissionRepo = container.resolve<IApprovalPermissionRepository>(
      STRATEGIC_TOKENS.ApprovalPermissionRepository
    );

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const approvalUrl = `${baseUrl}/strategic/strategies/${strategy.id}/approve`;
    const strategyUrl = `${baseUrl}/strategic/strategies/${strategy.id}`;

    // Buscar IDs dos aprovadores
    const approverUserIds = await approvalPermissionRepo.findApproversByOrg(
      organizationId,
      branchId
    );

    // Contadores para logging
    let inAppSuccess = 0;
    let inAppFailed = 0;
    let emailSuccess = 0;
    let emailFailed = 0;

    switch (action) {
      case 'submit': {
        // Notificar todos os aprovadores sobre nova submissão
        // In-App: para cada aprovador
        for (const approverUserId of approverUserIds) {
          const inAppResult = await notificationService.createInAppNotification({
            organizationId,
            branchId,
            userId: approverUserId,
            type: 'INFO',
            event: 'STRATEGY_SUBMITTED',
            title: 'Nova estratégia para aprovação',
            message: `A estratégia "${strategy.name}" foi submetida para aprovação.`,
            data: { strategyId: strategy.id, submittedBy: actorUserId },
            actionUrl: `/strategic/strategies/${strategy.id}/approve`,
          });
          
          if (Result.isFail(inAppResult)) {
            console.warn(`⚠️ Falha ao criar notificação in-app para aprovador ${approverUserId}: ${inAppResult.error}`);
            inAppFailed++;
          } else {
            inAppSuccess++;
          }
        }

        // Email: enviar para email de aprovadores configurados via ENV
        const approverEmails = process.env.APPROVAL_NOTIFICATION_EMAILS?.split(',').filter(Boolean) || [];
        for (const email of approverEmails) {
          const emailResult = await notificationService.sendApprovalPendingEmail({
            to: email.trim(),
            approverName: 'Aprovador',
            strategyTitle: strategy.name,
            strategyCode: strategy.id.substring(0, 8).toUpperCase(),
            submittedBy: `Usuário #${actorUserId}`,
            submittedAt: strategy.submittedAt || new Date(),
            approvalUrl,
          });
          
          if (!emailResult.success) {
            console.warn(`⚠️ Falha ao enviar email para ${email}: ${emailResult.error}`);
            emailFailed++;
          } else {
            emailSuccess++;
          }
        }
        break;
      }

      case 'approve': {
        // Notificar o submitter sobre aprovação
        if (strategy.submittedByUserId) {
          // In-App
          const inAppResult = await notificationService.createInAppNotification({
            organizationId,
            branchId,
            userId: strategy.submittedByUserId,
            type: 'SUCCESS',
            event: 'STRATEGY_APPROVED',
            title: 'Estratégia aprovada',
            message: `Sua estratégia "${strategy.name}" foi aprovada.`,
            data: { strategyId: strategy.id, approvedBy: actorUserId },
            actionUrl: `/strategic/strategies/${strategy.id}`,
          });
          
          if (Result.isFail(inAppResult)) {
            console.warn(`⚠️ Falha ao criar notificação in-app para submitter ${strategy.submittedByUserId}: ${inAppResult.error}`);
            inAppFailed++;
          } else {
            inAppSuccess++;
          }

          // Email: se houver email do submitter configurado
          const submitterEmail = process.env.SUBMITTER_NOTIFICATION_EMAIL;
          if (submitterEmail) {
            const emailResult = await notificationService.sendApprovalDecisionEmail({
              to: submitterEmail,
              recipientName: 'Usuário',
              strategyTitle: strategy.name,
              strategyCode: strategy.id.substring(0, 8).toUpperCase(),
              status: 'approved',
              decisionBy: `Aprovador #${actorUserId}`,
              decisionAt: strategy.approvedAt || new Date(),
              comment: commentOrReason,
            });
            
            if (!emailResult.success) {
              console.warn(`⚠️ Falha ao enviar email para ${submitterEmail}: ${emailResult.error}`);
              emailFailed++;
            } else {
              emailSuccess++;
            }
          }
        }
        break;
      }

      case 'reject': {
        // Notificar o submitter sobre rejeição
        if (strategy.submittedByUserId) {
          // In-App
          const inAppResult = await notificationService.createInAppNotification({
            organizationId,
            branchId,
            userId: strategy.submittedByUserId,
            type: 'ERROR',
            event: 'STRATEGY_REJECTED',
            title: 'Estratégia rejeitada',
            message: `Sua estratégia "${strategy.name}" foi rejeitada. Motivo: ${commentOrReason || 'Não especificado'}`,
            data: { strategyId: strategy.id, rejectedBy: actorUserId, reason: commentOrReason },
            actionUrl: `/strategic/strategies/${strategy.id}`,
          });
          
          if (Result.isFail(inAppResult)) {
            console.warn(`⚠️ Falha ao criar notificação in-app para submitter ${strategy.submittedByUserId}: ${inAppResult.error}`);
            inAppFailed++;
          } else {
            inAppSuccess++;
          }

          // Email: se houver email do submitter configurado
          const submitterEmailReject = process.env.SUBMITTER_NOTIFICATION_EMAIL;
          if (submitterEmailReject) {
            const emailResult = await notificationService.sendApprovalDecisionEmail({
              to: submitterEmailReject,
              recipientName: 'Usuário',
              strategyTitle: strategy.name,
              strategyCode: strategy.id.substring(0, 8).toUpperCase(),
              status: 'rejected',
              decisionBy: `Aprovador #${actorUserId}`,
              decisionAt: strategy.rejectedAt || new Date(),
              reason: commentOrReason,
            });
            
            if (!emailResult.success) {
              console.warn(`⚠️ Falha ao enviar email para ${submitterEmailReject}: ${emailResult.error}`);
              emailFailed++;
            } else {
              emailSuccess++;
            }
          }
        }
        break;
      }

      case 'requestChanges': {
        // Notificar o submitter sobre solicitação de alterações
        if (strategy.submittedByUserId) {
          // In-App
          const inAppResult = await notificationService.createInAppNotification({
            organizationId,
            branchId,
            userId: strategy.submittedByUserId,
            type: 'WARNING',
            event: 'STRATEGY_CHANGES_REQUESTED',
            title: 'Alterações solicitadas',
            message: `Alterações foram solicitadas para sua estratégia "${strategy.name}". Motivo: ${commentOrReason || 'Não especificado'}`,
            data: { strategyId: strategy.id, requestedBy: actorUserId, reason: commentOrReason },
            actionUrl: `/strategic/strategies/${strategy.id}`,
          });
          
          if (Result.isFail(inAppResult)) {
            console.warn(`⚠️ Falha ao criar notificação in-app para submitter ${strategy.submittedByUserId}: ${inAppResult.error}`);
            inAppFailed++;
          } else {
            inAppSuccess++;
          }

          // Email: se houver email do submitter configurado
          const submitterEmailChanges = process.env.SUBMITTER_NOTIFICATION_EMAIL;
          if (submitterEmailChanges) {
            const emailResult = await notificationService.sendApprovalDecisionEmail({
              to: submitterEmailChanges,
              recipientName: 'Usuário',
              strategyTitle: strategy.name,
              strategyCode: strategy.id.substring(0, 8).toUpperCase(),
              status: 'changes_requested',
              decisionBy: `Aprovador #${actorUserId}`,
              decisionAt: new Date(),
              reason: commentOrReason,
            });
            
            if (!emailResult.success) {
              console.warn(`⚠️ Falha ao enviar email para ${submitterEmailChanges}: ${emailResult.error}`);
              emailFailed++;
            } else {
              emailSuccess++;
            }
          }
        }
        break;
      }
    }

    // Log resumo das notificações
    if (inAppFailed > 0 || emailFailed > 0) {
      console.warn(
        `⚠️ Notificações com falhas: inApp=${inAppSuccess}/${inAppSuccess + inAppFailed}, email=${emailSuccess}/${emailSuccess + emailFailed}`
      );
    }

    console.log(`✅ Notificações de workflow enviadas: action=${action}, strategyId=${strategy.id}`);
  } catch (error) {
    // Re-throw para ser capturado pelo caller
    throw error;
  }
}

/**
 * GET /api/strategic/strategies/{id}/workflow
 * Get workflow history
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenantContext = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantContext);
    const { id: strategyId } = await context.params;

    if (!strategyId) {
      return NextResponse.json(
        { error: 'strategyId is required' },
        { status: 400 }
      );
    }

    const historyRepo = container.resolve<IApprovalHistoryRepository>(
      STRATEGIC_TOKENS.ApprovalHistoryRepository
    );

    const history = await historyRepo.findByStrategyId(
      strategyId,
      tenantContext.organizationId,
      branchId
    );

    const historyData = history.map((h) => ({
      id: h.id,
      action: h.action,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      actorUserId: h.actorUserId,
      comments: h.comments,
      createdAt: h.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: historyData,
    });
  } catch (error) {
    // API-ERR-001: getTenantContext() and resolveBranchIdOrThrow() throw NextResponse
    if (error instanceof NextResponse) {
      return error; // Return original 401/403/400 response
    }
    console.error('Error getting workflow history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
