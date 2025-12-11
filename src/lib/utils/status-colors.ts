/**
 * 🎨 PADRONIZAÇÃO DE CORES DE STATUS
 * 
 * Cores consistentes para todos os status do sistema
 */

import type { BadgeProps } from "@/components/ui/badge";

export interface StatusConfig {
  variant: BadgeProps["variant"];
  className?: string;
  label?: string;
}

/**
 * Mapa de cores padrão para status comuns
 */
export const STATUS_COLORS: Record<string, StatusConfig> = {
  // Estados Positivos/Ativos (Verde)
  ACTIVE: {
    variant: "default",
    className: "bg-green-500 hover:bg-green-600 text-white",
    label: "Ativo",
  },
  APPROVED: {
    variant: "default",
    className: "bg-green-500 hover:bg-green-600 text-white",
    label: "Aprovado",
  },
  AVAILABLE: {
    variant: "default",
    className: "bg-green-500 hover:bg-green-600 text-white",
    label: "Disponível",
  },
  PAID: {
    variant: "default",
    className: "bg-green-500 hover:bg-green-600 text-white",
    label: "Pago",
  },
  RECEIVED: {
    variant: "default",
    className: "bg-green-500 hover:bg-green-600 text-white",
    label: "Recebido",
  },
  OK: {
    variant: "default",
    className: "bg-green-500 hover:bg-green-600 text-white",
    label: "OK",
  },
  COMPLETED: {
    variant: "default",
    className: "bg-green-500 hover:bg-green-600 text-white",
    label: "Concluído",
  },

  // Estados Neutros/Processando (Azul)
  OPEN: {
    variant: "default",
    className: "bg-blue-500 hover:bg-blue-600 text-white",
    label: "Aberto",
  },
  PENDING: {
    variant: "default",
    className: "bg-blue-500 hover:bg-blue-600 text-white",
    label: "Pendente",
  },
  PROCESSING: {
    variant: "default",
    className: "bg-blue-500 hover:bg-blue-600 text-white",
    label: "Processando",
  },
  IN_TRANSIT: {
    variant: "default",
    className: "bg-blue-500 hover:bg-blue-600 text-white",
    label: "Em Trânsito",
  },

  // Estados de Atenção (Amarelo/Laranja)
  VACATION: {
    variant: "default",
    className: "bg-yellow-500 hover:bg-yellow-600 text-white",
    label: "Férias",
  },
  WARNING: {
    variant: "default",
    className: "bg-yellow-500 hover:bg-yellow-600 text-white",
    label: "Atenção",
  },
  OVERDUE: {
    variant: "default",
    className: "bg-orange-500 hover:bg-orange-600 text-white",
    label: "Vencido",
  },
  MAINTENANCE: {
    variant: "default",
    className: "bg-orange-500 hover:bg-orange-600 text-white",
    label: "Manutenção",
  },

  // Estados Negativos/Bloqueados (Vermelho)
  BLOCKED: {
    variant: "destructive",
    className: "bg-red-500 hover:bg-red-600 text-white",
    label: "Bloqueado",
  },
  CANCELLED: {
    variant: "destructive",
    className: "bg-red-500 hover:bg-red-600 text-white",
    label: "Cancelado",
  },
  INACTIVE: {
    variant: "destructive",
    className: "bg-red-500 hover:bg-red-600 text-white",
    label: "Inativo",
  },
  EXPIRED: {
    variant: "destructive",
    className: "bg-red-500 hover:bg-red-600 text-white",
    label: "Expirado",
  },
  REJECTED: {
    variant: "destructive",
    className: "bg-red-500 hover:bg-red-600 text-white",
    label: "Rejeitado",
  },
  FAILED: {
    variant: "destructive",
    className: "bg-red-500 hover:bg-red-600 text-white",
    label: "Falhou",
  },
  CRITICAL: {
    variant: "destructive",
    className: "bg-red-500 hover:bg-red-600 text-white",
    label: "Crítico",
  },

  // Estados Especiais
  DRAFT: {
    variant: "secondary",
    className: "bg-gray-500 hover:bg-gray-600 text-white",
    label: "Rascunho",
  },
  ARCHIVED: {
    variant: "secondary",
    className: "bg-gray-500 hover:bg-gray-600 text-white",
    label: "Arquivado",
  },
};

/**
 * Obtém configuração de cor para um status
 */
export function getStatusConfig(status: string, customLabel?: string): StatusConfig {
  const config = STATUS_COLORS[status.toUpperCase()];
  
  if (!config) {
    // Fallback para status desconhecido
    return {
      variant: "outline",
      className: "bg-gray-500 hover:bg-gray-600 text-white",
      label: customLabel || status,
    };
  }

  return {
    ...config,
    label: customLabel || config.label,
  };
}










