/**
 * OnboardingContext
 * Context API para gerenciamento centralizado do estado de onboarding
 * 
 * FIX Bug 1: isFirstVisit como estado independente, não derivado
 * FIX Bug 2: Provider único para todos os componentes
 * FIX Bug 3: Reducer atualiza estado diretamente sem lógica OR
 * 
 * @module contexts
 */
'use client';

import { 
  createContext, 
  useContext, 
  useReducer, 
  useEffect, 
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingState {
  isFirstVisit: boolean;
  isTourActive: boolean;
  isTourCompleted: boolean;
  currentStep: number;
  isChecklistVisible: boolean;
  checklistProgress: Record<string, boolean>;
  isHydrated: boolean;
}

type OnboardingAction =
  | { type: 'HYDRATE'; payload: Partial<OnboardingState> }
  | { type: 'START_TOUR' }
  | { type: 'DISMISS_WELCOME' }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'COMPLETE_TOUR' }
  | { type: 'SKIP_TOUR' }
  | { type: 'HIDE_CHECKLIST' }
  | { type: 'SHOW_CHECKLIST' }
  | { type: 'MARK_CHECKLIST_ITEM'; payload: { itemId: string; completed: boolean } }
  | { type: 'RESET' };

interface OnboardingContextValue extends OnboardingState {
  startTour: () => void;
  dismissWelcome: () => void;
  nextStep: () => void;
  prevStep: () => void;
  completeTour: () => void;
  skipTour: () => void;
  hideChecklist: () => void;
  showChecklist: () => void;
  markChecklistItem: (itemId: string, completed: boolean) => void;
  resetOnboarding: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'auracore-onboarding';

const defaultState: OnboardingState = {
  isFirstVisit: true,
  isTourActive: false,
  isTourCompleted: false,
  currentStep: 0,
  isChecklistVisible: true,
  checklistProgress: {},
  isHydrated: false,
};

// ============================================================================
// REDUCER
// ============================================================================

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'HYDRATE':
      return { 
        ...state, 
        ...action.payload, 
        isHydrated: true,
      };

    case 'START_TOUR':
      return {
        ...state,
        isFirstVisit: false,
        isTourActive: true,
        currentStep: 0,
      };

    case 'DISMISS_WELCOME':
      // FIX Bug 1: Setar isFirstVisit para false diretamente
      return {
        ...state,
        isFirstVisit: false,
      };

    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: state.currentStep + 1,
      };

    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(0, state.currentStep - 1),
      };

    case 'COMPLETE_TOUR':
      return {
        ...state,
        isTourActive: false,
        isTourCompleted: true,
        currentStep: 0,
        checklistProgress: {
          ...state.checklistProgress,
          'complete-tour': true,
        },
      };

    case 'SKIP_TOUR':
      // FIX Bug 3: Setar isTourActive para false explicitamente
      return {
        ...state,
        isTourActive: false,
        currentStep: 0,
      };

    case 'HIDE_CHECKLIST':
      return {
        ...state,
        isChecklistVisible: false,
      };

    case 'SHOW_CHECKLIST':
      return {
        ...state,
        isChecklistVisible: true,
      };

    case 'MARK_CHECKLIST_ITEM':
      return {
        ...state,
        checklistProgress: {
          ...state.checklistProgress,
          [action.payload.itemId]: action.payload.completed,
        },
      };

    case 'RESET':
      return { ...defaultState, isHydrated: true };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface ProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: ProviderProps) {
  const [state, dispatch] = useReducer(onboardingReducer, defaultState);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<OnboardingState>;
        
        // FIX Bug 1: Usar isFirstVisit do storage diretamente
        // Se explicitamente false no storage, manter false
        // Senão, derivar de isTourCompleted apenas na primeira carga
        const isFirstVisit = parsed.isFirstVisit !== undefined 
          ? parsed.isFirstVisit 
          : !parsed.isTourCompleted;
        
        dispatch({ 
          type: 'HYDRATE', 
          payload: {
            ...parsed,
            isFirstVisit,
          }
        });
      } else {
        // Nenhum estado salvo, marcar como hidratado
        dispatch({ type: 'HYDRATE', payload: {} });
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
      dispatch({ type: 'HYDRATE', payload: {} });
    }
  }, []);

  // Save to localStorage when state changes (skip initial render before hydration)
  useEffect(() => {
    if (typeof window === 'undefined' || !state.isHydrated) return;

    // FIX Bug 1: Salvar isFirstVisit como está, não recalcular
    const stateToSave = {
      isFirstVisit: state.isFirstVisit,
      isTourActive: state.isTourActive,
      isTourCompleted: state.isTourCompleted,
      currentStep: state.currentStep,
      isChecklistVisible: state.isChecklistVisible,
      checklistProgress: state.checklistProgress,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [state]);

  // Memoized actions
  const startTour = useCallback(() => dispatch({ type: 'START_TOUR' }), []);
  const dismissWelcome = useCallback(() => dispatch({ type: 'DISMISS_WELCOME' }), []);
  const nextStep = useCallback(() => dispatch({ type: 'NEXT_STEP' }), []);
  const prevStep = useCallback(() => dispatch({ type: 'PREV_STEP' }), []);
  const completeTour = useCallback(() => dispatch({ type: 'COMPLETE_TOUR' }), []);
  const skipTour = useCallback(() => dispatch({ type: 'SKIP_TOUR' }), []);
  const hideChecklist = useCallback(() => dispatch({ type: 'HIDE_CHECKLIST' }), []);
  const showChecklist = useCallback(() => dispatch({ type: 'SHOW_CHECKLIST' }), []);
  
  const markChecklistItem = useCallback((itemId: string, completed: boolean) => {
    dispatch({ type: 'MARK_CHECKLIST_ITEM', payload: { itemId, completed } });
  }, []);
  
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'RESET' });
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<OnboardingContextValue>(() => ({
    ...state,
    startTour,
    dismissWelcome,
    nextStep,
    prevStep,
    completeTour,
    skipTour,
    hideChecklist,
    showChecklist,
    markChecklistItem,
    resetOnboarding,
  }), [
    state,
    startTour,
    dismissWelcome,
    nextStep,
    prevStep,
    completeTour,
    skipTour,
    hideChecklist,
    showChecklist,
    markChecklistItem,
    resetOnboarding,
  ]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useOnboardingContext(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  
  return context;
}
