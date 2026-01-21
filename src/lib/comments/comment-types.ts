/**
 * Tipos para o sistema de comentários e colaboração
 * @module lib/comments/comment-types
 */

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  initials?: string;
}

export interface Mention {
  userId: string;
  userName: string;
  startIndex: number;
  endIndex: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // user IDs
  hasReacted: boolean; // current user has reacted
}

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'link' | 'entity';
  name: string;
  url?: string;
  entityType?: 'kpi' | 'action_plan' | 'goal';
  entityId?: string;
  entityName?: string;
}

export interface Comment {
  id: string;
  content: string;
  contentHtml?: string;
  author: User;
  mentions?: Mention[];
  reactions?: Reaction[];
  attachments?: Attachment[];
  parentId?: string;
  replies?: Comment[];
  replyCount?: number;
  entityType: 'kpi' | 'action_plan' | 'goal' | 'pdca_cycle';
  entityId: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  editedAt?: Date | string;
  deletedAt?: Date | string;
  // Legacy support
  likes?: number;
  likedByMe?: boolean;
}

export interface CommentFilter {
  entityType: string;
  entityId: string;
  parentId?: string | null;
  sortBy?: 'newest' | 'oldest' | 'popular';
  page?: number;
  pageSize?: number;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: User;
  action: string;
  target: {
    type: string;
    id: string;
    name: string;
    url?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
}

export type ActivityType =
  | 'comment_added'
  | 'comment_replied'
  | 'reaction_added'
  | 'kpi_updated'
  | 'kpi_created'
  | 'action_plan_created'
  | 'action_plan_updated'
  | 'action_plan_completed'
  | 'task_completed'
  | 'goal_created'
  | 'goal_achieved'
  | 'pdca_phase_changed'
  | 'mention_received';

export const REACTIONS = [
  { emoji: '👍', name: 'like', label: 'Curtir' },
  { emoji: '👎', name: 'dislike', label: 'Não curtir' },
  { emoji: '❤️', name: 'love', label: 'Amei' },
  { emoji: '💡', name: 'idea', label: 'Ideia' },
  { emoji: '🎯', name: 'target', label: 'Meta' },
  { emoji: '🔥', name: 'fire', label: 'Urgente' },
  { emoji: '👏', name: 'clap', label: 'Parabéns' },
  { emoji: '🚀', name: 'rocket', label: 'Lançar' },
] as const;

export type ReactionEmoji = (typeof REACTIONS)[number]['emoji'];
export type ReactionName = (typeof REACTIONS)[number]['name'];
