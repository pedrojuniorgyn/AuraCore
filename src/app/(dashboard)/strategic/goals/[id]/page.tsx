'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Target, TrendingUp, Calendar, Edit, Save, X } from 'lucide-react';
import { fetchAPI, APIResponseError } from '@/lib/api/fetch-client';
import { DeleteResourceButton } from '@/components/strategic/DeleteResourceButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface GoalDetail {
  id: string;
  code: string;
  description: string;
  cascadeLevel: string;
  targetValue: number | null;
  currentValue: number | null;
  baselineValue: number | null;
  unit: string | null;
  polarity: string;
  weight: number | null;
  ownerUserId: number | null;
  ownerBranchId: number | null;
  status: string;
  statusLabel: string;
  statusColor: string;
  progress: number;
  startDate: string;
  dueDate: string;
  perspectiveId: string;
  parentGoalId: string | null;
}

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ BUG-001: Estados de edição
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedGoal, setEditedGoal] = useState<GoalDetail | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!params?.id) {
        setError('Invalid Goal id');
        setGoal(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAPI<GoalDetail>(`/api/strategic/goals/${params.id}`);
        setGoal(data);
        setEditedGoal(data); // ✅ Sincronizar editedGoal
      } catch (err) {
        if (err instanceof APIResponseError) {
          setError(err.data?.error ?? err.message);
        } else {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params?.id]);

  const goBack = () => router.push('/strategic/goals');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // ✅ BUG-001: Função de salvar
  const handleSave = async () => {
    if (!editedGoal || !params?.id) return;

    // Validação
    if (!editedGoal.description?.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }

    setIsSaving(true);
    try {
      await fetchAPI(`/api/strategic/goals/${params.id}`, {
        method: 'PUT',
        body: {
          description: editedGoal.description,
          targetValue: editedGoal.targetValue,
          currentValue: editedGoal.currentValue,
          baselineValue: editedGoal.baselineValue,
          unit: editedGoal.unit,
          weight: editedGoal.weight,
          polarity: editedGoal.polarity,
          dueDate: editedGoal.dueDate,
        },
      });

      toast.success('Meta atualizada com sucesso!');
      setIsEditing(false);

      // Recarregar dados
      const updated = await fetchAPI<GoalDetail>(`/api/strategic/goals/${params.id}`);
      setGoal(updated);
      setEditedGoal(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar meta');
      console.error('[Goal Save Error]', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ BUG-001: Função de cancelar
  const handleCancel = () => {
    setEditedGoal(goal);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen -m-6 p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} className="text-white/70" />
          </button>
          <div>
            <p className="text-sm text-white/50">Meta Estratégica</p>
            <h1 className="text-2xl font-semibold text-white">
              {isEditing ? 'Editar Meta' : 'Detalhe da Meta'}
            </h1>
          </div>
        </div>
        
        {/* ✅ BUG-001: Botões de Editar/Salvar/Cancelar */}
        {goal && (
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 border-white/10"
                >
                  <Edit size={16} />
                  Editar
                </Button>
                <DeleteResourceButton
                  id={goal.id}
                  resourceType="goals"
                  redirectTo="/strategic/goals"
                  resourceName={goal.description}
                />
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2 border-white/10"
                >
                  <X size={16} />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <Save size={16} />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/70">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando meta...</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && goal && editedGoal && (
        <div className="space-y-4">
          {/* ✅ BUG-001: Indicador de modo edição */}
          {isEditing && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <p className="text-sm text-blue-200 flex items-center gap-2">
                <Edit size={14} />
                Modo de edição ativo. Faça as alterações e clique em &quot;Salvar&quot;.
              </p>
            </div>
          )}

          {/* Card Principal */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-white/70" />
                  <p className="text-sm text-white/50">Código</p>
                </div>
                <p className="text-2xl text-white font-semibold">{goal.code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/50">Status</p>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: goal.statusColor || '#888' }}
                  />
                  <p className="text-lg text-white font-semibold">{goal.statusLabel}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-white/50 mb-1">Descrição *</p>
              {!isEditing ? (
                <p className="text-white">{goal.description}</p>
              ) : (
                <Textarea
                  value={editedGoal.description}
                  onChange={(e) => setEditedGoal({
                    ...editedGoal,
                    description: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Descreva a meta estratégica..."
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-sm text-white/50">Nível de Cascata</p>
                <p className="text-white font-medium">{goal.cascadeLevel}</p>
              </div>
              <div>
                <p className="text-sm text-white/50">Peso</p>
                {!isEditing ? (
                  <p className="text-white font-medium">{goal.weight ?? '—'}%</p>
                ) : (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editedGoal.weight ?? ''}
                    onChange={(e) => setEditedGoal({
                      ...editedGoal,
                      weight: e.target.value ? Number(e.target.value) : null
                    })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0-100"
                  />
                )}
              </div>
              <div>
                <p className="text-sm text-white/50">Polaridade</p>
                {!isEditing ? (
                  <p className="text-white font-medium">{goal.polarity}</p>
                ) : (
                  <select
                    value={editedGoal.polarity}
                    onChange={(e) => setEditedGoal({
                      ...editedGoal,
                      polarity: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="POSITIVE">Positiva (↑ melhor)</option>
                    <option value="NEGATIVE">Negativa (↓ melhor)</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Card de Progresso */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-white/70" />
              <h2 className="text-lg font-semibold text-white">Progresso</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-white/50">Progresso Atual</p>
                <p className="text-2xl text-white font-bold">{goal.progress.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-white/50">Valor Atual</p>
                {!isEditing ? (
                  <p className="text-xl text-white font-semibold">
                    {goal.currentValue ?? '—'}
                    {goal.unit && <span className="text-sm text-white/50 ml-1">{goal.unit}</span>}
                  </p>
                ) : (
                  <Input
                    type="number"
                    value={editedGoal.currentValue ?? ''}
                    onChange={(e) => setEditedGoal({
                      ...editedGoal,
                      currentValue: e.target.value ? Number(e.target.value) : null
                    })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Valor atual"
                  />
                )}
              </div>
              <div>
                <p className="text-sm text-white/50">Valor Alvo</p>
                {!isEditing ? (
                  <p className="text-xl text-white font-semibold">
                    {goal.targetValue ?? '—'}
                    {goal.unit && <span className="text-sm text-white/50 ml-1">{goal.unit}</span>}
                  </p>
                ) : (
                  <Input
                    type="number"
                    value={editedGoal.targetValue ?? ''}
                    onChange={(e) => setEditedGoal({
                      ...editedGoal,
                      targetValue: e.target.value ? Number(e.target.value) : null
                    })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Valor alvo"
                  />
                )}
              </div>
              <div>
                <p className="text-sm text-white/50">Linha de Base</p>
                {!isEditing ? (
                  <p className="text-xl text-white font-semibold">
                    {goal.baselineValue ?? '—'}
                    {goal.unit && <span className="text-sm text-white/50 ml-1">{goal.unit}</span>}
                  </p>
                ) : (
                  <Input
                    type="number"
                    value={editedGoal.baselineValue ?? ''}
                    onChange={(e) => setEditedGoal({
                      ...editedGoal,
                      baselineValue: e.target.value ? Number(e.target.value) : null
                    })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Linha de base"
                  />
                )}
              </div>
            </div>

            {/* ✅ BUG-001: Campo de Unidade editável */}
            {isEditing && (
              <div>
                <p className="text-sm text-white/50 mb-1">Unidade de Medida</p>
                <Input
                  type="text"
                  value={editedGoal.unit ?? ''}
                  onChange={(e) => setEditedGoal({
                    ...editedGoal,
                    unit: e.target.value || null
                  })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: km, R$, %, unidades..."
                  maxLength={20}
                />
              </div>
            )}

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                style={{ width: `${Math.min(Math.max(goal.progress, 0), 100)}%` }}
              />
            </div>
          </div>

          {/* Card de Datas */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-white/70" />
              <h2 className="text-lg font-semibold text-white">Período</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/50">Data de Início</p>
                <p className="text-white font-medium">{formatDate(goal.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-white/50">Data de Término</p>
                {!isEditing ? (
                  <p className="text-white font-medium">{formatDate(goal.dueDate)}</p>
                ) : (
                  <Input
                    type="date"
                    value={editedGoal.dueDate?.split('T')[0] || ''}
                    onChange={(e) => setEditedGoal({
                      ...editedGoal,
                      dueDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : goal.dueDate
                    })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Card de IDs (para debug/referência) */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <details className="text-white/70">
              <summary className="cursor-pointer text-sm font-medium text-white/50 hover:text-white/70">
                IDs e Referências
              </summary>
              <div className="mt-3 space-y-2 text-xs font-mono">
                <div><span className="text-white/50">Goal ID:</span> {goal.id}</div>
                <div><span className="text-white/50">Perspective ID:</span> {goal.perspectiveId}</div>
                {goal.parentGoalId && (
                  <div><span className="text-white/50">Parent Goal ID:</span> {goal.parentGoalId}</div>
                )}
                {goal.ownerUserId && (
                  <div><span className="text-white/50">Owner User ID:</span> {goal.ownerUserId}</div>
                )}
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
