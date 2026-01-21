'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { warRoomService } from '@/lib/war-room/war-room-service';
import { WarRoomCard } from '@/components/strategic/war-room';
import type { WarRoom } from '@/lib/war-room/war-room-types';

export default function WarRoomsListPage() {
  const router = useRouter();
  const [warRooms, setWarRooms] = useState<WarRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWarRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await warRoomService.getWarRooms();
      setWarRooms(data);
    } catch (error) {
      console.error('Failed to fetch war rooms:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarRooms();
  }, [fetchWarRooms]);

  const activeRooms = warRooms.filter((w) => w.status === 'active' || w.status === 'monitoring');
  const resolvedRooms = warRooms.filter((w) => w.status === 'resolved');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">War Rooms</h1>
          <p className="text-white/60 mt-1">Monitoramento intensivo e gestão de crises</p>
        </div>
        <button
          onClick={() => router.push('/strategic/war-room/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl 
            bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          <Plus size={18} />
          Nova Sala
        </button>
      </div>

      {/* Active Rooms */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-red-400" size={20} />
          <h2 className="text-lg font-semibold text-white">
            Ativas ({activeRooms.length})
          </h2>
        </div>

        {activeRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRooms.map((room, index) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <WarRoomCard
                  warRoom={room}
                  onEnter={() => router.push(`/strategic/war-room/${room.id}`)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-white/10 bg-white/5 text-center">
            <CheckCircle className="mx-auto mb-4 text-green-400" size={48} />
            <p className="text-white/60">Nenhuma crise ativa</p>
            <p className="text-white/40 text-sm mt-1">
              Todas as situações estão sob controle
            </p>
          </div>
        )}
      </section>

      {/* Resolved Rooms */}
      {resolvedRooms.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-400" size={20} />
              <h2 className="text-lg font-semibold text-white">
                Resolvidas ({resolvedRooms.length})
              </h2>
            </div>
            <button className="text-purple-400 hover:text-purple-300 text-sm">
              Ver Todas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resolvedRooms.slice(0, 3).map((room, index) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-400" />
                  <h3 className="text-white font-medium truncate">{room.title}</h3>
                </div>
                <p className="text-white/40 text-sm">
                  Resolvida em{' '}
                  {room.resolvedAt &&
                    Math.ceil(
                      (new Date(room.resolvedAt).getTime() -
                        new Date(room.startedAt).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{' '}
                  dias
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
