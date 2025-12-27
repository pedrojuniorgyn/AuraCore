/**
 * AG Grid v34.3 - Theming API Configuration
 * 
 * Tema customizado para o AuraCore com Dark Mode
 * Baseado no themeQuartz com paleta personalizada
 */

import { themeQuartz } from "ag-grid-community";

/**
 * 🎨 Tema Principal do AuraCore
 * 
 * Características:
 * - Dark Mode nativo
 * - Paleta de cores alinhada com Tailwind/Shadcn
 * - Tipografia otimizada
 * - Bordas e espaçamentos profissionais
 */
export const auraTheme = themeQuartz.withParams({
  // 🎨 Paleta de Cores
  accentColor: "#4F46E5", // Indigo-600 (Ações primárias)
  backgroundColor: "#0F172A", // Slate-900 (Fundo do grid)
  foregroundColor: "#F1F5F9", // Slate-100 (Texto)
  borderColor: "#334155", // Slate-700 (Bordas)
  
  // 📊 Cores de Linhas
  oddRowBackgroundColor: "#1E293B", // Slate-800 (Linhas ímpares)
  
  // 🎯 Hover e Seleção
  rangeSelectionBackgroundColor: "rgba(79, 70, 229, 0.2)", // Indigo com opacidade
  rangeSelectionBorderColor: "#4F46E5",
  
  // 📝 Headers
  headerBackgroundColor: "#1E293B", // Slate-800
  headerTextColor: "#F1F5F9", // Slate-100
  headerFontWeight: 600,
  
  // 🔤 Tipografia
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  fontSize: 14,
  
  // 📏 Espaçamentos
  spacing: 8,
  cellHorizontalPadding: 12,
  
  // 🎨 Bordas
  borderRadius: 6,
  wrapperBorderRadius: 8,
  
  // 📊 Linhas
  rowHeight: 48,
  headerHeight: 48,
});

/**
 * 🌈 Tema Alternativo - Light Mode
 * (Para toggle futuro)
 */
export const auraThemeLight = themeQuartz.withParams({
  accentColor: "#4F46E5",
  backgroundColor: "#FFFFFF",
  foregroundColor: "#0F172A",
  borderColor: "#E2E8F0",
  oddRowBackgroundColor: "#F8FAFC",
  headerBackgroundColor: "#F1F5F9",
  headerTextColor: "#0F172A",
  headerFontWeight: 600,
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  fontSize: 14,
  spacing: 8,
  cellHorizontalPadding: 12,
  borderRadius: 6,
  wrapperBorderRadius: 8,
  rowHeight: 48,
  headerHeight: 48,
});

/**
 * ⚙️ Configurações Padrão do Grid
 * 
 * Configurações compartilhadas entre todos os grids
 */
export const defaultGridOptions = {
  // 🎨 Tema
  theme: auraTheme,
  
  // 📊 Auto-Size Escalável (NOVO v34.3)
  autoSizeStrategy: {
    type: "fitGridWidth" as const,
    defaultMinWidth: 100,
  },
  
  // 🔤 Animações
  animateRows: true,
  
  // 📱 Responsividade
  suppressColumnVirtualisation: false,
  suppressRowVirtualisation: false,
  
  // 🎯 Seleção
  rowSelection: "multiple" as const,
  suppressRowClickSelection: true,
  
  // 📋 Clipboard
  enableRangeSelection: true,
  enableRangeHandle: true,
  enableFillHandle: true,
  
  // 🔍 Filtros
  enableAdvancedFilter: true,
  
  // 📊 Paginação
  pagination: true,
  paginationPageSize: 50,
  paginationPageSizeSelector: [20, 50, 100, 200],
  
  // 🎨 Loading
  loadingOverlayComponent: null,
  noRowsOverlayComponent: null,
  
  // 🌐 Localização
  localeText: {
    // Filtros
    contains: "Contém",
    notContains: "Não contém",
    equals: "Igual a",
    notEqual: "Diferente de",
    startsWith: "Começa com",
    endsWith: "Termina com",
    
    // Paginação
    page: "Página",
    of: "de",
    to: "até",
    more: "mais",
    next: "Próxima",
    previous: "Anterior",
    first: "Primeira",
    last: "Última",
    
    // Ações
    selectAll: "Selecionar Tudo",
    searchOoo: "Buscar...",
    blanks: "Em branco",
    noRowsToShow: "Nenhum registro encontrado",
    
    // Exportação
    export: "Exportar",
    csvExport: "Exportar CSV",
    excelExport: "Exportar Excel",
    
    // Colunas
    columns: "Colunas",
    filters: "Filtros",
    
    // Agrupamento
    group: "Agrupar",
    rowGroupColumnsEmptyMessage: "Arraste colunas aqui para agrupar",
    
    // Agregações
    sum: "Soma",
    min: "Mínimo",
    max: "Máximo",
    first: "Primeiro",
    last: "Último",
    none: "Nenhum",
    count: "Contagem",
    avg: "Média",
  },
};

/**
 * 🎨 Tema para Master-Detail
 */
export const detailGridTheme = themeQuartz.withParams({
  accentColor: "#4F46E5",
  backgroundColor: "#1E293B",
  foregroundColor: "#F1F5F9",
  borderColor: "#475569",
  oddRowBackgroundColor: "#334155",
  headerBackgroundColor: "#334155",
  headerTextColor: "#F1F5F9",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  fontSize: 13,
  spacing: 6,
  cellHorizontalPadding: 10,
  borderRadius: 4,
  rowHeight: 40,
  headerHeight: 40,
});

























