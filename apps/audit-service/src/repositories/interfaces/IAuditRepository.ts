import { IAuditLog } from '../../models/audit.model';
import { Role, AuditAction } from '@inventory/shared-types';

export interface AuditFindAllOptions {
  page?: number;
  limit?: number;
  userId?: string;
  username?: string;
  role?: Role;
  action?: AuditAction;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface AuditFindAllResult {
  data: IAuditLog[];
  total: number;
}

export interface IAuditRepository {
  create(auditData: Partial<IAuditLog>): Promise<IAuditLog>;
  findAll(options: AuditFindAllOptions): Promise<AuditFindAllResult>;
}
