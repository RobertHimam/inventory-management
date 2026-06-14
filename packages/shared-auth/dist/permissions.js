"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES_PERMISSIONS = void 0;
exports.getPermissionsForRole = getPermissionsForRole;
const shared_types_1 = require("@inventory/shared-types");
exports.ROLES_PERMISSIONS = {
    [shared_types_1.Role.ADMIN]: ['*'],
    [shared_types_1.Role.USER]: ['product:read', 'inventory:read', 'stock:in', 'stock:out'],
};
function getPermissionsForRole(role) {
    return exports.ROLES_PERMISSIONS[role] ?? [];
}
//# sourceMappingURL=permissions.js.map