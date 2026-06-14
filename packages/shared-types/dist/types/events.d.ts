export interface BaseEvent {
    correlationId: string;
    timestamp: Date;
    type: string;
    version: string;
    payload: Record<string, unknown>;
}
//# sourceMappingURL=events.d.ts.map