/**
 * PWA Manager Component
 * Gerencia PWA, Offline Queue e Push Notifications
 * 
 * @module components/pwa
 */
'use client';

import { PWAInstallPrompt } from './PWAInstallPrompt';
import { OfflineIndicator } from './OfflineIndicator';

/**
 * Componente raiz que gerencia todos os recursos PWA
 * Adicionar no layout principal
 */
export function PWAManager() {
  return (
    <>
      <PWAInstallPrompt />
      <OfflineIndicator />
    </>
  );
}
