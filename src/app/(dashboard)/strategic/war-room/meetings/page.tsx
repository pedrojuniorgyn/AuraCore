"use client";

/**
 * Página: Lista de Reuniões Executivas
 * Gerenciamento de reuniões do War Room
 * 
 * @module app/(dashboard)/strategic/war-room/meetings
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Text, 
  Flex, 
  Badge,
  Select,
  SelectItem,
} from '@tremor/react';
import { 
  RefreshCw,
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  Plus,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  XCircle,
  FileText,
  MessageSquare,
} from 'lucide-react';

import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';

type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type MeetingType = 'BOARD' | 'DIRECTOR' | 'MANAGER' | 'TACTICAL' | 'EMERGENCY';

interface Meeting {
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
  participantsCount: number;
  agendaItemsCount: number;
  decisionsCount: number;
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
    icon: Calendar,
    label: 'Agendada',
  },
  IN_PROGRESS: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    icon: PlayCircle,
    label: 'Em Andamento',
  },
  COMPLETED: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    icon: CheckCircle,
    label: 'Concluída',
  },
  CANCELLED: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    icon: XCircle,
    label: 'Cancelada',
  },
} as const;

const TYPE_STYLES = {
  BOARD: { label: 'Conselho', color: 'purple' as const },
  DIRECTOR: { label: 'Diretoria', color: 'blue' as const },
  MANAGER: { label: 'Gerencial', color: 'emerald' as const },
  TACTICAL: { label: 'Tática', color: 'amber' as const },
  EMERGENCY: { label: 'Emergência', color: 'red' as const },
} as const;

export default function MeetingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strategic/war-room/meetings?pageSize=50');
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.items);
      }
    } catch (error) {
      console.error('Erro ao carregar reuniões:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeetings = meetings.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (typeFilter !== 'all' && m.meetingType !== typeFilter) return false;
    return true;
  });

  // Agrupar por status para exibição
  const upcomingMeetings = filteredMeetings.filter(m => m.status === 'SCHEDULED');
  const inProgressMeetings = filteredMeetings.filter(m => m.status === 'IN_PROGRESS');
  const pastMeetings = filteredMeetings.filter(m => m.status === 'COMPLETED' || m.status === 'CANCELLED');

  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const renderMeetingCard = (meeting: Meeting) => {
    const statusStyle = STATUS_STYLES[meeting.status];
    const typeStyle = TYPE_STYLES[meeting.meetingType];
    const StatusIcon = statusStyle.icon;

    return (
      <div
        key={meeting.id}
        onClick={() => router.push(`/strategic/war-room/meetings/${meeting.id}`)}
        className="p-4 bg-gray-800 rounded-lg border border-gray-700 cursor-pointer hover:bg-gray-750 hover:border-gray-600 transition-all"
      >
        <Flex justifyContent="between" alignItems="start" className="mb-2">
          <div>
            <Flex className="gap-2" alignItems="center">
              <StatusIcon className={`w-4 h-4 ${statusStyle.text}`} />
              <Text className="text-white font-semibold">{meeting.title}</Text>
            </Flex>
            {meeting.description && (
              <Text className="text-gray-400 text-sm line-clamp-1 mt-1">
                {meeting.description}
              </Text>
            )}
          </div>
          <Flex className="gap-2">
            <Badge color={typeStyle.color}>{typeStyle.label}</Badge>
            <span className={`px-2 py-1 rounded text-xs ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </Flex>
        </Flex>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
          <Flex className="gap-2" alignItems="center">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Text className="text-gray-400">{formatDate(meeting.scheduledAt)}</Text>
          </Flex>

          <Flex className="gap-2" alignItems="center">
            <Clock className="w-4 h-4 text-gray-500" />
            <Text className="text-gray-400">{meeting.expectedDuration} min</Text>
          </Flex>

          <Flex className="gap-2" alignItems="center">
            <Users className="w-4 h-4 text-gray-500" />
            <Text className="text-gray-400">{meeting.participantsCount} participantes</Text>
          </Flex>

          <Flex className="gap-2" alignItems="center">
            <FileText className="w-4 h-4 text-gray-500" />
            <Text className="text-gray-400">{meeting.agendaItemsCount} itens de pauta</Text>
          </Flex>
        </div>

        {meeting.decisionsCount > 0 && (
          <Flex className="gap-2 mt-3" alignItems="center">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <Text className="text-purple-400 text-sm">
              {meeting.decisionsCount} decisão(ões) registrada(s)
            </Text>
          </Flex>
        )}
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <FadeIn>
          <Flex justifyContent="between" alignItems="start">
            <div>
              <Flex alignItems="center" className="gap-3 mb-2">
                <RippleButton 
                  variant="ghost" 
                  onClick={() => router.push('/strategic/war-room')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </RippleButton>
                <GradientText className="text-4xl font-bold">
                  Reuniões Executivas
                </GradientText>
              </Flex>
              <Text className="text-gray-400 ml-12">
                Gestão de reuniões estratégicas do War Room
              </Text>
            </div>
            <Flex className="gap-3">
              <RippleButton variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Nova Reunião
              </RippleButton>
              <RippleButton 
                variant="outline" 
                onClick={fetchMeetings}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
            </Flex>
          </Flex>
        </FadeIn>

        {/* Filters */}
        <FadeIn delay={0.1}>
          <Card className="bg-gray-900/50 border-gray-800">
            <Flex className="gap-4">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
                className="w-48"
              >
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="SCHEDULED">Agendadas</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                <SelectItem value="COMPLETED">Concluídas</SelectItem>
                <SelectItem value="CANCELLED">Canceladas</SelectItem>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
                className="w-48"
              >
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="BOARD">Conselho</SelectItem>
                <SelectItem value="DIRECTOR">Diretoria</SelectItem>
                <SelectItem value="MANAGER">Gerencial</SelectItem>
                <SelectItem value="TACTICAL">Tática</SelectItem>
                <SelectItem value="EMERGENCY">Emergência</SelectItem>
              </Select>
            </Flex>
          </Card>
        </FadeIn>

        {loading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
              <Text className="text-gray-400">Carregando reuniões...</Text>
            </div>
          </div>
        ) : (
          <>
            {/* In Progress */}
            {inProgressMeetings.length > 0 && (
              <FadeIn delay={0.15}>
                <Card className="bg-purple-900/20 border-purple-700">
                  <Flex alignItems="center" className="gap-2 mb-4">
                    <PlayCircle className="w-5 h-5 text-purple-400" />
                    <Title className="text-white">Em Andamento</Title>
                    <Badge color="purple">{inProgressMeetings.length}</Badge>
                  </Flex>
                  <div className="space-y-3">
                    {inProgressMeetings.map(renderMeetingCard)}
                  </div>
                </Card>
              </FadeIn>
            )}

            {/* Upcoming */}
            <FadeIn delay={0.2}>
              <Card className="bg-gray-900/50 border-gray-800">
                <Flex alignItems="center" className="gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <Title className="text-white">Próximas Reuniões</Title>
                  <Badge color="blue">{upcomingMeetings.length}</Badge>
                </Flex>
                {upcomingMeetings.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingMeetings.map(renderMeetingCard)}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <Text className="text-gray-400">
                      Nenhuma reunião agendada
                    </Text>
                  </div>
                )}
              </Card>
            </FadeIn>

            {/* Past Meetings */}
            {pastMeetings.length > 0 && (
              <FadeIn delay={0.25}>
                <Card className="bg-gray-900/50 border-gray-800">
                  <Flex alignItems="center" className="gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-gray-400" />
                    <Title className="text-white">Reuniões Anteriores</Title>
                    <Badge color="gray">{pastMeetings.length}</Badge>
                  </Flex>
                  <div className="space-y-3">
                    {pastMeetings.slice(0, 10).map(renderMeetingCard)}
                  </div>
                  {pastMeetings.length > 10 && (
                    <Text className="text-gray-500 text-center mt-4">
                      Mostrando 10 de {pastMeetings.length} reuniões
                    </Text>
                  )}
                </Card>
              </FadeIn>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
