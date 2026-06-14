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
    createdAt: Date;
}
//# sourceMappingURL=audit.d.ts.map