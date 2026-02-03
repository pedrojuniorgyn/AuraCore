/**
 * Component: ApprovalActionsForm
 * Formulário para ações de aprovação de estratégias
 * 
 * @module components/strategic
 */
"use client";

import { useState } from 'react';
import { Card, Title, Text, Textarea } from '@tremor/react';
import { CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/tenant-context';

export interface ApprovalActionsFormProps {
  strategyId: string;
  strategyName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type ApprovalAction = 'approve' | 'reject' | 'requestChanges' | null;

export const ApprovalActionsForm: React.FC<ApprovalActionsFormProps> = ({
  strategyId,
  strategyName,
  onSuccess,
  onError,
}) => {
  const { user } = useTenant();
  const [selectedAction, setSelectedAction] = useState<ApprovalAction>(null);
  const [comments, setComments] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAction) return;

    // Validar motivo obrigatório para reject/requestChanges
    if ((selectedAction === 'reject' || selectedAction === 'requestChanges') && !reason.trim()) {
      onError?.('Motivo é obrigatório para rejeitar ou solicitar alterações');
      return;
    }

    setIsSubmitting(true);

    // Validar user
    if (!user?.id) {
      onError?.('Usuário não autenticado');
      setIsSubmitting(false);
      return;
    }

    const userId = parseInt(user.id, 10);
    if (isNaN(userId)) {
      onError?.('ID de usuário inválido');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/strategic/strategies/${strategyId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          userId,
          comments: comments.trim() || undefined,
          reason: reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar ação');
      }

      onSuccess?.();
      
      // Reset form
      setSelectedAction(null);
      setComments('');
      setReason('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedAction(null);
    setComments('');
    setReason('');
  };

  const getActionLabel = (action: ApprovalAction): string => {
    switch (action) {
      case 'approve':
        return 'Aprovar';
      case 'reject':
        return 'Rejeitar';
      case 'requestChanges':
        return 'Solicitar Alterações';
      default:
        return '';
    }
  };

  const getActionColor = (action: ApprovalAction): "success" | "destructive" | "warning" => {
    switch (action) {
      case 'approve':
        return 'success';
      case 'reject':
        return 'destructive';
      case 'requestChanges':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <Title>Ações de Aprovação</Title>
          <Text className="mt-1">
            Estratégia: <strong>{strategyName}</strong>
          </Text>
        </div>

        {!selectedAction ? (
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setSelectedAction('approve')}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              Aprovar
            </Button>
            <Button
              onClick={() => setSelectedAction('reject')}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Rejeitar
            </Button>
            <Button
              onClick={() => setSelectedAction('requestChanges')}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700"
            >
              <RefreshCw className="h-4 w-4" />
              Solicitar Alterações
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={getActionColor(selectedAction)}>
                {getActionLabel(selectedAction)}
              </Badge>
              <Text className="text-sm text-gray-500">Ação selecionada</Text>
            </div>

            {selectedAction === 'approve' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentários (opcional)
                </label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Adicione comentários sobre a aprovação..."
                  rows={4}
                />
              </div>
            )}

            {(selectedAction === 'reject' || selectedAction === 'requestChanges') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    selectedAction === 'reject'
                      ? 'Explique o motivo da rejeição...'
                      : 'Descreva as alterações necessárias...'
                  }
                  rows={4}
                  required
                />
                {reason.trim() === '' && (
                  <Text className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Campo obrigatório
                  </Text>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (selectedAction !== 'approve' && !reason.trim())}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Processando...' : `Confirmar ${getActionLabel(selectedAction)}`}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
