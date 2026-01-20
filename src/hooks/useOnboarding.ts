/**
 * Hook: useOnboarding
 * Gerencia estado do onboarding, tour guiado e checklist de primeiros passos
 * 
 * @module hooks
 */
'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';

interface OnboardingState {
  isFirstVisit: boolean;
  isTourActive: boolean;
  isTourCompleted: boolean;
  currentStep: number;
  isChecklistVisible: boolean;
  checklistProgress: Record<string, boolean>;
}

const STORAGE_KEY = 'auracore-onboarding';

const defaultState: OnboardingState = {
  isFirstVisit: true,
  isTourActive: false,
  isTourCompleted: false,
  currentStep: 0,
  isChecklistVisible: true,
  checklistProgress: {},
};

// Função para ler estado do localStorage
function getStoredState(): OnboardingState {
  if (typeof window === 'undefined') return defaultState;
  
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultState;
  
  try {
    const parsed = JSON.parse(saved) as Partial<OnboardingState>;
    return { 
      ...defaultState, 
      ...parsed, 
      isFirstVisit: !parsed.isTourCompleted 
    };
  } catch {
    return defaultState;
  }
}

// Custom hook usando useSyncExternalStore para SSR seguro
function useLocalStorageState() {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  }, []);

  const getSnapshot = useCallback(() => getStoredState(), []);
  const getServerSnapshot = useCallback(() => defaultState, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useOnboarding() {
  // Estado persistido no localStorage via useSyncExternalStore
  const storedState = useLocalStorageState();
  
  // Estado local para currentStep (não persistido até completar ação)
  const [currentStep, setCurrentStep] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);
  
  // Combinar estados
  const state: OnboardingState = {
    ...storedState,
    currentStep: isTourActive ? currentStep : storedState.currentStep,
    isTourActive: isTourActive || storedState.isTourActive,
  };

  // Verificar se está hidratado (client-side)
  const isHydrated = typeof window !== 'undefined';

  // Save to localStorage
  const saveState = useCallback((newState: Partial<OnboardingState>) => {
    const current = getStoredState();
    const updated = { ...current, ...newState };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispara evento para sincronizar entre tabs
    window.dispatchEvent(new Event('storage'));
  }, []);

  // Actions
  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsTourActive(true);
    saveState({ isFirstVisit: false, isTourActive: true, currentStep: 0 });
  }, [saveState]);

  const dismissWelcome = useCallback(() => {
    saveState({ isFirstVisit: false });
  }, [saveState]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const completeTour = useCallback(() => {
    setIsTourActive(false);
    saveState({ 
      isTourActive: false, 
      isTourCompleted: true,
      checklistProgress: { ...storedState.checklistProgress, 'complete-tour': true },
    });
  }, [saveState, storedState.checklistProgress]);

  const skipTour = useCallback(() => {
    setIsTourActive(false);
    saveState({ isTourActive: false });
  }, [saveState]);

  const hideChecklist = useCallback(() => {
    saveState({ isChecklistVisible: false });
  }, [saveState]);

  const showChecklist = useCallback(() => {
    saveState({ isChecklistVisible: true });
  }, [saveState]);

  const markChecklistItem = useCallback((itemId: string, completed: boolean) => {
    saveState({
      checklistProgress: { ...storedState.checklistProgress, [itemId]: completed },
    });
  }, [saveState, storedState.checklistProgress]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
    setIsTourActive(false);
    window.dispatchEvent(new Event('storage'));
  }, []);

  return {
    ...state,
    isHydrated,
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
  };
}
