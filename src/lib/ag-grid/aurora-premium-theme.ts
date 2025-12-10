/**
 * 🌟 AURORA PREMIUM GRID THEME
 * 
 * Grid ultra-moderno com glassmorphism, gradientes e animações
 * Baseado no Design System Aurora
 */

import { type ThemeOptions } from "ag-grid-community";

export const auraThemePremium: ThemeOptions = {
  theme: "quartz",
  accentColor: "#8B5CF6", // Aurora Purple
  backgroundColor: "rgba(15, 23, 42, 0.6)", // Slate 900 translúcido
  foregroundColor: "#E2E8F0", // Slate 200
  borderColor: "rgba(139, 92, 246, 0.2)", // Purple border
  
  // Cabeçalhos com Glassmorphism
  headerBackgroundColor: "rgba(30, 41, 59, 0.8)", // Glassmorphism
  headerForegroundColor: "#F1F5F9", // Slate 100
  headerFontWeight: 600,
  headerFontSize: 13,
  headerCellHoverBackgroundColor: "rgba(139, 92, 246, 0.15)", // Purple hover
  headerCellMovingBackgroundColor: "rgba(139, 92, 246, 0.3)",
  
  // Linhas com efeito premium
  rowBackgroundColor: "rgba(30, 41, 59, 0.4)",
  oddRowBackgroundColor: "rgba(30, 41, 59, 0.3)",
  rowHoverBackgroundColor: "rgba(139, 92, 246, 0.1)", // Purple hover
  selectedRowBackgroundColor: "rgba(139, 92, 246, 0.2)",
  
  // Bordas com gradiente Aurora
  borderRadius: 12,
  wrapperBorderRadius: 16,
  wrapperBorder: true,
  
  // Fontes modernas
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 13,
  
  // Espaçamento premium
  cellHorizontalPadding: 16,
  rowHeight: 52,
  headerHeight: 56,
  
  // Inputs com glassmorphism
  inputBackgroundColor: "rgba(30, 41, 59, 0.6)",
  inputBorderColor: "rgba(139, 92, 246, 0.3)",
  inputFocusBorderColor: "#8B5CF6",
  inputFocusShadow: "0 0 0 3px rgba(139, 92, 246, 0.1)",
  
  // Sidebar premium
  sideBarBackgroundColor: "rgba(15, 23, 42, 0.8)",
  
  // Paginação moderna
  buttonBackgroundColor: "rgba(139, 92, 246, 0.1)",
  buttonTextColor: "#E2E8F0",
  buttonHoverBackgroundColor: "rgba(139, 92, 246, 0.2)",
  
  // Checkbox com Aurora colors
  checkboxCheckedBackgroundColor: "#8B5CF6",
  checkboxCheckedBorderColor: "#8B5CF6",
  checkboxUncheckedBackgroundColor: "rgba(30, 41, 59, 0.6)",
  checkboxIndeterminateBackgroundColor: "#A78BFA", // Purple 400
  
  // Range Selection premium
  rangeSelectionBackgroundColor: "rgba(139, 92, 246, 0.15)",
  rangeSelectionBorderColor: "#8B5CF6",
  
  // Menus e dropdowns
  menuBackgroundColor: "rgba(30, 41, 59, 0.95)",
  menuBorderColor: "rgba(139, 92, 246, 0.3)",
  menuShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(139, 92, 246, 0.2)",
  
  // Tooltips premium
  tooltipBackgroundColor: "rgba(15, 23, 42, 0.95)",
  tooltipBorderColor: "rgba(139, 92, 246, 0.5)",
  tooltipTextColor: "#F1F5F9",
  
  // Spacing moderno
  spacing: 8,
  gridSize: 8,
  
  // Ícones com cor Aurora
  iconColor: "#A78BFA", // Purple 400
  iconHoverColor: "#C4B5FD", // Purple 300
};

/**
 * CSS Customizado para efeitos avançados
 */
