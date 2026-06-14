import { Role } from '../enums';
export interface User {
    id: string;
    email: string;
    username: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    deletedBy: string | null;
}
export interface CreateUserDto {
    email: string;
    username: string;
    password: string;
    role: Role;
}
//# sourceMappingURL=user.d.ts.map