import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export class AuditService {
  /**
   * Records an immutable audit log entry for state transitions, price updates,
   * or administrative modifications.
   */
  static async log(params: {
    userId?: string | null;
    userEmail?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    beforeState?: any;
    afterState?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          userEmail: params.userEmail,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          beforeState: params.beforeState ? JSON.parse(JSON.stringify(params.beforeState)) : null,
          afterState: params.afterState ? JSON.parse(JSON.stringify(params.afterState)) : null,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (err) {
      logger.error({ err, params }, 'Failed to record audit log');
    }
  }
}
