"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Página raiz do módulo Strategic
 * Redireciona para o Dashboard
 */
export default function StrategicPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/strategic/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="animate-pulse text-gray-400">
        Carregando...
      </div>
    </div>
  );
}
