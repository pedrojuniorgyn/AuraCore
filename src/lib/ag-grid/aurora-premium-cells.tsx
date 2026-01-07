/**
 * 🌟 AURORA PREMIUM CELL RENDERERS
 * 
 * Componentes ultra-modernos para células do AG Grid
 */

import React from "react";
import { ICellRendererParams } from "ag-grid-community";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  XCircle,
  FileText,
  Eye,
  Edit,
  Trash2,
  Download
} from "lucide-react";

/**
 * 💎 Status Cell com gradiente Aurora e glow
 */
export function PremiumStatusCell(props: ICellRendererParams) {
  const statusConfig: Record<string, {
    label: string;
    gradient: string;
    textColor: string;
    icon: unknown;
    glow: string;
    pulse?: boolean;
  }> = {
    PAID: {
      label: "Pago",
      gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.25) 100%)",
      textColor: "#6EE7B7",
      icon: CheckCircle2,
      glow: "0 0 20px rgba(16, 185, 129, 0.3)",
    },
    PENDING: {
      label: "Pendente",
      gradient: "linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(245, 158, 11, 0.25) 100%)",
      textColor: "#FCD34D",
      icon: Clock,
      glow: "0 0 20px rgba(251, 191, 36, 0.3)",
    },
    OVERDUE: {
      label: "Vencido",
      gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.25) 100%)",
      textColor: "#FCA5A5",
      icon: AlertCircle,
      glow: "0 0 20px rgba(239, 68, 68, 0.4)",
      pulse: true,
    },
    PARTIAL: {
      label: "Parcial",
      gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.25) 100%)",
      textColor: "#93C5FD",
      icon: FileText,
      glow: "0 0 20px rgba(59, 130, 246, 0.3)",
    },
  };

  const config = statusConfig[props.value] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <div
      style={{
        background: config.gradient,
        border: `1px solid ${config.textColor}40`,
        borderRadius: "12px",
        padding: "6px 14px",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        color: config.textColor,
        boxShadow: config.glow,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        animation: config.pulse ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
        e.currentTarget.style.boxShadow = `0 10px 20px -3px ${config.textColor}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = config.glow;
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </div>
  );
}

/**
 * 💰 Currency Cell com gradiente e animação
 */
export function PremiumCurrencyCell(props: ICellRendererParams) {
  const value = parseFloat(props.value || "0");
  const isPositive = value >= 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontWeight: 700,
        fontSize: "14px",
        background: isPositive 
          ? "linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%)"
          : "linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%)",
        padding: "4px 12px",
        borderRadius: "8px",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)";
        e.currentTarget.style.boxShadow = isPositive
          ? "0 0 15px rgba(16, 185, 129, 0.3)"
          : "0 0 15px rgba(239, 68, 68, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <DollarSign 
        className="h-4 w-4" 
        style={{ color: isPositive ? "#6EE7B7" : "#FCA5A5" }}
      />
      <span
        style={{
          background: isPositive
            ? "linear-gradient(135deg, #6EE7B7 0%, #10B981 100%)"
            : "linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

/**
 * 📅 Date Cell com badge premium
 */
export function PremiumDateCell(props: ICellRendererParams) {
  if (!props.value) return <span className="text-slate-500">-</span>;

  const date = new Date(props.value);
  const today = new Date();
  const isOverdue = date < today;
  const isToday = date.toDateString() === today.toDateString();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 12px",
        borderRadius: "8px",
        background: isOverdue 
          ? "rgba(239, 68, 68, 0.1)"
          : isToday 
          ? "rgba(251, 191, 36, 0.1)"
          : "rgba(139, 92, 246, 0.05)",
        border: `1px solid ${isOverdue ? "#EF444440" : isToday ? "#FBBF2440" : "#8B5CF640"}`,
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = isOverdue
          ? "0 0 15px rgba(239, 68, 68, 0.3)"
          : isToday
          ? "0 0 15px rgba(251, 191, 36, 0.3)"
          : "0 0 15px rgba(139, 92, 246, 0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: isOverdue ? "#FCA5A5" : isToday ? "#FCD34D" : "#E2E8F0",
        }}
      >
        {date.toLocaleDateString("pt-BR")}
      </span>
      {isOverdue && (
        <span
          style={{
            fontSize: "9px",
            padding: "2px 6px",
            borderRadius: "6px",
            background: "rgba(239, 68, 68, 0.2)",
            color: "#FCA5A5",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Atrasado
        </span>
      )}
      {isToday && (
        <span
          style={{
            fontSize: "9px",
            padding: "2px 6px",
            borderRadius: "6px",
            background: "rgba(251, 191, 36, 0.2)",
            color: "#FCD34D",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        >
          Hoje
        </span>
      )}
    </div>
  );
}

/**
 * ⚡ Action Buttons Premium com hover effects
 */
export function PremiumActionCell(props: ICellRendererParams) {
  const buttonStyle = {
    padding: "6px",
    borderRadius: "8px",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    background: "rgba(139, 92, 246, 0.1)",
    color: "#A78BFA",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, color: string) => {
    e.currentTarget.style.background = `${color}20`;
    e.currentTarget.style.borderColor = `${color}60`;
    e.currentTarget.style.color = color;
    e.currentTarget.style.transform = "translateY(-2px) scale(1.1)";
    e.currentTarget.style.boxShadow = `0 4px 12px ${color}40`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)";
    e.currentTarget.style.color = "#A78BFA";
    e.currentTarget.style.transform = "translateY(0) scale(1)";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center", height: "100%" }}>
      <button
        style={buttonStyle}
        title="Visualizar"
        onMouseEnter={(e) => handleMouseEnter(e, "#06B6D4")}
        onMouseLeave={handleMouseLeave}
        onClick={() => alert(`Ver #${props.data.id}`)}
      >
        <Eye className="h-4 w-4" />
      </button>
      
      <button
        style={buttonStyle}
        title="Editar"
        onMouseEnter={(e) => handleMouseEnter(e, "#8B5CF6")}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          // Chama handler customizado se fornecido via context
          if (props.context?.onEdit) {
            props.context.onEdit(props.data);
          } else {
            alert(`Editar #${props.data.id} - Configure onEdit no context do AG Grid`);
          }
        }}
      >
        <Edit className="h-4 w-4" />
      </button>
      
      <button
        style={buttonStyle}
        title="Download"
        onMouseEnter={(e) => handleMouseEnter(e, "#10B981")}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          if (props.context?.onDownload) {
            props.context.onDownload(props.data);
          } else {
            alert(`Download #${props.data.id}`);
          }
        }}
      >
        <Download className="h-4 w-4" />
      </button>
      
      <button
        style={buttonStyle}
        title="Excluir"
        onMouseEnter={(e) => handleMouseEnter(e, "#EF4444")}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          if (confirm("Tem certeza que deseja excluir este registro?")) {
            // Chama handler customizado se fornecido via context
            if (props.context?.onDelete) {
              props.context.onDelete(props.data.id, props.data);
            } else {
              alert(`Excluir #${props.data.id} - Configure onDelete no context do AG Grid`);
            }
          }
        }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * 📊 Document Number Cell com badge
 */
