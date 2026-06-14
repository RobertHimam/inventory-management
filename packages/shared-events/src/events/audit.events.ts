import { Event } from '../event';
import { VERSION } from '../versions';
import { z } from 'zod';
import { AuditAction } from '@inventory/shared-types';

export interface AuditLoggedPayload {
  auditId: string;
  correlationId: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
}

export const auditLoggedSchema = z.object({
  auditId: z.string(),
  correlationId: z.string(),
  userId: z.string(),
  action: z.nativeEnum(AuditAction),
  resourceType: z.string(),
  resourceId: z.string(),
});

export function createAuditLoggedEvent(
  correlationId: string,
  payload: AuditLoggedPayload
): Event<AuditLoggedPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.AUDIT_LOGGED.type,
    version: VERSION.AUDIT_LOGGED.version,
    payload,
  };
}
