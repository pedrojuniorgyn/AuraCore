/**
 * AG Grid v34.3 - Custom Cell Renderers
 * 
 * Components React modernos para células do AG Grid
 */

import React from "react";
import { ICellRendererParams } from "ag-grid-community";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Edit,
  Trash2,
  Eye,
  Download,
  CreditCard,
} from "lucide-react";
import { getStatusConfig } from "@/lib/utils/status-colors";

/**
 * 💰 Renderizador de Moeda (BRL)
 */
export const CurrencyCellRenderer = (params: ICellRendererParams) => {
  if (params.value == null) return <span className="text-muted-foreground">-</span>;

  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const isNegative = params.value < 0;

  return (
    <span className={`font-medium tabular-nums ${isNegative ? "text-red-400" : "text-emerald-400"}`}>
      {formatter.format(params.value)}
    </span>
  );
};

/**
 * 📅 Renderizador de Data (dd/MM/yyyy)
 */
export const DateCellRenderer = (params: ICellRendererParams) => {
  if (!params.value) return <span className="text-muted-foreground">-</span>;

  try {
    const date = new Date(params.value);
    return (
      <span className="text-sm">
        {format(date, "dd/MM/yyyy", { locale: ptBR })}
      </span>
    );
  } catch {
    return <span className="text-muted-foreground">Data inválida</span>;
  }
};

/**
 * 📅 Renderizador de Data + Hora
 */
export const DateTimeCellRenderer = (params: ICellRendererParams) => {
  if (!params.value) return <span className="text-muted-foreground">-</span>;

  try {
    const date = new Date(params.value);
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {format(date, "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <span className="text-xs text-muted-foreground">
          {format(date, "HH:mm", { locale: ptBR })}
        </span>
      </div>
    );
  } catch {
    return <span className="text-muted-foreground">Data inválida</span>;
  }
};

/**
 * 🎯 Renderizador de Status (Badge Colorida)
 * ATUALIZADO: Usa padronização global de cores
 */
export const StatusCellRenderer = (params: ICellRendererParams) => {
  if (!params.value) return null;

  // Mapa de ícones por status
  const iconMap: Record<string, any> = {
    // Pagamentos
    OPEN: Clock,
    PAID: CheckCircle2,
    OVERDUE: AlertCircle,
    CANCELLED: XCircle,
    PARTIAL: Clock,
    PROCESSING: Clock,
    // NFe
    IMPORTED: CheckCircle2,
    DRAFT: Clock,
    // Genérico
    ACTIVE: CheckCircle2,
    INACTIVE: XCircle,
    BLOCKED: XCircle,
    AVAILABLE: CheckCircle2,
  };

  // Labels customizados
  const labelMap: Record<string, string> = {
    OPEN: "Em Aberto",
    PAID: "Pago",
    OVERDUE: "Vencido",
    CANCELLED: "Cancelado",
    PARTIAL: "Parcial",
    IMPORTED: "Importada",
    DRAFT: "Rascunho",
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    PROCESSING: "Processando",
  };

  const statusConfig = getStatusConfig(params.value, labelMap[params.value]);
  const Icon = iconMap[params.value] || AlertCircle;

  return (
    <Badge variant={statusConfig.variant} className={`flex items-center gap-1.5 ${statusConfig.className}`}>
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  );
};

/**
 * 🏷️ Renderizador de Tipo (Badge)
 */
export const TypeBadgeCellRenderer = (params: ICellRendererParams) => {
  if (!params.value) return null;

  const typeConfig: Record<string, { variant: any; label: string }> = {
    CLIENT: { variant: "default", label: "Cliente" },
    PROVIDER: { variant: "secondary", label: "Fornecedor" },
    BOTH: { variant: "outline", label: "Ambos" },
    INCOME: { variant: "default", label: "Receita" },
    EXPENSE: { variant: "destructive", label: "Despesa" },
  };

  const config = typeConfig[params.value] || {
    variant: "outline",
    label: params.value,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

/**
 * 🔢 Renderizador de CNPJ/CPF
 */
export const DocumentCellRenderer = (params: ICellRendererParams) => {
  if (!params.value) return <span className="text-muted-foreground">-</span>;

  const doc = params.value.replace(/\D/g, "");

  if (doc.length === 11) {
    // CPF: 000.000.000-00
    return (
      <span className="font-mono text-sm">
        {doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
      </span>
    );
  } else if (doc.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return (
      <span className="font-mono text-sm">
        {doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}
      </span>
    );
  }

  return <span className="font-mono text-sm">{params.value}</span>;
};

/**
 * 🎬 Renderizador de Ações (Botões)
 */
interface ActionsCellRendererProps extends ICellRendererParams {
  onView?: (data: any) => void;
  onEdit?: (data: any) => void;
  onDelete?: (data: any) => void;
  onPay?: (data: any) => void;
  onDownload?: (data: any) => void;
}

export const ActionsCellRenderer = (props: ActionsCellRendererProps) => {
  const { data, onView, onEdit, onDelete, onPay, onDownload } = props;

  return (
    <div className="flex items-center gap-1">
      {onView && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(data)}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}

      {onPay && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPay(data)}
          className="h-8 w-8 p-0"
        >
          <CreditCard className="h-4 w-4" />
        </Button>
      )}

      {onEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(data)}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}

      {onDownload && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDownload(data)}
          className="h-8 w-8 p-0"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}

      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(data)}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

/**
 * 📊 Renderizador de Porcentagem
 */
export const PercentageCellRenderer = (params: ICellRendererParams) => {
  if (params.value == null) return <span className="text-muted-foreground">-</span>;

  const percentage = parseFloat(params.value);
  const isPositive = percentage >= 0;

  return (
    <span className={`font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
      {isPositive ? "+" : ""}
      {percentage.toFixed(2)}%
    </span>
  );
};

/**
 * 🔗 Renderizador de Link
 */
interface LinkCellRendererProps extends ICellRendererParams {
  onClick?: (data: any) => void;
}

export const LinkCellRenderer = (props: LinkCellRendererProps) => {
  const { value, data, onClick } = props;

  if (!value) return <span className="text-muted-foreground">-</span>;

  return (
    <button
      onClick={() => onClick?.(data)}
      className="text-primary hover:underline font-medium text-left"
    >
      {value}
    </button>
  );
};

/**
 * ✅ Renderizador de Boolean (Check/X)
 */
export const BooleanCellRenderer = (params: ICellRendererParams) => {
  if (params.value === true) {
    return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  } else if (params.value === false) {
    return <XCircle className="h-5 w-5 text-muted-foreground" />;
  }
  return <span className="text-muted-foreground">-</span>;
};

/**
 * 🏦 Renderizador de Origem (Badge com ícone)
 */
export const OriginCellRenderer = (params: ICellRendererParams) => {
  if (!params.value) return null;

  const originConfig: Record<string, { label: string; variant: any }> = {
    FISCAL_NFE: { label: "NFe Importada", variant: "default" },
    MANUAL: { label: "Lançamento Manual", variant: "outline" },
    SYSTEM: { label: "Sistema", variant: "secondary" },
  };

  const config = originConfig[params.value] || {
    label: params.value,
    variant: "outline",
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};


