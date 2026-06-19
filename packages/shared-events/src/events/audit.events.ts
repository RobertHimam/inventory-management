import { Event } from '../event';
import { VERSION } from '../versions';
import { z } from 'zod';
import { Role, AuditAction } from '@inventory/shared-types';

export interface AuditLoggedPayload {
  auditId: string;
  correlationId: string;
  userId: string;
  username: string;
  role: Role;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export const auditLoggedSchema = z.object({
  auditId: z.string(),
  correlationId: z.string(),
  userId: z.string(),
  username: z.string(),
  role: z.nativeEnum(Role),
  action: z.nativeEnum(AuditAction),
  resourceType: z.string(),
  resourceId: z.string(),
  before: z.record(z.any()).nullable().optional(),
  after: z.record(z.any()).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
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
