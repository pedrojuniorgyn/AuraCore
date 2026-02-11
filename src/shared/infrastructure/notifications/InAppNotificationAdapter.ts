/**
 * InAppNotificationAdapter - Adapter that wraps the legacy NotificationService
 * 
 * Implements IInAppNotificationService port using the existing DB-based notifications.
 * This adapter bridges the legacy service with the DDD architecture.
 * 
 * @implements IInAppNotificationService
 * @see src/shared/domain/ports/output/IInAppNotificationService.ts
 */

import { injectable } from 'tsyringe';
import type { IInAppNotificationService, CreateNotificationParams } from '@/shared/domain/ports/output/IInAppNotificationService';
import { NotificationService as LegacyNotificationService, NotificationEvent as LegacyNotificationEvent } from '@/services/notification-service';

@injectable()
export class InAppNotificationAdapter implements IInAppNotificationService {
  private readonly legacy = new LegacyNotificationService();

  async create(params: CreateNotificationParams): Promise<void> {
    // Map port event string to legacy enum value
    const legacyEvent = params.event as LegacyNotificationEvent;
    return this.legacy.create({
      ...params,
      event: legacyEvent,
    });
  }

  async notifyImportSuccess(
    organizationId: number,
    branchId: number,
    imported: number,
    duplicates: number,
    totalValue?: number,
  ): Promise<void> {
    return this.legacy.notifyImportSuccess(organizationId, branchId, imported, duplicates, totalValue);
  }

  async notifySefazError656(organizationId: number, branchId: number): Promise<void> {
    return this.legacy.notifySefazError656(organizationId, branchId);
  }

  async notifyImportError(organizationId: number, branchId: number, error: string): Promise<void> {
    return this.legacy.notifyImportError(organizationId, branchId, error);
  }

  async notifyPayablesDueSoon(organizationId: number, count: number, totalValue: number): Promise<void> {
    return this.legacy.notifyPayablesDueSoon(organizationId, count, totalValue);
  }

  async notifyPayablesOverdue(organizationId: number, count: number, totalValue: number): Promise<void> {
    return this.legacy.notifyPayablesOverdue(organizationId, count, totalValue);
  }

  async markAsRead(notificationId: number, userId: string): Promise<void> {
    return this.legacy.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    return this.legacy.markAllAsRead(userId);
  }

  async getByUser(userId: string, unreadOnly?: boolean, limit?: number): Promise<unknown[]> {
    return this.legacy.getByUser(userId, unreadOnly, limit);
  }

  async countUnread(userId: string): Promise<number> {
    return this.legacy.countUnread(userId);
  }

  async cleanupOld(): Promise<void> {
    return this.legacy.cleanupOld();
  }
}
