"use client";

import { themeQuartz } from "ag-grid-community";

/**
 * Aura Theme - Tema customizado do AG Grid para o Aura Core
 * Baseado no Quartz com cores dark mode premium
 */
export const auraTheme = themeQuartz.withParams({
  // Cores de fundo
  backgroundColor: "#0f172a",
  foregroundColor: "#e2e8f0",
  
  // Cabeçalho
  headerBackgroundColor: "#1e293b",
  headerTextColor: "#f1f5f9",
  headerFontWeight: 600,
  
  // Bordas
  borderColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 8,
  wrapperBorderRadius: 12,
  
  // Linhas ímpares/pares
  oddRowBackgroundColor: "#0f172a",
  rowBackgroundColor: "#1a1f2e",
  
  // Hover
  rowHoverColor: "rgba(99, 102, 241, 0.1)",
  
  // Seleção
  selectedRowBackgroundColor: "rgba(99, 102, 241, 0.2)",
  rangeSelectionBackgroundColor: "rgba(99, 102, 241, 0.15)",
  
  // Input de filtro
  inputBackgroundColor: "#1e293b",
  inputBorderColor: "rgba(255, 255, 255, 0.1)",
  inputFocusBorderColor: "#6366f1",
  
  // Fonte
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  fontSize: 14,
  
  // Espaçamento
  spacing: 8,
  cellHorizontalPadding: 16,
  
  // Cores primárias
  accentColor: "#6366f1",
  
  // Chrome/UI
  chromeBackgroundColor: "#1e293b",
  
  // Sombras (desabilitado para glassmorphism)
  wrapperBorder: false,
});

/**
 * Classes CSS adicionais para estilização
 */
export const agGridCustomStyles = `
  .ag-theme-aura {
    --ag-row-height: 60px;
    --ag-header-height: 50px;
  }
  
  .ag-theme-aura .ag-header-cell-label {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.05em;
    color: #a5b4fc;
  }
  
  .ag-theme-aura .ag-row {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background-color 0.2s ease;
  }
  
  .ag-theme-aura .ag-row:hover {
    background-color: rgba(99, 102, 241, 0.08) !important;
  }
  
  .ag-theme-aura .ag-cell {
    display: flex;
    align-items: center;
  }
  
  .ag-theme-aura .ag-header {
    border-bottom: 2px solid rgba(99, 102, 241, 0.3);
  }
  
  .ag-theme-aura .ag-paging-panel {
    background-color: #1e293b;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 16px;
  }
  
  .ag-theme-aura .ag-paging-button {
    color: #e2e8f0;
  }
  
  .ag-theme-aura .ag-paging-button:hover {
    background-color: rgba(99, 102, 241, 0.2);
  }
  
  /* Scrollbar customizada */
  .ag-theme-aura ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .ag-theme-aura ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .ag-theme-aura ::-webkit-scrollbar-thumb {
    background: linear-gradient(
      to bottom,
      rgba(99, 102, 241, 0.3),
      rgba(139, 92, 246, 0.3)
    );
    border-radius: 4px;
  }
  
  .ag-theme-aura ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(
      to bottom,
      rgba(99, 102, 241, 0.5),
      rgba(139, 92, 246, 0.5)
    );
  }
  
  /* Loading overlay */
  .ag-theme-aura .ag-overlay-loading-wrapper {
    background-color: rgba(15, 23, 42, 0.95);
  }
  
  .ag-theme-aura .ag-overlay-loading-center {
    color: #6366f1;
  }
  
  /* Filter */
  .ag-theme-aura .ag-filter {
    background-color: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .ag-theme-aura .ag-filter-toolpanel-header {
    background-color: #0f172a;
  }
`;









