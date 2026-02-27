import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

export interface AuditEvent {
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadataJson?: Record<string, unknown>;
  requestId?: string;
}

export async function auditLog(event: AuditEvent): Promise<void> {
  try {
    await prisma.log.create({
      data: {
        actorUserId: event.actorUserId ?? null,
        action: event.action,
        entityType: event.entityType ?? null,
        entityId: event.entityId ?? null,
        metadataJson: event.metadataJson
          ? (event.metadataJson as Prisma.InputJsonObject)
          : Prisma.DbNull,
        requestId: event.requestId ?? null,
      },
    });
    logger.info({ audit: event }, `AUDIT ${event.action}`);
  } catch (err) {
    // Audit failures must never crash the main flow
    logger.error({ err, event }, 'Failed to write audit log');
  }
}
