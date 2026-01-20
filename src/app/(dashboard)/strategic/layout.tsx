/**
 * Layout do módulo Strategic
 * 
 * Inclui o chatbot Aurora AI flutuante em todas as páginas do módulo.
 */
import { AuraChat } from '@/components/strategic/AuraChat';

interface StrategicLayoutProps {
  children: React.ReactNode;
}

export default function StrategicLayout({ children }: StrategicLayoutProps) {
  return (
    <>
      {children}
      <AuraChat />
    </>
  );
}