export function PremiumDocumentCell(props: ICellRendererParams) {
  if (!props.value) return <span className="text-slate-500">-</span>;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        borderRadius: "10px",
        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)",
        border: "1px solid rgba(139, 92, 246, 0.3)",
        fontFamily: "monospace",
        fontSize: "13px",
        fontWeight: 600,
        color: "#C4B5FD",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)";
        e.currentTarget.style.boxShadow = "0 0 20px rgba(139, 92, 246, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <FileText className="h-3.5 w-3.5" style={{ color: "#A78BFA" }} />
      {props.value}
    </div>
  );
}

/**
 * 🏢 Partner Name Cell com hover effect
 */
export function PremiumPartnerCell(props: ICellRendererParams) {
  if (!props.value) return <span className="text-slate-500">-</span>;

  return (
    <div
      style={{
        fontWeight: 600,
        color: "#E2E8F0",
        transition: "all 0.3s ease",
        padding: "4px 8px",
        borderRadius: "6px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#C4B5FD";
        e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
        e.currentTarget.style.transform = "translateX(4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#E2E8F0";
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      {props.value}
    </div>
  );
}

/**
 * 📈 Origin Badge Cell (para identificar origem do registro)
 */
export function PremiumOriginCell(props: ICellRendererParams) {
  const originConfig: Record<string, {
    label: string;
    gradient: string;
    icon: unknown;
  }> = {
    NFE: {
      label: "NFe",
      gradient: "linear-gradient(135deg, #8B5CF6, #EC4899)",
      icon: FileText,
    },
    CTE: {
      label: "CTe",
      gradient: "linear-gradient(135deg, #06B6D4, #3B82F6)",
      icon: FileText,
    },
    MANUAL: {
      label: "Manual",
      gradient: "linear-gradient(135deg, #10B981, #14B8A6)",
      icon: Edit,
    },
  };

  const config = originConfig[props.value] || originConfig.MANUAL;
  const Icon = config.icon;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "8px",
        background: config.gradient,
        fontSize: "11px",
        fontWeight: 700,
        color: "#FFF",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px) scale(1.08)";
        e.currentTarget.style.boxShadow = "0 8px 15px -3px rgba(139, 92, 246, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.3)";
      }}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </div>
  );
}

/**
 * 🎯 Percentage Cell com indicator visual
 */
export function PremiumPercentageCell(props: ICellRendererParams) {
  const value = parseFloat(props.value || "0");
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <Icon 
        className="h-4 w-4" 
        style={{ color: isPositive ? "#6EE7B7" : "#FCA5A5" }}
      />
      <span
        style={{
          fontWeight: 700,
          fontSize: "13px",
          background: isPositive
            ? "linear-gradient(135deg, #6EE7B7 0%, #10B981 100%)"
            : "linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

