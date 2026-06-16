import { z } from 'zod';
import { Role, AuditAction } from '@inventory/shared-types';

export const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  userId: z.string().optional(),
  username: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  action: z.nativeEnum(AuditAction).optional(),
  resourceType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAuditQueryDto = z.infer<typeof listAuditQuerySchema>;
