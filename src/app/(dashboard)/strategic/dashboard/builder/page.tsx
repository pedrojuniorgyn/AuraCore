'use client';

import { Suspense } from 'react';
import { DashboardBuilder } from '@/components/strategic/dashboard';

export default function DashboardBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-950">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardBuilder />
    </Suspense>
  );
}
