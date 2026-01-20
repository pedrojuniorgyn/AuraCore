'use client';

import { ReactNode } from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileNav } from './MobileNav';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { AuraChat } from './AuraChat';
import { NotificationToastProvider } from '@/components/notifications/notification-toast-provider';

// Onboarding Components
import { WelcomeModal } from './WelcomeModal';
import { OnboardingTour } from './OnboardingTour';
import { OnboardingChecklist } from './OnboardingChecklist';

interface Props {
  children: ReactNode;
  user?: { name: string; email: string; avatar?: string };
  notificationCount?: number;
}

/**
 * Client-side wrapper para componentes interativos do layout Strategic.
 * 
 * Separado do layout principal para manter o layout como Server Component,
 * evitando hydration mismatch e melhorando performance.
 */
export function StrategicLayoutClient({ children, user, notificationCount = 0 }: Props) {
  return (
    <>
      {/* Mobile Header - visível apenas em mobile (< md) */}
      <MobileHeader 
        user={user}
        notificationCount={notificationCount}
      />

      {/* Main Content - com padding para header e nav mobile */}
      <div className="pt-14 md:pt-0 pb-20 md:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Nav - visível apenas em mobile */}
      <MobileNav />

      {/* Desktop: Aurora Chat flutuante */}
      <AuraChat />

      {/* Notifications Toast Provider */}
      <NotificationToastProvider />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Onboarding Components */}
      <WelcomeModal />
      <OnboardingTour />
      <OnboardingChecklist />
    </>
  );
}
