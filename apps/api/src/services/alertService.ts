import { prisma } from '../utils/prisma';
import { AlertType, AlertSeverity } from '@prisma/client';

export class AlertService {
  /**
   * Creates an administrative system alert.
   */
  static async createAlert(params: {
    alertType: AlertType;
    severity?: AlertSeverity;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }) {
    return prisma.systemAlert.create({
      data: {
        alertType: params.alertType,
        severity: params.severity || 'MEDIUM',
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });
  }

  /**
   * Fetches unreviewed or all alerts.
   */
  static async getAlerts(unreviewedOnly: boolean = false) {
    return prisma.systemAlert.findMany({
      where: unreviewedOnly ? { isReviewed: false } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Marks an alert as reviewed by an administrator or staff member.
   */
  static async reviewAlert(id: string, reviewedBy: string) {
    return prisma.systemAlert.update({
      where: { id },
      data: {
        isReviewed: true,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }
}
