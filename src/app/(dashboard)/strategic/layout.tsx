/**
 * Layout do módulo Strategic (Server Component)
 * 
 * Inclui:
 * - Wrapper client-side para componentes interativos (mobile header, nav, PWA)
 * - Chatbot Aurora AI flutuante
 * - Toasts para notificações críticas em tempo real
 * 
 * @note Layout é Server Component para evitar hydration mismatch.
 *       Lógica client-side está em StrategicLayoutClient.
 */

import { auth } from '@/lib/auth';
import { StrategicLayoutClient } from '@/components/strategic/StrategicLayoutClient';

interface StrategicLayoutProps {
  children: React.ReactNode;
}

export default async function StrategicLayout({ children }: StrategicLayoutProps) {
  // Server-side: buscar dados do usuário
  const session = await auth();
  
  const user = session?.user ? {
    name: session.user.name || 'Usuário',
    email: session.user.email || '',
    avatar: session.user.image || undefined,
  } : undefined;

  // TODO: Buscar contagem de notificações do servidor
  const notificationCount = 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
      {/* Client-side wrapper para componentes mobile e interativos */}
      <StrategicLayoutClient 
        user={user}
        notificationCount={notificationCount}
      >
        {children}
      </StrategicLayoutClient>
    </div>
  );
}
