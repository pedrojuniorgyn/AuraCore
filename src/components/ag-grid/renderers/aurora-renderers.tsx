/**
 * 🎨 AURORA AG GRID RENDERERS
 * Cell Renderers personalizados para AG Grid Enterprise
 * Design System Aurora
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import {  
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Trash2
} from "lucide-react";

/**
 * Variance Cell Renderer (Variação %)
 * Mostra seta e cor de acordo com variação
 */
export const VarianceCellRenderer = (params: any) => {
  if (!params.value && params.value !== 0) return null;
  
  const value = parseFloat(params.value);
  const isPositive = value >= 0;
  
  return (
    <div className="flex items-center gap-2">
      {isPositive ? (
        <>
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-green-500 font-bold">
            +{value.toFixed(2)}%
          </span>
        </>
      ) : (
        <>
          <TrendingDown className="w-4 h-4 text-red-500" />
          <span className="text-red-500 font-bold">
            {value.toFixed(2)}%
          </span>
        </>
      )}
    </div>
  );
};

/**
 * Account Code Cell Renderer
 * Mostra código da conta com badge Aurora
 */
export const AccountCodeCellRenderer = (params: any) => {
  if (!params.value) return null;
  
  return (
    <Badge className="aurora-badge bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-300 border-purple-500/30">
      {params.value}
    </Badge>
  );
};

/**
 * Status Cell Renderer
 * Badges coloridos com ícones
 */
export const StatusCellRenderer = (params: any) => {
  if (!params.value) return null;
  
  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    SUCCESS: { 
      color: "bg-green-500/20 text-green-400 border-green-500/30", 
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: "Sucesso"
    },
    PENDING: { 
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", 
      icon: <Clock className="w-3 h-3" />,
      label: "Pendente"
    },
    ERROR: { 
      color: "bg-red-500/20 text-red-400 border-red-500/30", 
      icon: <AlertCircle className="w-3 h-3" />,
      label: "Erro"
    },
    POSTED: { 
      color: "bg-green-500/20 text-green-400 border-green-500/30", 
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: "Lançado"
    },
    DRAFT: { 
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30", 
      icon: <Clock className="w-3 h-3" />,
      label: "Rascunho"
    },
    ACTIVE: { 
      color: "bg-green-500/20 text-green-400 border-green-500/30", 
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: "Ativo"
    },
    INACTIVE: { 
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30", 
      icon: <AlertCircle className="w-3 h-3" />,
      label: "Inativo"
    }
  };
  
  const config = statusConfig[params.value] || statusConfig.PENDING;
  
  return (
    <div className="flex items-center gap-2">
      <Badge className={`flex items-center gap-1 ${config.color}`}>
        {config.icon}
        {config.label}
      </Badge>
    </div>
  );
};

/**
 * Type Cell Renderer (Tipo de Conta)
 */
export const TypeCellRenderer = (params: any) => {
  if (!params.value) return null;
  
  const typeConfig: Record<string, { color: string; label: string }> = {
    REVENUE: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Receita" },
    COST: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Custo" },
    EXPENSE: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "Despesa" },
    ASSET: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Ativo" },
    LIABILITY: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Passivo" },
    ANALYTIC: { color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", label: "Analítica" },
    SYNTHETIC: { color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", label: "Sintética" }
  };
  
  const config = typeConfig[params.value] || { color: "bg-gray-500/20 text-gray-400", label: params.value };
  
  return (
    <Badge className={config.color}>
      {config.label}
    </Badge>
  );
};

/**
 * Boolean Cell Renderer (Sim/Não)
 */
export const BooleanCellRenderer = (params: any) => {
  const value = params.value === true || params.value === 1 || params.value === '1' || params.value === 'true';
  
  return (
    <Badge className={value ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
      {value ? "Sim" : "Não"}
    </Badge>
  );
};

/**
 * Allocation Rule Cell Renderer
 */
export const AllocationRuleCellRenderer = (params: any) => {
  if (!params.value) return <span className="text-gray-500">-</span>;
  
  const ruleConfig: Record<string, { color: string; label: string }> = {
    KM_DRIVEN: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Por KM" },
    REVENUE_BASED: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Por Receita" },
    FIXED: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Fixo" },
    MANUAL: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Manual" }
  };
  
  const config = ruleConfig[params.value] || { color: "bg-gray-500/20", label: params.value };
  
  return (
    <Badge className={config.color}>
      {config.label}
    </Badge>
  );
};

/**
 * Allocation Base Cell Renderer
 */
export const AllocationBaseCellRenderer = (params: any) => {
  if (!params.value) return <span className="text-gray-500">-</span>;
  
  const baseConfig: Record<string, string> = {
    TOTAL_KM: "Total de KM",
    GROSS_REVENUE: "Receita Bruta",
    HEADCOUNT: "Nº Funcionários"
  };
  
  return (
    <span className="text-gray-300">
      {baseConfig[params.value] || params.value}
    </span>
  );
};

/**
 * Action Cell Renderer (Botões de Ação)
 */
export const ActionCellRenderer = (params: any) => {
  const handleView = () => {
    if (params.onView) params.onView(params.data);
  };
  
  const handleEdit = () => {
    if (params.onEdit) params.onEdit(params.data);
  };
  
  const handleDelete = () => {
    if (params.onDelete) params.onDelete(params.data);
  };
  
  return (
    <div className="flex items-center gap-2">
      {params.onView && (
        <button
          onClick={handleView}
          className="p-1.5 hover:bg-blue-500/20 rounded transition-colors"
          title="Visualizar"
        >
          <Eye className="w-4 h-4 text-blue-400" />
        </button>
      )}
      {params.onEdit && (
        <button
          onClick={handleEdit}
          className="p-1.5 hover:bg-purple-500/20 rounded transition-colors"
          title="Editar"
        >
          <Edit className="w-4 h-4 text-purple-400" />
        </button>
      )}
      {params.onDelete && (
        <button
          onClick={handleDelete}
          className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      )}
    </div>
  );
};

/**
 * Currency Formatter
 */
export const currencyFormatter = (params: any) => {
  if (!params.value && params.value !== 0) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(params.value);
};

/**
 * Date Formatter
 */
export const dateFormatter = (params: any) => {
  if (!params.value) return '-';
  
  return new Date(params.value).toLocaleDateString('pt-BR');
};

/**
 * DateTime Formatter
 */
export const dateTimeFormatter = (params: any) => {
  if (!params.value) return '-';
  
  return new Date(params.value).toLocaleString('pt-BR');
};

/**
 * Number Formatter
 */
export const numberFormatter = (params: any) => {
  if (!params.value && params.value !== 0) return '0';
  
  return new Intl.NumberFormat('pt-BR').format(params.value);
};

/**
 * File Size Formatter
 */
export const fileSizeFormatter = (params: any) => {
  if (!params.value) return '-';
  
  const bytes = params.value;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};


















