/**
 * Domain Service: GoalCascadeService
 * Lógica de cascateamento de metas (100% stateless)
 * 
 * Referência: Evans (2003) - Domain Services são stateless
 * 
 * @module strategic/domain/services
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 */
import { Result } from '@/shared/domain';
import { StrategicGoal } from '../entities/StrategicGoal';
import { CascadeLevel } from '../value-objects/CascadeLevel';
import { GoalStatus } from '../value-objects/GoalStatus';

interface CascadeContribution {
  childGoalId: string;
  parentGoalId: string;
  weightContribution: number;
  progressContribution: number;
}

interface AggregatedProgress {
  goalId: string;
  ownProgress: number;
  childrenProgress: number;
  totalProgress: number;
  childCount: number;
}

export interface CascadeTreeNode {
  id: string;
  code: string;
  description: string;
  cascadeLevel: string;
  progress: number;
  status: string;
  statusColor: string;
  weight: number;
  children: CascadeTreeNode[];
}

export class GoalCascadeService {
  private constructor() {} // Impede instanciação (DOMAIN-SVC-002)

  /**
   * Valida se o cascateamento é válido (CEO → DIRECTOR → MANAGER → TEAM)
   */
  static validateCascadeHierarchy(
    parentLevel: CascadeLevel,
    childLevel: CascadeLevel
  ): Result<void, string> {
    if (!parentLevel.canCascadeTo(childLevel)) {
      return Result.fail(
        `Cascateamento inválido: ${parentLevel.value} não pode cascatear para ${childLevel.value}. ` +
        `Hierarquia válida: CEO → DIRECTOR → MANAGER → TEAM`
      );
    }
    return Result.ok(undefined);
  }

  /**
   * Calcula a contribuição de uma meta filha para a meta pai
   */
  static calculateContribution(
    childGoal: StrategicGoal,
    parentGoal: StrategicGoal,
    weightInParent: number
  ): Result<CascadeContribution, string> {
    // Validar que child pertence ao parent
    if (childGoal.parentGoalId !== parentGoal.id) {
      return Result.fail('Meta filha não pertence à meta pai especificada');
    }

    // Validar peso
    if (weightInParent < 0 || weightInParent > 100) {
      return Result.fail('Peso deve estar entre 0 e 100');
    }

    // Calcular progresso do filho
    const childProgress = childGoal.progress;

    // Contribuição ponderada
    const progressContribution = (childProgress * weightInParent) / 100;

    return Result.ok({
      childGoalId: childGoal.id,
      parentGoalId: parentGoal.id,
      weightContribution: weightInParent,
      progressContribution,
    });
  }

  /**
   * Agrega progresso bottom-up (das metas filhas para as pais)
   */
  static aggregateProgressBottomUp(
    goals: StrategicGoal[],
    cascadeRelations: Array<{ parentGoalId: string; childGoalId: string; weight: number }>
  ): Result<Map<string, AggregatedProgress>, string> {
    const progressMap = new Map<string, AggregatedProgress>();

    // Inicializar todos os goals
    for (const goal of goals) {
      progressMap.set(goal.id, {
        goalId: goal.id,
        ownProgress: goal.progress,
        childrenProgress: 0,
        totalProgress: goal.progress,
        childCount: 0,
      });
    }

    // Agrupar children por parent
    const childrenByParent = new Map<string, Array<{ childId: string; weight: number }>>();
    for (const relation of cascadeRelations) {
      const existing = childrenByParent.get(relation.parentGoalId) || [];
      existing.push({ childId: relation.childGoalId, weight: relation.weight });
      childrenByParent.set(relation.parentGoalId, existing);
    }

    // Calcular progresso agregado para cada parent
    for (const [parentId, children] of childrenByParent) {
      const parentProgress = progressMap.get(parentId);
      if (!parentProgress) continue;

      let totalChildrenProgress = 0;
      let totalWeight = 0;

      for (const child of children) {
        const childProgress = progressMap.get(child.childId);
        if (childProgress) {
          totalChildrenProgress += (childProgress.totalProgress * child.weight) / 100;
          totalWeight += child.weight;
        }
      }

      // Atualizar parent
      parentProgress.childrenProgress = totalChildrenProgress;
      parentProgress.childCount = children.length;
      
      // Se tem filhos, o progresso total é baseado nos filhos
      if (children.length > 0 && totalWeight > 0) {
        parentProgress.totalProgress = totalChildrenProgress;
      }
    }

    return Result.ok(progressMap);
  }

  /**
   * Valida que a soma dos pesos dos filhos não excede 100%
   */
  static validateChildrenWeights(
    childrenWeights: Array<{ goalId: string; weight: number }>
  ): Result<void, string> {
    const totalWeight = childrenWeights.reduce((sum, c) => sum + c.weight, 0);
    
    if (totalWeight > 100) {
      return Result.fail(
        `Soma dos pesos (${totalWeight}%) excede 100%. Ajuste os pesos das metas filhas.`
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Gera estrutura de árvore para visualização
   */
  static buildCascadeTree(
    goals: StrategicGoal[],
    rootGoalId?: string
  ): Result<CascadeTreeNode[], string> {
    const goalMap = new Map(goals.map(g => [g.id, g]));
    const childrenMap = new Map<string, StrategicGoal[]>();

    // Agrupar filhos por pai
    for (const goal of goals) {
      if (goal.parentGoalId) {
        const siblings = childrenMap.get(goal.parentGoalId) || [];
        siblings.push(goal);
        childrenMap.set(goal.parentGoalId, siblings);
      }
    }

    // Função recursiva para construir árvore
    const buildNode = (goal: StrategicGoal): CascadeTreeNode => {
      const children = childrenMap.get(goal.id) || [];

      return {
        id: goal.id,
        code: goal.code,
        description: goal.description,
        cascadeLevel: goal.cascadeLevel.value,
        progress: Math.round(goal.progress),
        status: goal.status.value,
        statusColor: goal.status.color,
        weight: goal.weight,
        children: children.map(buildNode),
      };
    };

    // Encontrar raízes (goals sem parent ou com parent específico)
    let roots: StrategicGoal[];
    if (rootGoalId) {
      const rootGoal = goalMap.get(rootGoalId);
      if (!rootGoal) {
        return Result.fail('Meta raiz não encontrada');
      }
      roots = [rootGoal];
    } else {
      roots = goals.filter(g => !g.parentGoalId);
    }

    const tree = roots.map(buildNode);
    return Result.ok(tree);
  }

  /**
   * Calcula estatísticas de cascateamento
   */
  static calculateCascadeStats(goals: StrategicGoal[]): {
    totalGoals: number;
    byLevel: Record<string, number>;
    byStatus: Record<string, number>;
    avgProgress: number;
  } {
    const byLevel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalProgress = 0;

    for (const goal of goals) {
      const level = goal.cascadeLevel.value;
      const status = goal.status.value;

      byLevel[level] = (byLevel[level] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;
      totalProgress += goal.progress;
    }

    return {
      totalGoals: goals.length,
      byLevel,
      byStatus,
      avgProgress: goals.length > 0 ? Math.round(totalProgress / goals.length) : 0,
    };
  }
}
