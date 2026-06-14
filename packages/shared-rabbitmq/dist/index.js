"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = exports.RabbitMQConnection = void 0;
const amqp = __importStar(require("amqplib"));
class RabbitMQConnection {
    url;
    connection;
    channel;
    constructor(url) {
        this.url = url;
    }
    async connect() {
        let conn;
        try {
            conn = await amqp.connect(this.url);
            const channel = await conn.createChannel();
            this.connection = conn;
            this.channel = channel;
        }
        catch (err) {
            if (conn) {
                await conn.close().catch(() => { });
            }
            throw err;
        }
    }
    async close() {
        if (this.channel)
            await this.channel.close();
        if (this.connection)
            await this.connection.close();
    }
    getChannel() {
        if (!this.channel)
            throw new Error('Channel not initialized. Call connect() first.');
        return this.channel;
    }
}
exports.RabbitMQConnection = RabbitMQConnection;
class EventBus {
    exchange;
    connection;
    dlxExchange;
    constructor(connection, exchange) {
        this.connection = connection;
        this.exchange = exchange;
        this.dlxExchange = `${exchange}.dlx`;
    }
    async publish(eventType, payload, correlationId) {
        const channel = this.connection.getChannel();
        const routingKey = eventType;
        const message = Buffer.from(JSON.stringify(payload));
        if (correlationId) {
            channel.publish(this.exchange, routingKey, message, { headers: { 'X-Correlation-ID': correlationId } });
        }
        else {
            channel.publish(this.exchange, routingKey, message);
        }
    }
    async subscribe(eventType, handler) {
        const channel = this.connection.getChannel();
        const queue = `${this.exchange}.${eventType}.queue`;
        const routingKey = eventType;
        // Declare DLX and DLQ
        await channel.assertExchange(this.dlxExchange, 'fanout', { durable: true });
        await channel.assertQueue(`${queue}.dlq`, { durable: true });
        await channel.bindQueue(`${queue}.dlq`, this.dlxExchange);
        // Declare main exchange and queue with DLX argument
        await channel.assertExchange(this.exchange, 'topic', { durable: true });
        await channel.assertQueue(queue, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': this.dlxExchange,
                'x-dead-letter-routing-key': routingKey
            }
        });
        await channel.bindQueue(queue, this.exchange, routingKey);
        channel.consume(queue, (msg) => {
            if (!msg)
                return;
            try {
                const content = msg.content.toString();
                const payload = JSON.parse(content);
                const headers = msg.properties?.headers || {};
                const correlationId = headers['X-Correlation-ID'];
                handler(payload, headers, correlationId);
                msg.ack();
            }
            catch (err) {
                if (err instanceof SyntaxError) {
                    console.error('Malformed JSON in message', { queue, error: err, content: msg.content.toString().substring(0, 500) });
                }
                else {
                    console.error('Handler error', { queue, error: err });
                }
                msg.nack(false, false);
            }
        });
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=index.js.map