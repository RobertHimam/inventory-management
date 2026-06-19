import * as amqp from 'amqplib';

export class RabbitMQConnection {
  private url: string;
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    let conn: amqp.ChannelModel | null = null;
    try {
      conn = await amqp.connect(this.url);
      const channel = await conn.createChannel();
      this.connection = conn;
      this.channel = channel;
    } catch (err) {
      if (conn) {
        await conn.close().catch(() => {});
      }
      throw err;
    }
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  getChannel(): amqp.Channel {
    if (!this.channel) throw new Error('Channel not initialized. Call connect() first.');
    return this.channel;
  }
}

export class EventBus {
  private exchange: string;
  private connection: RabbitMQConnection;
  private dlxExchange: string;

  constructor(connection: RabbitMQConnection, exchange: string) {
    this.connection = connection;
    this.exchange = exchange;
    this.dlxExchange = `${exchange}.dlx`;
  }

  async publish(eventType: string, payload: unknown, correlationId?: string): Promise<void> {
    const channel = this.connection.getChannel();
    const routingKey = eventType;
    const message = Buffer.from(JSON.stringify(payload));
    if (correlationId) {
      channel.publish(this.exchange, routingKey, message, {
        headers: { 'X-Correlation-ID': correlationId },
      });
    } else {
      channel.publish(this.exchange, routingKey, message);
    }
  }

  async subscribe(
    eventType: string,
    handler: (payload: unknown, headers: Record<string, unknown>, correlationId?: string) => void
  ): Promise<void> {
    const channel = this.connection.getChannel();
    const queue = `${this.exchange}.${eventType}.queue`;
    const routingKey = eventType;

    // Declare DLX and DLQ
    await channel.assertExchange(this.dlxExchange, 'fanout', { durable: true });
    await channel.assertQueue(`${queue}.dlq`, { durable: true });
    await channel.bindQueue(`${queue}.dlq`, this.dlxExchange, '');

    // Declare main exchange and queue with DLX argument
    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.dlxExchange,
        'x-dead-letter-routing-key': routingKey,
      },
    });
    await channel.bindQueue(queue, this.exchange, routingKey);
    await channel.consume(queue, (msg) => {
      if (!msg) return;
      try {
        const content = msg.content.toString();
        const payload = JSON.parse(content);
        const headers = msg.properties?.headers || {};
        const correlationId = headers['X-Correlation-ID'] as string | undefined;
        handler(payload, headers, correlationId);
        channel.ack(msg);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Malformed JSON in message', {
          queue,
          error: err,
          content: msg.content.toString(),
        });
        channel.nack(msg, false, false);
      }
    });
  }
}
