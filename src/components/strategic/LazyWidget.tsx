'use client';

/**
 * LazyWidget Component
 * 
 * Wrapper para lazy loading de widgets do dashboard.
 * Carrega o componente apenas quando entra no viewport.
 * Usa dynamic do Next.js para evitar problemas com React Compiler.
 * 
 * @module components/strategic/LazyWidget
 * @since E9 - Performance Optimizations
 */

import { memo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { Loader2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface LazyWidgetContainerProps {
  /** Se o widget deve carregar */
  shouldLoad: boolean;
  /** Fallback customizado durante carregamento */
  fallback?: ReactNode;
  /** Altura mínima do placeholder */
  minHeight?: number;
  /** Se true, mostra skeleton ao invés de spinner */
  useSkeleton?: boolean;
  /** Conteúdo do widget quando carregado */
  children: ReactNode;
}

// ============================================================================
// Default Fallbacks
// ============================================================================

function SpinnerFallback({ minHeight }: { minHeight: number }) {
  return (
    <div 
      className="h-full flex items-center justify-center bg-white/5 rounded-xl"
      style={{ minHeight }}
    >
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
    </div>
  );
}

function SkeletonFallback({ minHeight }: { minHeight: number }) {
  return (
    <div 
      className="h-full bg-white/5 rounded-xl animate-pulse"
      style={{ minHeight }}
    >
      <div className="p-4 space-y-3">
        <div className="h-4 w-1/3 bg-white/10 rounded" />
        <div className="h-8 w-2/3 bg-white/10 rounded" />
        <div className="h-24 bg-white/10 rounded" />
      </div>
    </div>
  );
}

function PlaceholderFallback({ minHeight }: { minHeight: number }) {
  return (
    <div 
      className="h-full bg-white/5 rounded-xl"
      style={{ minHeight }}
    />
  );
}

// ============================================================================
// Lazy Widget Container
// ============================================================================

/**
 * Container que renderiza conteúdo apenas quando visível
 */
function LazyWidgetContainerInner({
  shouldLoad,
  fallback,
  minHeight = 200,
  useSkeleton = true,
  children,
}: LazyWidgetContainerProps) {
  const loadingFallback = fallback || (
    useSkeleton 
      ? <SkeletonFallback minHeight={minHeight} />
      : <SpinnerFallback minHeight={minHeight} />
  );

  if (!shouldLoad) {
    return <PlaceholderFallback minHeight={minHeight} />;
  }

  return (
    <>
      {children || loadingFallback}
    </>
  );
}

export const LazyWidgetContainer = memo(LazyWidgetContainerInner);

// ============================================================================
// Viewport Trigger Hook
// ============================================================================

interface UseViewportLoadingOptions {
  rootMargin?: string;
  threshold?: number;
}

/**
 * Hook para detectar quando carregar um widget
 */
export function useViewportLoading({
  rootMargin = '100px',
  threshold = 0.1,
}: UseViewportLoadingOptions = {}) {
  const { ref, hasIntersected } = useIntersectionObserver({
    rootMargin,
    threshold,
    triggerOnce: true,
  });

  return {
    ref,
    shouldLoad: hasIntersected,
  };
}

// ============================================================================
// Pre-configured Dynamic Widgets
// ============================================================================

/**
 * Widgets carregados dinamicamente com Next.js dynamic
 * Esses são criados fora do render para evitar problemas com React Compiler
 */
export const DynamicWidgets = {
  HealthScore: dynamic(
    () => import('./widgets/HealthScoreWidget').then(m => m.HealthScoreWidget),
    { loading: () => <SkeletonFallback minHeight={200} /> }
  ),
  Alerts: dynamic(
    () => import('./widgets/AlertsWidget').then(m => m.AlertsWidget),
    { loading: () => <SkeletonFallback minHeight={200} /> }
  ),
  KpiSummary: dynamic(
    () => import('./widgets/KpiSummaryWidget').then(m => m.KpiSummaryWidget),
    { loading: () => <SkeletonFallback minHeight={200} /> }
  ),
  TrendChart: dynamic(
    () => import('./widgets/TrendChartWidget').then(m => m.TrendChartWidget),
    { loading: () => <SkeletonFallback minHeight={200} /> }
  ),
  Actions: dynamic(
    () => import('./widgets/ActionsWidget').then(m => m.ActionsWidget),
    { loading: () => <SkeletonFallback minHeight={200} /> }
  ),
  AuroraInsight: dynamic(
    () => import('./widgets/AuroraInsightWidget').then(m => m.AuroraInsightWidget),
    { loading: () => <SkeletonFallback minHeight={200} /> }
  ),
};

// ============================================================================
// Simple Lazy Load Wrapper
// ============================================================================

interface SimpleLazyWidgetProps {
  /** Ref para elemento observado */
  observerRef: (node: Element | null) => void;
  /** Se deve carregar o conteúdo */
  shouldLoad: boolean;
  /** Altura mínima */
  minHeight?: number;
  /** Conteúdo a renderizar quando visível */
  children: ReactNode;
}

/**
 * Wrapper simples para lazy loading baseado em viewport
 * 
 * @example
 * ```tsx
 * const { ref, shouldLoad } = useViewportLoading();
 * 
 * <SimpleLazyWidget observerRef={ref} shouldLoad={shouldLoad}>
 *   <DynamicWidgets.HealthScore score={85} />
 * </SimpleLazyWidget>
 * ```
 */
function SimpleLazyWidgetInner({
  observerRef,
  shouldLoad,
  minHeight = 200,
  children,
}: SimpleLazyWidgetProps) {
  return (
    <div ref={observerRef} className="h-full">
      {shouldLoad ? children : <PlaceholderFallback minHeight={minHeight} />}
    </div>
  );
}

export const SimpleLazyWidget = memo(SimpleLazyWidgetInner);
