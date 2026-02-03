/**
 * Push Notification Service
 * Gerencia Web Push API e notificações
 * 
 * @module lib/push
 */

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class PushNotificationService {
  private static instance: PushNotificationService | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  
  // VAPID Public Key (será gerado no backend)
  // TODO: Mover para variável de ambiente
  private readonly VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  private constructor() {
    // Singleton
  }

  /**
   * Obtém instância singleton
   */
  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Verifica se Push Notifications são suportadas
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false; // Server-side
    }

    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Verifica permissão de notificação
   */
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }

    return Notification.permission;
  }

  /**
   * Solicita permissão para notificações
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    console.log('[PushNotification] Permission:', permission);
    return permission;
  }

  /**
   * Registra Service Worker (necessário para Push)
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (this.registration) {
      return this.registration;
    }

    if (!this.isSupported()) {
      throw new Error('Service Worker not supported');
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      console.log('[PushNotification] Service Worker ready');
      return this.registration;
    } catch (error) {
      console.error('[PushNotification] Error registering service worker:', error);
      throw error;
    }
  }

  /**
   * Inscreve usuário para Push Notifications
   */
  public async subscribe(): Promise<PushSubscription> {
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    const registration = await this.registerServiceWorker();

    try {
      // Verificar se já existe subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('[PushNotification] Using existing subscription');
        return existingSubscription;
      }

      // Criar nova subscription
      if (!this.VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key not configured');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY) as BufferSource,
      });

      console.log('[PushNotification] New subscription created');
      return subscription;
    } catch (error) {
      console.error('[PushNotification] Error subscribing:', error);
      throw error;
    }
  }

  /**
   * Cancela inscrição de Push Notifications
   */
  public async unsubscribe(): Promise<boolean> {
    const registration = await this.registerServiceWorker();
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return false;
    }

    const result = await subscription.unsubscribe();
    console.log('[PushNotification] Unsubscribed:', result);
    return result;
  }

  /**
   * Exibe notificação local (não requer Push)
   */
  public async showNotification(payload: NotificationPayload): Promise<void> {
    const permission = this.getPermission();
    
    if (permission !== 'granted') {
      console.warn('[PushNotification] Permission not granted');
      return;
    }

    const registration = await this.registerServiceWorker();

    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      tag: payload.tag,
      data: payload.data,
      // @ts-expect-error - NotificationAction is part of spec but not in TS types yet
      actions: payload.actions,
      vibrate: [200, 100, 200],
      requireInteraction: false,
    });

    console.log('[PushNotification] Notification shown:', payload.title);
  }

  /**
   * Envia subscription para backend (salvar no banco)
   */
  public async saveSubscription(
    subscription: PushSubscription,
    userId: string
  ): Promise<void> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save subscription: ${response.status}`);
      }

      console.log('[PushNotification] Subscription saved to backend');
    } catch (error) {
      console.error('[PushNotification] Error saving subscription:', error);
      throw error;
    }
  }

  /**
   * Remove subscription do backend
   */
  public async deleteSubscription(endpoint: string): Promise<void> {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete subscription: ${response.status}`);
      }

      console.log('[PushNotification] Subscription deleted from backend');
    } catch (error) {
      console.error('[PushNotification] Error deleting subscription:', error);
      throw error;
    }
  }

  /**
   * Helper: Converte base64 VAPID key para Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();
