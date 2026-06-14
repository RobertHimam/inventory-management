interface Logger {
    setCorrelationId(id: string): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}
export declare function createLogger(options?: {
    level?: string;
    correlationId?: string;
}): Logger;
export {};
//# sourceMappingURL=index.d.ts.map