export const auroraPremiumStyles = `
  /* 🌈 Gradient Border no Grid */
  .aurora-premium-grid {
    position: relative;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
    padding: 2px;
  }
  
  .aurora-premium-grid::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 2px;
    background: linear-gradient(135deg, #8B5CF6, #EC4899, #06B6D4);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.3;
    animation: borderGradient 8s ease infinite;
  }
  
  @keyframes borderGradient {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }
  
  /* ✨ Glassmorphism no Header */
  .ag-theme-quartz .ag-header {
    background: rgba(30, 41, 59, 0.8) !important;
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    border-bottom: 1px solid rgba(139, 92, 246, 0.2);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 
                0 2px 4px -2px rgba(139, 92, 246, 0.1);
  }
  
  /* 🎨 Header com gradiente sutil */
  .ag-theme-quartz .ag-header-cell {
    background: linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, transparent 100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .ag-theme-quartz .ag-header-cell:hover {
    background: linear-gradient(180deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%);
    transform: translateY(-1px);
  }
  
  /* 💫 Linhas com hover effect premium */
  .ag-theme-quartz .ag-row {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .ag-theme-quartz .ag-row:hover {
    background: rgba(139, 92, 246, 0.08) !important;
    transform: translateX(4px);
    box-shadow: -4px 0 0 0 rgba(139, 92, 246, 0.5),
                0 4px 12px -2px rgba(139, 92, 246, 0.15);
  }
  
  /* 🔮 Células com glow effect */
  .ag-theme-quartz .ag-cell {
    transition: all 0.2s ease;
  }
  
  .ag-theme-quartz .ag-row:hover .ag-cell {
    color: #F1F5F9;
  }
  
  /* 🌟 Status Pills com gradiente */
  .status-pill {
    padding: 6px 14px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.3s ease;
    border: 1px solid;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
  }
  
  .status-pill:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  }
  
  .status-paid {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%);
    border-color: rgba(16, 185, 129, 0.5);
    color: #6EE7B7;
  }
  
  .status-paid:hover {
    box-shadow: 0 10px 20px -3px rgba(16, 185, 129, 0.4);
  }
  
  .status-pending {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%);
    border-color: rgba(251, 191, 36, 0.5);
    color: #FCD34D;
  }
  
  .status-overdue {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%);
    border-color: rgba(239, 68, 68, 0.5);
    color: #FCA5A5;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  /* ⚡ Floating Filters Premium */
  .ag-theme-quartz .ag-floating-filter {
    background: rgba(15, 23, 42, 0.6) !important;
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(139, 92, 246, 0.15);
  }
  
  .ag-theme-quartz .ag-floating-filter-input {
    background: rgba(30, 41, 59, 0.6) !important;
    border: 1px solid rgba(139, 92, 246, 0.2) !important;
    border-radius: 8px;
    transition: all 0.3s ease;
  }
  
  .ag-theme-quartz .ag-floating-filter-input:focus {
    border-color: rgba(139, 92, 246, 0.5) !important;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1),
                0 0 20px rgba(139, 92, 246, 0.2);
  }
  
  /* 🎪 Sidebar Premium */
  .ag-theme-quartz .ag-side-bar {
    background: rgba(15, 23, 42, 0.8) !important;
    backdrop-filter: blur(12px);
    border-left: 1px solid rgba(139, 92, 246, 0.2);
  }
  
  .ag-theme-quartz .ag-tool-panel {
    background: transparent !important;
  }
  
  /* 💎 Paginação Premium */
  .ag-theme-quartz .ag-paging-panel {
    background: rgba(15, 23, 42, 0.6) !important;
    backdrop-filter: blur(8px);
    border-top: 1px solid rgba(139, 92, 246, 0.2);
    padding: 12px 20px;
  }
  
  .ag-theme-quartz .ag-paging-button {
    background: rgba(139, 92, 246, 0.1) !important;
    border: 1px solid rgba(139, 92, 246, 0.3) !important;
    border-radius: 8px;
    transition: all 0.3s ease;
  }
  
  .ag-theme-quartz .ag-paging-button:hover:not(.ag-disabled) {
    background: rgba(139, 92, 246, 0.2) !important;
    border-color: rgba(139, 92, 246, 0.5) !important;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
    transform: translateY(-1px);
  }
  
  /* 🔥 Row Selection com glow */
  .ag-theme-quartz .ag-row-selected {
    background: rgba(139, 92, 246, 0.15) !important;
    border-left: 3px solid #8B5CF6;
    box-shadow: inset 0 0 20px rgba(139, 92, 246, 0.1);
  }
  
  .ag-theme-quartz .ag-row-selected:hover {
    background: rgba(139, 92, 246, 0.2) !important;
    box-shadow: -4px 0 0 0 rgba(139, 92, 246, 0.6),
                inset 0 0 25px rgba(139, 92, 246, 0.15),
                0 4px 12px -2px rgba(139, 92, 246, 0.2);
  }
  
  /* ✨ Group Rows Premium */
  .ag-theme-quartz .ag-row-group {
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%);
    font-weight: 600;
    border-left: 3px solid #8B5CF6;
  }
  
  /* 💫 Scrollbar customizado Aurora */
  .ag-theme-quartz .ag-body-horizontal-scroll-viewport::-webkit-scrollbar,
  .ag-theme-quartz .ag-body-vertical-scroll-viewport::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  
  .ag-theme-quartz .ag-body-horizontal-scroll-viewport::-webkit-scrollbar-track,
  .ag-theme-quartz .ag-body-vertical-scroll-viewport::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.4);
    border-radius: 10px;
  }
  
  .ag-theme-quartz .ag-body-horizontal-scroll-viewport::-webkit-scrollbar-thumb,
  .ag-theme-quartz .ag-body-vertical-scroll-viewport::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #06B6D4 100%);
    border-radius: 10px;
    transition: all 0.3s ease;
  }
  
  .ag-theme-quartz .ag-body-horizontal-scroll-viewport::-webkit-scrollbar-thumb:hover,
  .ag-theme-quartz .ag-body-vertical-scroll-viewport::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #A78BFA 0%, #F472B6 50%, #22D3EE 100%);
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
  }
  
  /* 🎯 Loading Overlay Premium */
  .ag-theme-quartz .ag-overlay-loading-center {
    background: rgba(15, 23, 42, 0.95) !important;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 16px;
    padding: 24px 32px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3),
                0 0 30px rgba(139, 92, 246, 0.2);
  }
  
  /* 🌊 Animações de entrada */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .ag-theme-quartz .ag-row {
    animation: fadeInUp 0.3s ease-out;
  }
  
  /* 🎨 Cores Aurora por contexto */
  .aurora-revenue {
    color: #6EE7B7 !important;
    font-weight: 600;
  }
  
  .aurora-expense {
    color: #FCA5A5 !important;
    font-weight: 600;
  }
  
  .aurora-neutral {
    color: #A78BFA !important;
  }
  
  /* 💎 Master Detail Premium */
  .ag-theme-quartz .ag-details-row {
    background: rgba(15, 23, 42, 0.6) !important;
    border-left: 3px solid rgba(139, 92, 246, 0.5);
    padding: 16px;
  }
  
  /* 🔥 Filter Pills */
  .ag-theme-quartz .ag-set-filter-item {
    transition: all 0.2s ease;
    border-radius: 6px;
    padding: 6px 10px;
  }
  
  .ag-theme-quartz .ag-set-filter-item:hover {
    background: rgba(139, 92, 246, 0.1) !important;
    transform: translateX(4px);
  }
  
  .ag-theme-quartz .ag-set-filter-item-selected {
    background: rgba(139, 92, 246, 0.2) !important;
    border-left: 3px solid #8B5CF6;
  }
`;

