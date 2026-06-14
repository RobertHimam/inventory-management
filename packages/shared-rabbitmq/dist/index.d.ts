export declare class RabbitMQConnection {
    private url;
    private connection?;
    private channel?;
    constructor(url: string);
    connect(): Promise<void>;
    close(): Promise<void>;
    getChannel(): any;
}
export declare class EventBus {
    private exchange;
    private connection;
    private dlxExchange;
    constructor(connection: RabbitMQConnection, exchange: string);
    publish(eventType: string, payload: any, correlationId?: string): Promise<void>;
    subscribe(eventType: string, handler: (payload: any, headers: Record<string, any>, correlationId?: string) => void): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map