import { Role } from '@inventory/shared-types';

export const ROLES_PERMISSIONS: Record<Role, string[]> = {
  [Role.ADMIN]: ['*'],
  [Role.USER]: ['product:read', 'inventory:read', 'stock:in', 'stock:out'],
};

export function getPermissionsForRole(role: Role): string[] {
  return ROLES_PERMISSIONS[role] ?? [];
}
