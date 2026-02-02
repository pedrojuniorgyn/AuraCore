/**
 * Entity: Alert
 * Alertas automáticos para KPIs críticos, variâncias e action plans
 *
 * @module strategic/domain/entities
 */
import { Entity, Result } from '@/shared/domain';

export type AlertType = 'KPI_CRITICAL' | 'VARIANCE_UNFAVORABLE' | 'ACTION_PLAN_OVERDUE' | 'GOAL_STALE';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'DISMISSED';

interface AlertProps {
  organizationId: number;
  branchId: number;
  alertType: AlertType;
  severity: AlertSeverity;
  entityType: string;
  entityId: string;
  entityName: string;
  title: string;
  message: string;
  currentValue: number | null;
  thresholdValue: number | null;
  status: AlertStatus;
  sentAt: Date | null;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  dismissedAt: Date | null;
  dismissedBy: string | null;
  dismissReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateAlertProps {
  organizationId: number;
  branchId: number;
  alertType: AlertType;
  severity: AlertSeverity;
  entityType: string;
  entityId: string;
  entityName: string;
  title: string;
  message: string;
  currentValue?: number;
  thresholdValue?: number;
}

export class Alert extends Entity<string> {
  private readonly props: AlertProps;

  private constructor(id: string, props: AlertProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get alertType(): AlertType { return this.props.alertType; }
  get severity(): AlertSeverity { return this.props.severity; }
  get entityType(): string { return this.props.entityType; }
  get entityId(): string { return this.props.entityId; }
  get entityName(): string { return this.props.entityName; }
  get title(): string { return this.props.title; }
  get message(): string { return this.props.message; }
  get currentValue(): number | null { return this.props.currentValue; }
  get thresholdValue(): number | null { return this.props.thresholdValue; }
  get status(): AlertStatus { return this.props.status; }
  get sentAt(): Date | null { return this.props.sentAt; }
  get acknowledgedAt(): Date | null { return this.props.acknowledgedAt; }
  get acknowledgedBy(): string | null { return this.props.acknowledgedBy; }
  get dismissedAt(): Date | null { return this.props.dismissedAt; }
  get dismissedBy(): string | null { return this.props.dismissedBy; }
  get dismissReason(): string | null { return this.props.dismissReason; }

  // Computed properties
  get isPending(): boolean { return this.props.status === 'PENDING'; }
  get isCritical(): boolean { return this.props.severity === 'CRITICAL'; }
  get isSent(): boolean { return this.props.status === 'SENT'; }
  get isAcknowledged(): boolean { return this.props.status === 'ACKNOWLEDGED'; }
  get isDismissed(): boolean { return this.props.status === 'DISMISSED'; }

  // Business methods

  /**
   * Marca o alerta como enviado
   */
  markAsSent(): Result<void, string> {
    if (this.props.status !== 'PENDING') {
      return Result.fail('Only pending alerts can be marked as sent');
    }

    (this.props as { status: AlertStatus }).status = 'SENT';
    (this.props as { sentAt: Date }).sentAt = new Date();
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Marca o alerta como reconhecido pelo usuário
   */
  acknowledge(userId: string): Result<void, string> {
    if (!userId?.trim()) {
      return Result.fail('User ID is required');
    }

    if (this.props.status === 'DISMISSED') {
      return Result.fail('Cannot acknowledge a dismissed alert');
    }

    (this.props as { status: AlertStatus }).status = 'ACKNOWLEDGED';
    (this.props as { acknowledgedAt: Date }).acknowledgedAt = new Date();
    (this.props as { acknowledgedBy: string }).acknowledgedBy = userId;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Descarta o alerta
   */
  dismiss(userId: string, reason?: string): Result<void, string> {
    if (!userId?.trim()) {
      return Result.fail('User ID is required');
    }

    (this.props as { status: AlertStatus }).status = 'DISMISSED';
    (this.props as { dismissedAt: Date }).dismissedAt = new Date();
    (this.props as { dismissedBy: string }).dismissedBy = userId;
    (this.props as { dismissReason: string | null }).dismissReason = reason?.trim() || null;
    this.touch();

    return Result.ok(undefined);
  }

  // Factory methods

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateAlertProps, id?: string): Result<Alert, string> {
    // Validations
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Organization ID must be positive');
    }

    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Branch ID must be positive');
    }

    if (!props.title?.trim()) {
      return Result.fail('Title is required');
    }

    if (!props.message?.trim()) {
      return Result.fail('Message is required');
    }

    if (!props.entityType?.trim()) {
      return Result.fail('Entity type is required');
    }

    if (!props.entityId?.trim()) {
      return Result.fail('Entity ID is required');
    }

    if (!props.entityName?.trim()) {
      return Result.fail('Entity name is required');
    }

    const now = new Date();
    const alertId = id || crypto.randomUUID();

    const alert = new Alert(alertId, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      alertType: props.alertType,
      severity: props.severity,
      entityType: props.entityType.trim(),
      entityId: props.entityId.trim(),
      entityName: props.entityName.trim(),
      title: props.title.trim(),
      message: props.message.trim(),
      currentValue: props.currentValue ?? null,
      thresholdValue: props.thresholdValue ?? null,
      status: 'PENDING',
      sentAt: null,
      acknowledgedAt: null,
      acknowledgedBy: null,
      dismissedAt: null,
      dismissedBy: null,
      dismissReason: null,
      createdAt: now,
      updatedAt: now,
    });

    return Result.ok(alert);
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: AlertProps & { id: string }): Result<Alert, string> {
    return Result.ok(new Alert(props.id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      alertType: props.alertType,
      severity: props.severity,
      entityType: props.entityType,
      entityId: props.entityId,
      entityName: props.entityName,
      title: props.title,
      message: props.message,
      currentValue: props.currentValue,
      thresholdValue: props.thresholdValue,
      status: props.status,
      sentAt: props.sentAt,
      acknowledgedAt: props.acknowledgedAt,
      acknowledgedBy: props.acknowledgedBy,
      dismissedAt: props.dismissedAt,
      dismissedBy: props.dismissedBy,
      dismissReason: props.dismissReason,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    }, props.createdAt));
  }
}
