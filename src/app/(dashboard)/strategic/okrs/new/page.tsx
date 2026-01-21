'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Target } from 'lucide-react';
import Link from 'next/link';
import { okrService } from '@/lib/okrs/okr-service';
import { OKRForm } from '@/components/strategic/okrs';
import type { OKR } from '@/lib/okrs/okr-types';
import { toast } from 'sonner';

export default function NewOKRPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get('parentId');

  const [parentOKR, setParentOKR] = useState<OKR | null>(null);
  const [isLoading, setIsLoading] = useState(!!parentId);

  useEffect(() => {
    async function loadParent() {
      if (!parentId) return;
      try {
        const data = await okrService.getOKR(parentId);
        setParentOKR(data);
      } catch (err) {
        console.error('Failed to load parent OKR:', err);
        toast.error('Erro ao carregar OKR pai');
      } finally {
        setIsLoading(false);
      }
    }

    loadParent();
  }, [parentId]);

  const handleSubmit = async (data: Partial<OKR>) => {
    try {
      const created = await okrService.createOKR(data);
      toast.success('OKR criado com sucesso');
      router.push(`/strategic/okrs/${created.id}`);
    } catch {
      toast.error('Erro ao criar OKR');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/strategic/okrs"
            className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Target className="text-purple-400" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Novo OKR</h1>
              {parentOKR && (
                <p className="text-white/40 text-sm">Alinhado com: {parentOKR.title}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <OKRForm
          parentOKR={parentOKR || undefined}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/strategic/okrs')}
        />
      </div>
    </div>
  );
}
