/**
 * Component: ApprovalActionDialog
 * Modal para aprovar ou rejeitar estratégias
 * 
 * @module app/(dashboard)/strategic/approvals/components
 */
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

// Schema unificado para todos os tipos de ação
const actionSchema = z.object({
  content: z.string().optional(),
});

// Schema com validação de mínimo para rejeição
const rejectSchema = z.object({
  content: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
});

type FormData = { content?: string };

interface ApprovalActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  strategyId: string;
  strategyTitle: string;
  actionType: 'approve' | 'reject' | 'requestChanges';
  onSuccess: () => void;
}

export function ApprovalActionDialog({
  isOpen,
  onClose,
  strategyId,
  strategyTitle,
  actionType,
  onSuccess,
}: ApprovalActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isApprove = actionType === 'approve';
  const isReject = actionType === 'reject';
  const isRequestChanges = actionType === 'requestChanges';

  const needsReason = isReject || isRequestChanges;
  const schema = needsReason ? rejectSchema : actionSchema;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Usar a API de workflow existente
      const action = isApprove ? 'approve' : isReject ? 'reject' : 'requestChanges';
      const response = await fetch(`/api/strategic/strategies/${strategyId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: 1, // TODO: Pegar do contexto de autenticação
          ...(needsReason && data.content && { reason: data.content }),
          ...(!needsReason && data.content && { comments: data.content }),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao processar decisão');
      }

      const successMessage = isApprove 
        ? 'Estratégia aprovada com sucesso!' 
        : isReject 
          ? 'Estratégia rejeitada' 
          : 'Alterações solicitadas';

      toast.success(successMessage, {
        description: isApprove
          ? 'O solicitante foi notificado.'
          : 'O motivo foi registrado e o solicitante notificado.',
      });

      reset();
      onSuccess();
    } catch (error) {
      toast.error('Erro ao processar decisão', {
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  const getTitle = () => {
    if (isApprove) return 'Aprovar Estratégia';
    if (isReject) return 'Rejeitar Estratégia';
    return 'Solicitar Alterações';
  };

  const getIcon = () => {
    if (isApprove) return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    if (isReject) return <XCircle className="w-5 h-5 text-red-400" />;
    return <RefreshCw className="w-5 h-5 text-yellow-400" />;
  };

  const getButtonClass = () => {
    if (isApprove) return 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400';
    if (isReject) return 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400';
    return 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400';
  };

  const getButtonLabel = () => {
    if (isApprove) return 'Aprovar';
    if (isReject) return 'Rejeitar';
    return 'Solicitar Alterações';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-100">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {strategyTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label 
              htmlFor="content"
              className="text-gray-200"
            >
              {needsReason ? 'Motivo *' : 'Comentário (opcional)'}
            </Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder={
                isApprove
                  ? 'Adicione um comentário sobre a aprovação...'
                  : isReject
                    ? 'Explique o motivo da rejeição...'
                    : 'Descreva as alterações necessárias...'
              }
              rows={4}
              disabled={isSubmitting}
              className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
            />
            {errors.content && (
              <p className="text-sm text-red-400">
                {errors.content.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={getButtonClass()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {getIcon()}
                  <span className="ml-2">{getButtonLabel()}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
