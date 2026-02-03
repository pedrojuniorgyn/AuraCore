/**
 * usePushNotifications Hook
 * React hook para gerenciar Push Notifications
 * 
 * @module lib/push
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { pushNotificationService, type NotificationPayload } from './PushNotificationService';

export function usePushNotifications(userId?: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Verificar suporte
  useEffect(() => {
    setIsSupported(pushNotificationService.isSupported());
    if (pushNotificationService.isSupported()) {
      setPermission(pushNotificationService.getPermission());
    }
  }, []);

  // Solicitar permissão
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      const result = await pushNotificationService.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('[usePushNotifications] Error requesting permission:', error);
      throw error;
    }
  }, []);

  // Inscrever
  const subscribe = useCallback(async (): Promise<void> => {
    setIsSubscribing(true);
    try {
      const sub = await pushNotificationService.subscribe();
      setSubscription(sub);

      // Salvar no backend se userId disponível
      if (userId) {
        await pushNotificationService.saveSubscription(sub, userId);
      }
    } catch (error) {
      console.error('[usePushNotifications] Error subscribing:', error);
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  }, [userId]);

  // Cancelar inscrição
  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      if (subscription?.endpoint) {
        await pushNotificationService.deleteSubscription(subscription.endpoint);
      }
      
      const result = await pushNotificationService.unsubscribe();
      if (result) {
        setSubscription(null);
      }
    } catch (error) {
      console.error('[usePushNotifications] Error unsubscribing:', error);
      throw error;
    }
  }, [subscription]);

  // Exibir notificação local
  const showNotification = useCallback(async (payload: NotificationPayload): Promise<void> => {
    try {
      await pushNotificationService.showNotification(payload);
    } catch (error) {
      console.error('[usePushNotifications] Error showing notification:', error);
      throw error;
    }
  }, []);

  return {
    isSupported,
    permission,
    subscription,
    isSubscribing,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  };
}
