'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { WarRoomForm } from '@/components/strategic/war-room';

export default function NewWarRoomPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/strategic/war-room/rooms')}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Voltar para lista
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">Nova War Room</h1>
        <p className="text-white/60 mt-1">
          Crie uma sala de comando para gestão de crises
        </p>
      </div>

      {/* Form */}
      <WarRoomForm />
    </div>
  );
}
