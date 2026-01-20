"use client";

/**
 * Página: Detalhe da Reunião
 * Visualização completa da reunião com agenda, decisões e ações
 * 
 * @module app/(dashboard)/strategic/war-room/meetings/[id]
 */
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Text, 
  Flex, 
  Badge,
  ProgressBar,
} from '@tremor/react';
import { 
  RefreshCw,
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  MapPin,
  CheckCircle,
  Circle,
  PlayCircle,
  PauseCircle,
  MessageSquare,
  Plus,
  User,
  FileText,
} from 'lucide-react';

import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';

type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type MeetingType = 'BOARD' | 'DIRECTOR' | 'MANAGER' | 'TACTICAL' | 'EMERGENCY';

interface AgendaItem {
  id: string;
  title: string;
  presenter?: string;
  duration: number;
  isCompleted: boolean;
  order: number;
}

interface Decision {
  id: string;
  description: string;
  responsibleUserId: string;
  responsibleName?: string;
  deadline?: string;
  status: string;
}

interface MeetingDetail {
  id: string;
  strategyId?: string;
  meetingType: MeetingType;
  title: string;
  description?: string;
  scheduledAt: string;
  expectedDuration: number;
  startedAt?: string;
  endedAt?: string;
  actualDuration?: number;
  participants: string[];
  agendaItems: AgendaItem[];
  decisions: Decision[];
  status: MeetingStatus;
  isOverdue: boolean;
  facilitatorUserId: string;
  createdBy: string;
  createdAt: string;
}

// Safelist pattern
const STATUS_STYLES = {
  SCHEDULED: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    label: 'Agendada',
  },
  IN_PROGRESS: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    label: 'Em Andamento',
  },
  COMPLETED: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    label: 'Concluída',
  },
  CANCELLED: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    label: 'Cancelada',
  },
} as const;

const TYPE_LABELS: Record<MeetingType, string> = {
  BOARD: 'Conselho',
  DIRECTOR: 'Diretoria',
  MANAGER: 'Gerencial',
  TACTICAL: 'Tática',
  EMERGENCY: 'Emergência',
};

