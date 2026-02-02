/**
 * Mapper: AlertMapper
 * Converte entre Domain e Persistence
 *
 * @module strategic/infrastructure/persistence/mappers
 */
import { Result } from '@/shared/domain';
import { Alert, type AlertType, type AlertSeverity, type AlertStatus } from '../../../domain/entities/Alert';
import type { StrategicAlertRow, StrategicAlertInsert } from '../schemas/alert.schema';

export class AlertMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create) - ARCH-015
   */
  static toDomain(row: StrategicAlertRow): Result<Alert, string> {
    return Alert.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      alertType: row.alertType as AlertType,
      severity: row.severity as AlertSeverity,
      entityType: row.entityType,
      entityId: row.entityId,
      entityName: row.entityName,
      title: row.title,
      message: row.message,
      currentValue: row.currentValue ? Number(row.currentValue) : null,
      thresholdValue: row.thresholdValue ? Number(row.thresholdValue) : null,
      status: row.status as AlertStatus,
      sentAt: row.sentAt ? new Date(row.sentAt) : null,
      acknowledgedAt: row.acknowledgedAt ? new Date(row.acknowledgedAt) : null,
      acknowledgedBy: row.acknowledgedBy,
      dismissedAt: row.dismissedAt ? new Date(row.dismissedAt) : null,
      dismissedBy: row.dismissedBy,
      dismissReason: row.dismissReason,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: Alert): StrategicAlertInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      alertType: entity.alertType,
      severity: entity.severity,
      entityType: entity.entityType,
      entityId: entity.entityId,
      entityName: entity.entityName,
      title: entity.title,
      message: entity.message,
      currentValue: entity.currentValue !== null ? String(entity.currentValue) : null,
      thresholdValue: entity.thresholdValue !== null ? String(entity.thresholdValue) : null,
      status: entity.status,
      sentAt: entity.sentAt,
      acknowledgedAt: entity.acknowledgedAt,
      acknowledgedBy: entity.acknowledgedBy,
      dismissedAt: entity.dismissedAt,
      dismissedBy: entity.dismissedBy,
      dismissReason: entity.dismissReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
