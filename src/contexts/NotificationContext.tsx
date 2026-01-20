'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useSSE } from '@/hooks/useSSE';
import type {
  Notification,
  NotificationPreferences,
  SSEEvent,
} from '@/lib/notifications/notification-types';

// ============================================================================
// State & Actions
// ============================================================================

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  preferences: NotificationPreferences;
  isConnected: boolean;
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PREFERENCES'; payload: NotificationPreferences }
  | { type: 'SET_CONNECTED'; payload: boolean };

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  sound: true,
  desktop: false,
  email: true,
  types: {},
};

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  preferences: defaultPreferences,
  isConnected: false,
};

// ============================================================================
// Reducer
// ============================================================================

function notificationReducer(
  state: NotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      const newNotifications = [action.payload, ...state.notifications].slice(0, 100);
      return {
        ...state,
        notifications: newNotifications,
        unreadCount: state.unreadCount + 1,
      };
    }

    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, readAt: new Date() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };

    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) => ({
          ...n,
          readAt: n.readAt || new Date(),
        })),
        unreadCount: 0,
      };

    case 'REMOVE_NOTIFICATION': {
      const notification = state.notifications.find((n) => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
        unreadCount:
          notification && !notification.readAt
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
      };
    }

    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };

    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter((n) => !n.readAt).length,
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };

    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface NotificationContextValue extends NotificationState {
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  requestDesktopPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface ProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: ProviderProps) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // SSE Connection
  const handleSSEMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;
        if (data.type === 'notification') {
          dispatch({ type: 'ADD_NOTIFICATION', payload: data.notification });

          // Desktop notification
          if (
            state.preferences.desktop &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification(data.notification.title, {
              body: data.notification.message,
              icon: '/icons/icon-192x192.png',
            });
          }

          // Sound for critical notifications
          if (state.preferences.sound && data.notification.priority === 'critical') {
            const audio = new Audio('/sounds/notification.mp3');
            audio.play().catch(() => {
              // Ignore autoplay errors
            });
          }
        }
      } catch (e) {
        console.error('Error parsing SSE message:', e);
      }
    },
    [state.preferences.desktop, state.preferences.sound]
  );

  const { isConnected } = useSSE({
    url: '/api/strategic/notifications/stream',
    onMessage: handleSSEMessage,
    onOpen: () => {
      dispatch({ type: 'SET_CONNECTED', payload: true });
    },
    onError: () => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
    },
  });

  // Sync connection state
  useEffect(() => {
    dispatch({ type: 'SET_CONNECTED', payload: isConnected });
  }, [isConnected]);

  // Load initial notifications
  useEffect(() => {
    async function loadNotifications() {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await fetch('/api/strategic/notifications');
        if (response.ok) {
          const data = await response.json();
          dispatch({ type: 'SET_NOTIFICATIONS', payload: data.notifications || [] });
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }

    loadNotifications();
  }, []);

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        dispatch({
          type: 'SET_PREFERENCES',
          payload: { ...defaultPreferences, ...prefs },
        });
      } catch (e) {
        console.error('Error loading notification preferences:', e);
      }
    }
  }, []);

  // Actions
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt'>) => {
      const fullNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };
      dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
    },
    []
  );

  const markAsRead = useCallback(async (id: string) => {
    dispatch({ type: 'MARK_READ', payload: id });
    try {
      await fetch(`/api/strategic/notifications/${id}/read`, { method: 'POST' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    dispatch({ type: 'MARK_ALL_READ' });
    try {
      await fetch('/api/strategic/notifications/read-all', { method: 'POST' });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    try {
      await fetch(`/api/strategic/notifications/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  }, []);

  const clearAll = useCallback(async () => {
    dispatch({ type: 'CLEAR_ALL' });
    try {
      await fetch('/api/strategic/notifications', { method: 'DELETE' });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, []);

  const updatePreferences = useCallback(
    (prefs: Partial<NotificationPreferences>) => {
      const newPrefs = { ...state.preferences, ...prefs };
      dispatch({ type: 'SET_PREFERENCES', payload: newPrefs });
      if (typeof window !== 'undefined') {
        localStorage.setItem('notification-preferences', JSON.stringify(newPrefs));
      }
    },
    [state.preferences]
  );

  const requestDesktopPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      updatePreferences({ desktop: true });
      return true;
    }

    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    updatePreferences({ desktop: granted });
    return granted;
  }, [updatePreferences]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      ...state,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
      updatePreferences,
      requestDesktopPermission,
    }),
    [
      state,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
      updatePreferences,
      requestDesktopPermission,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
