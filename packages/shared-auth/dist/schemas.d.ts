import { z } from 'zod';
import { Role } from '@inventory/shared-types';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodOptional<z.ZodNativeEnum<typeof Role>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    role?: Role | undefined;
}, {
    email: string;
    password: string;
    role?: Role | undefined;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
//# sourceMappingURL=schemas.d.ts.map