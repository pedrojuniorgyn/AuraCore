/**
 * Layout do módulo Strategic
 * 
 * Inclui:
 * - Chatbot Aurora AI flutuante
 * - Toasts para notificações críticas em tempo real
 */
import { AuraChat } from '@/components/strategic/AuraChat';
import { NotificationToastProvider } from '@/components/notifications/notification-toast-provider';

interface StrategicLayoutProps {
  children: React.ReactNode;
}

export default function StrategicLayout({ children }: StrategicLayoutProps) {
  return (
    <>
      {children}
      <AuraChat />
      <NotificationToastProvider />
    </>
  );
}