export default function MeetingDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);

  useEffect(() => {
    const loadMeeting = async () => {
      setLoading(true);
      try {
        // TODO: Implementar API de detalhe
        // Por enquanto, usar a lista e filtrar
        const response = await fetch('/api/strategic/war-room/meetings?pageSize=100');
        if (response.ok) {
          const data = await response.json();
          const found = data.items.find((m: { id: string }) => m.id === id);
          if (found) {
            // Simular dados completos
            setMeeting({
              ...found,
              participants: [],
              agendaItems: [
                { id: '1', title: 'Abertura e contextualização', presenter: 'Facilitador', duration: 10, isCompleted: false, order: 1 },
                { id: '2', title: 'Revisão de KPIs críticos', presenter: 'Analista', duration: 30, isCompleted: false, order: 2 },
                { id: '3', title: 'Status dos ciclos PDCA', presenter: 'Gerente', duration: 20, isCompleted: false, order: 3 },
                { id: '4', title: 'Planos de ação atrasados', presenter: 'Coordenador', duration: 20, isCompleted: false, order: 4 },
                { id: '5', title: 'Encerramento e próximos passos', presenter: 'Facilitador', duration: 10, isCompleted: false, order: 5 },
              ],
              decisions: [],
            });
          } else {
            router.push('/strategic/war-room/meetings');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar reunião:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMeeting();
  }, [id, router]);

  const refreshMeeting = async () => {
    setLoading(true);
    // Recarregar
    setLoading(false);
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-[60vh]">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </PageTransition>
    );
  }

  if (!meeting) {
    return null;
  }

  const statusStyle = STATUS_STYLES[meeting.status];
  const completedAgendaItems = meeting.agendaItems.filter(a => a.isCompleted).length;
  const agendaProgress = meeting.agendaItems.length > 0 
    ? (completedAgendaItems / meeting.agendaItems.length) * 100 
    : 0;

  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const formatTime = (date: string) => 
    new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <PageTransition>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <FadeIn>
          <Flex justifyContent="between" alignItems="start">
            <div>
              <Flex alignItems="center" className="gap-3 mb-2">
                <RippleButton 
                  variant="ghost" 
                  onClick={() => router.push('/strategic/war-room/meetings')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </RippleButton>
                <GradientText className="text-3xl font-bold">
                  {meeting.title}
                </GradientText>
              </Flex>
              <Flex className="gap-3 ml-12">
                <Badge color="purple">{TYPE_LABELS[meeting.meetingType]}</Badge>
                <span className={`px-2 py-1 rounded text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.label}
                </span>
              </Flex>
            </div>
            <Flex className="gap-3">
              {meeting.status === 'SCHEDULED' && (
                <RippleButton variant="default">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Iniciar Reunião
                </RippleButton>
              )}
              {meeting.status === 'IN_PROGRESS' && (
                <RippleButton variant="default">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizar
                </RippleButton>
              )}
              <RippleButton 
                variant="outline" 
                onClick={refreshMeeting}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
            </Flex>
          </Flex>
        </FadeIn>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info + Agenda */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meeting Info */}
            <FadeIn delay={0.1}>
              <Card className="bg-gray-900/50 border-gray-800">
                <Title className="text-white mb-4">Informações</Title>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Flex className="gap-3" alignItems="center">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      <div>
                        <Text className="text-gray-400 text-xs">Data</Text>
                        <Text className="text-white">{formatDate(meeting.scheduledAt)}</Text>
                      </div>
                    </Flex>

                    <Flex className="gap-3" alignItems="center">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <div>
                        <Text className="text-gray-400 text-xs">Horário</Text>
                        <Text className="text-white">
                          {formatTime(meeting.scheduledAt)} ({meeting.expectedDuration} min)
                        </Text>
                      </div>
                    </Flex>
                  </div>

                  <div className="space-y-3">
                    <Flex className="gap-3" alignItems="center">
                      <User className="w-5 h-5 text-purple-400" />
                      <div>
                        <Text className="text-gray-400 text-xs">Facilitador</Text>
                        <Text className="text-white">Facilitador</Text>
                      </div>
                    </Flex>

                    <Flex className="gap-3" alignItems="center">
                      <Users className="w-5 h-5 text-purple-400" />
                      <div>
                        <Text className="text-gray-400 text-xs">Participantes</Text>
                        <Text className="text-white">{meeting.participants.length || 'A definir'}</Text>
                      </div>
                    </Flex>
                  </div>
                </div>

                {meeting.description && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <Text className="text-gray-400 text-xs mb-1">Descrição</Text>
                    <Text className="text-gray-300">{meeting.description}</Text>
                  </div>
                )}
              </Card>
            </FadeIn>

            {/* Agenda */}
            <FadeIn delay={0.15}>
              <Card className="bg-gray-900/50 border-gray-800">
                <Flex justifyContent="between" alignItems="center" className="mb-4">
                  <div>
                    <Title className="text-white">Pauta</Title>
                    <Text className="text-gray-400 text-sm">
                      {completedAgendaItems} de {meeting.agendaItems.length} itens concluídos
                    </Text>
                  </div>
                  <RippleButton variant="ghost">
                    <Plus className="w-4 h-4" />
                  </RippleButton>
                </Flex>

                <ProgressBar value={agendaProgress} color="purple" className="mb-4" />

                <div className="space-y-2">
                  {meeting.agendaItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`
                        p-3 rounded-lg border transition-colors cursor-pointer
                        ${item.isCompleted 
                          ? 'bg-emerald-900/20 border-emerald-700/30' 
                          : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                        }
                      `}
                    >
                      <Flex alignItems="center" className="gap-3">
                        {item.isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-500" />
                        )}
                        <div className="flex-1">
                          <Text className={`font-medium ${item.isCompleted ? 'text-emerald-400 line-through' : 'text-white'}`}>
                            {index + 1}. {item.title}
                          </Text>
                          {item.presenter && (
                            <Text className="text-gray-500 text-xs">
                              Apresentador: {item.presenter}
                            </Text>
                          )}
                        </div>
                        <Badge color="gray">{item.duration} min</Badge>
                      </Flex>
                    </div>
                  ))}
                </div>
              </Card>
            </FadeIn>
          </div>

          {/* Right Column - Decisions */}
          <div className="space-y-6">
            {/* Decisions */}
            <FadeIn delay={0.2}>
              <Card className="bg-gray-900/50 border-gray-800">
                <Flex justifyContent="between" alignItems="center" className="mb-4">
                  <Title className="text-white">Decisões</Title>
                  <RippleButton variant="ghost">
                    <Plus className="w-4 h-4" />
                  </RippleButton>
                </Flex>

                {meeting.decisions.length > 0 ? (
                  <div className="space-y-3">
                    {meeting.decisions.map((decision) => (
                      <div
                        key={decision.id}
                        className="p-3 bg-purple-900/20 border border-purple-700/30 rounded-lg"
                      >
                        <Text className="text-white text-sm">{decision.description}</Text>
                        {decision.responsibleName && (
                          <Flex className="gap-2 mt-2" alignItems="center">
                            <User className="w-3 h-3 text-gray-500" />
                            <Text className="text-gray-400 text-xs">
                              {decision.responsibleName}
                            </Text>
                          </Flex>
                        )}
                        {decision.deadline && (
                          <Flex className="gap-2 mt-1" alignItems="center">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            <Text className="text-gray-400 text-xs">
                              Prazo: {new Date(decision.deadline).toLocaleDateString('pt-BR')}
                            </Text>
                          </Flex>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <Text className="text-gray-400 text-sm">
                      Nenhuma decisão registrada
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Clique em + para adicionar
                    </Text>
                  </div>
                )}
              </Card>
            </FadeIn>

            {/* Actions */}
            <FadeIn delay={0.25}>
              <Card className="bg-gray-900/50 border-gray-800">
                <Title className="text-white mb-4">Ações Geradas</Title>
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <Text className="text-gray-400 text-sm">
                    Nenhuma ação gerada
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    As ações são geradas a partir das decisões
                  </Text>
                </div>
              </Card>
            </FadeIn>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
