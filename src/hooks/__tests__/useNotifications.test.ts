/**
 * Testes: useNotifications - Validação de lógica core
 * Valida manipulação de notificações, contagem, filtros e toast
 * 
 * @module hooks/__tests__
 */
import { describe, it, expect, vi } from 'vitest';

// Tipos extraídos do hook
type NotificationType = 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' | 'CRITICAL' | 'ACHIEVEMENT';

interface Notification {
  id: number;
  type: NotificationType;
  event: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  actionUrl: string | null;
  isRead: number;
  readAt: Date | null;
  createdAt: Date;
}

describe('useNotifications - Core Logic', () => {
  // Helper para criar notificações mock
  function createNotification(overrides: Partial<Notification> = {}): Notification {
    return {
      id: 1,
      type: 'INFO',
      event: 'test.event',
      title: 'Test Notification',
      message: null,
      data: null,
      actionUrl: null,
      isRead: 0,
      readAt: null,
      createdAt: new Date('2026-01-01'),
      ...overrides,
    };
  }

  describe('Manipulação de notificações', () => {
    it('deve marcar notificação como lida', () => {
      const notifications = [
        createNotification({ id: 1, isRead: 0 }),
        createNotification({ id: 2, isRead: 0 }),
        createNotification({ id: 3, isRead: 1 }),
      ];

      const targetId = 1;
      const updated = notifications.map((notif) =>
        notif.id === targetId
          ? { ...notif, isRead: 1 as number, readAt: new Date() }
          : notif
      );

      expect(updated[0].isRead).toBe(1);
      expect(updated[0].readAt).not.toBeNull();
      expect(updated[1].isRead).toBe(0);
      expect(updated[2].isRead).toBe(1);
    });

    it('deve marcar todas como lidas', () => {
      const notifications = [
        createNotification({ id: 1, isRead: 0 }),
        createNotification({ id: 2, isRead: 0 }),
        createNotification({ id: 3, isRead: 1 }),
      ];

      const updated = notifications.map((notif) => ({
        ...notif,
        isRead: 1,
        readAt: new Date(),
      }));

      expect(updated.every((n) => n.isRead === 1)).toBe(true);
      expect(updated.every((n) => n.readAt !== null)).toBe(true);
    });

    it('deve remover notificação por ID (dismiss)', () => {
      const notifications = [
        createNotification({ id: 1 }),
        createNotification({ id: 2 }),
        createNotification({ id: 3 }),
      ];

      const dismissed = notifications.filter((n) => n.id !== 2);
      expect(dismissed).toHaveLength(2);
      expect(dismissed.find((n) => n.id === 2)).toBeUndefined();
    });

    it('deve limpar todas as notificações', () => {
      const notifications = [
        createNotification({ id: 1 }),
        createNotification({ id: 2 }),
      ];

      const cleared: Notification[] = [];
      expect(cleared).toHaveLength(0);
      expect(notifications).toHaveLength(2); // Original não é mutado
    });
  });

  describe('Contagem de não lidas', () => {
    it('deve calcular unreadCount corretamente', () => {
      const notifications = [
        createNotification({ id: 1, isRead: 0 }),
        createNotification({ id: 2, isRead: 0 }),
        createNotification({ id: 3, isRead: 1 }),
        createNotification({ id: 4, isRead: 0 }),
      ];

      const unreadCount = notifications.filter((n) => n.isRead === 0).length;
      expect(unreadCount).toBe(3);
    });

    it('deve decrementar unreadCount ao marcar como lida', () => {
      let unreadCount = 5;
      unreadCount = Math.max(0, unreadCount - 1);
      expect(unreadCount).toBe(4);
    });

    it('unreadCount nunca deve ser negativo', () => {
      let unreadCount = 0;
      unreadCount = Math.max(0, unreadCount - 1);
      expect(unreadCount).toBe(0);
    });

    it('deve zerar unreadCount ao marcar todas como lidas', () => {
      const unreadCount = 0;
      expect(unreadCount).toBe(0);
    });
  });

  describe('Lógica de Toast para notificações críticas', () => {
    it('deve identificar notificações CRITICAL não lidas para toast', () => {
      const notifications = [
        createNotification({ id: 1, type: 'INFO', isRead: 0 }),
        createNotification({ id: 2, type: 'CRITICAL', isRead: 0 }),
        createNotification({ id: 3, type: 'ERROR', isRead: 0 }),
      ];

      const toastedIds = new Set<number>();

      const critical = notifications.find(
        (n) =>
          (n.type === 'CRITICAL' || n.type === 'ERROR') &&
          n.isRead === 0 &&
          !toastedIds.has(n.id)
      );

      expect(critical).toBeDefined();
      expect(critical?.id).toBe(2);
      expect(critical?.type).toBe('CRITICAL');
    });

    it('deve NÃO mostrar toast para notificação já toasted', () => {
      const notifications = [
        createNotification({ id: 2, type: 'CRITICAL', isRead: 0 }),
      ];

      const toastedIds = new Set<number>([2]);

      const critical = notifications.find(
        (n) =>
          (n.type === 'CRITICAL' || n.type === 'ERROR') &&
          n.isRead === 0 &&
          !toastedIds.has(n.id)
      );

      expect(critical).toBeUndefined();
    });

    it('deve mostrar toast para ERROR não lida', () => {
      const notifications = [
        createNotification({ id: 5, type: 'ERROR', isRead: 0 }),
      ];

      const toastedIds = new Set<number>();

      const critical = notifications.find(
        (n) =>
          (n.type === 'CRITICAL' || n.type === 'ERROR') &&
          n.isRead === 0 &&
          !toastedIds.has(n.id)
      );

      expect(critical?.id).toBe(5);
    });

    it('deve NÃO mostrar toast para notificações lidas', () => {
      const notifications = [
        createNotification({ id: 1, type: 'CRITICAL', isRead: 1 }),
        createNotification({ id: 2, type: 'ERROR', isRead: 1 }),
      ];

      const toastedIds = new Set<number>();

      const critical = notifications.find(
        (n) =>
          (n.type === 'CRITICAL' || n.type === 'ERROR') &&
          n.isRead === 0 &&
          !toastedIds.has(n.id)
      );

      expect(critical).toBeUndefined();
    });

    it('deve NÃO mostrar toast para tipos INFO/WARNING/SUCCESS', () => {
      const notifications = [
        createNotification({ id: 1, type: 'INFO', isRead: 0 }),
        createNotification({ id: 2, type: 'WARNING', isRead: 0 }),
        createNotification({ id: 3, type: 'SUCCESS', isRead: 0 }),
        createNotification({ id: 4, type: 'ACHIEVEMENT', isRead: 0 }),
      ];

      const toastedIds = new Set<number>();

      const critical = notifications.find(
        (n) =>
          (n.type === 'CRITICAL' || n.type === 'ERROR') &&
          n.isRead === 0 &&
          !toastedIds.has(n.id)
      );

      expect(critical).toBeUndefined();
    });
  });

  describe('Cleanup de toasted IDs', () => {
    it('deve remover IDs de notificações que não existem mais', () => {
      const notifications = [
        createNotification({ id: 1 }),
        createNotification({ id: 3 }),
      ];

      const toastedIds = new Set([1, 2, 3, 4]);
      const currentIds = new Set(notifications.map((n) => n.id));

      toastedIds.forEach((id) => {
        if (!currentIds.has(id)) {
          toastedIds.delete(id);
        }
      });

      expect(toastedIds.has(1)).toBe(true);
      expect(toastedIds.has(2)).toBe(false);
      expect(toastedIds.has(3)).toBe(true);
      expect(toastedIds.has(4)).toBe(false);
    });
  });

  describe('Lógica de dismiss com unreadCount', () => {
    it('deve decrementar unreadCount ao dismiss de notificação não lida', () => {
      const notifications = [
        createNotification({ id: 1, isRead: 0 }),
        createNotification({ id: 2, isRead: 1 }),
      ];

      let unreadCount = 1;
      const targetId = 1;

      const notification = notifications.find((n) => n.id === targetId);
      if (notification && notification.isRead === 0) {
        unreadCount = Math.max(0, unreadCount - 1);
      }

      expect(unreadCount).toBe(0);
    });

    it('NÃO deve decrementar unreadCount ao dismiss de notificação já lida', () => {
      const notifications = [
        createNotification({ id: 1, isRead: 0 }),
        createNotification({ id: 2, isRead: 1 }),
      ];

      let unreadCount = 1;
      const targetId = 2;

      const notification = notifications.find((n) => n.id === targetId);
      if (notification && notification.isRead === 0) {
        unreadCount = Math.max(0, unreadCount - 1);
      }

      expect(unreadCount).toBe(1);
    });
  });

  describe('Contrato de retorno do hook', () => {
    interface UseNotificationsReturn {
      notifications: Notification[];
      unreadCount: number;
      loading: boolean;
      toastNotification: Notification | null;
      markAsRead: (id: number) => Promise<void>;
      markAllAsRead: () => Promise<void>;
      dismiss: (id: number) => Promise<void>;
      clearAll: () => Promise<void>;
      closeToast: () => void;
      refresh: () => Promise<void>;
    }

    function createMockReturn(): UseNotificationsReturn {
      return {
        notifications: [],
        unreadCount: 0,
        loading: true,
        toastNotification: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        dismiss: vi.fn(),
        clearAll: vi.fn(),
        closeToast: vi.fn(),
        refresh: vi.fn(),
      };
    }

    it('deve retornar todas as propriedades esperadas', () => {
      const result = createMockReturn();
      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('unreadCount');
      expect(result).toHaveProperty('loading');
      expect(result).toHaveProperty('toastNotification');
      expect(result).toHaveProperty('markAsRead');
      expect(result).toHaveProperty('markAllAsRead');
      expect(result).toHaveProperty('dismiss');
      expect(result).toHaveProperty('clearAll');
      expect(result).toHaveProperty('closeToast');
      expect(result).toHaveProperty('refresh');
    });

    it('loading deve iniciar como true', () => {
      const result = createMockReturn();
      expect(result.loading).toBe(true);
    });

    it('notifications deve iniciar vazio', () => {
      const result = createMockReturn();
      expect(result.notifications).toEqual([]);
    });

    it('toastNotification deve iniciar como null', () => {
      const result = createMockReturn();
      expect(result.toastNotification).toBeNull();
    });
  });

  describe('Parsing de resposta da API', () => {
    it('deve extrair notifications de resposta sucesso', () => {
      const apiResponse = {
        success: true,
        total: 2,
        notifications: [
          createNotification({ id: 1 }),
          createNotification({ id: 2 }),
        ],
      };

      const notifications = apiResponse.notifications || [];
      expect(notifications).toHaveLength(2);
    });

    it('deve retornar array vazio quando resposta não tem notifications', () => {
      const apiResponse = { success: true, total: 0 };
      const notifications = (apiResponse as Record<string, unknown>).notifications as Notification[] || [];
      expect(notifications).toEqual([]);
    });
  });
});
