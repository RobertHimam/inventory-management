import { Role, AuditAction } from '../enums';

export interface AuditLog {
  id: string;
  correlationId: string;
  userId: string;
  username: string;
  role: Role;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  createdAt: string;
}

export interface AuditQueryParams {
  page?: number;
  limit?: number;
  userId?: string;
  username?: string;
  role?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface AuditListResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
