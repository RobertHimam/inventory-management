import * as amqp from 'amqplib';
import { RabbitMQConnection, EventBus } from '../src';

jest.mock('amqplib');

describe('RabbitMQConnection', () => {
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(() => {
    mockConnection = { createChannel: jest.fn(), close: jest.fn() };
    mockChannel = {
      close: jest.fn(),
      assertExchange: jest.fn(),
      assertQueue: jest.fn(),
      bindQueue: jest.fn(),
      consume: jest.fn(),
      publish: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
    };
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);
    mockConnection.createChannel.mockResolvedValue(mockChannel);
  });

  it('connect establishes connection and channel', async () => {
    const conn = new RabbitMQConnection('amqp://localhost');
    await conn.connect();
    expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost');
    expect(mockConnection.createChannel).toHaveBeenCalled();
    expect(conn.getChannel()).toBe(mockChannel);
  });

  it('close closes channel then connection', async () => {
    const conn = new RabbitMQConnection('amqp://localhost');
    await conn.connect();
    await conn.close();
    expect(mockChannel.close).toHaveBeenCalled();
    expect(mockConnection.close).toHaveBeenCalled();
  });

  it('getChannel throws if not connected', () => {
    const conn = new RabbitMQConnection('amqp://localhost');
    expect(() => conn.getChannel()).toThrow('Channel not initialized');
  });

  it('connect closes connection if channel creation fails', async () => {
    const mockConn = {
      close: jest.fn().mockResolvedValue(undefined),
      createChannel: jest.fn().mockRejectedValue(new Error('channel fail')),
    } as any;
    (amqp.connect as jest.Mock).mockResolvedValue(mockConn);
    const conn = new RabbitMQConnection('amqp://localhost');
    await expect(conn.connect()).rejects.toThrow('channel fail');
    expect(mockConn.close).toHaveBeenCalled();
  });
});

describe('EventBus', () => {
  let mockChannel: any;
  let bus: EventBus;

  beforeEach(() => {
    mockChannel = {
      assertExchange: jest.fn(),
      assertQueue: jest.fn(),
      bindQueue: jest.fn(),
      consume: jest.fn(),
      publish: jest.fn(),
      close: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
    };
    const stubConn = {
      getChannel: () => mockChannel,
    } as any;
    bus = new EventBus(stubConn, 'test.exchange');
  });

  it('publish sends message to exchange with routing key', async () => {
    await bus.publish('ProductCreated', { id: 'p1' });
    expect(mockChannel.publish).toHaveBeenCalledWith(
      'test.exchange',
      'ProductCreated',
      expect.any(Buffer)
    );
    const buffer = mockChannel.publish.mock.calls[0][2] as Buffer;
    expect(JSON.parse(buffer.toString())).toEqual({ id: 'p1' });
  });

  it('publish includes X-Correlation-ID header when correlationId provided', async () => {
    await bus.publish('ProductCreated', { id: 'p1' }, 'corr-123');
    expect(mockChannel.publish).toHaveBeenCalledWith(
      'test.exchange',
      'ProductCreated',
      expect.any(Buffer),
      { headers: { 'X-Correlation-ID': 'corr-123' } }
    );
  });

  it('subscribe sets up exchange, queues, bindings, and DLQ', async () => {
    const handler = jest.fn();
    await bus.subscribe('ProductCreated', handler);
    // DLX and DLQ
    expect(mockChannel.assertExchange).toHaveBeenNthCalledWith(1, 'test.exchange.dlx', 'fanout', {
      durable: true,
    });
    expect(mockChannel.assertQueue).toHaveBeenNthCalledWith(
      1,
      'test.exchange.ProductCreated.queue.dlq',
      { durable: true }
    );
    expect(mockChannel.bindQueue).toHaveBeenNthCalledWith(
      1,
      'test.exchange.ProductCreated.queue.dlq',
      'test.exchange.dlx',
      ''
    );
    // Main exchange and queue
    expect(mockChannel.assertExchange).toHaveBeenNthCalledWith(2, 'test.exchange', 'topic', {
      durable: true,
    });
    expect(mockChannel.assertQueue).toHaveBeenNthCalledWith(
      2,
      'test.exchange.ProductCreated.queue',
      {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'test.exchange.dlx',
          'x-dead-letter-routing-key': 'ProductCreated',
        },
      }
    );
    expect(mockChannel.bindQueue).toHaveBeenNthCalledWith(
      2,
      'test.exchange.ProductCreated.queue',
      'test.exchange',
      'ProductCreated'
    );
    expect(mockChannel.consume).toHaveBeenCalledWith(
      'test.exchange.ProductCreated.queue',
      expect.any(Function)
    );
  });

  it('subscribing calls handler with parsed payload and acks', async () => {
    const handler = jest.fn();
    await bus.subscribe('TestEvent', handler);
    const consumeCb = mockChannel.consume.mock.calls[0][1];
    const msgContent = { id: '123', name: 'test' };
    const msg = {
      content: Buffer.from(JSON.stringify(msgContent)),
      ack: jest.fn(),
      nack: jest.fn(),
    } as any;
    consumeCb(msg);
    expect(handler).toHaveBeenCalledWith(msgContent, {}, undefined);
    expect(mockChannel.ack).toHaveBeenCalledWith(msg);
  });

  it('subscribing passes headers from message to handler', async () => {
    const handler = jest.fn();
    await bus.subscribe('TestEvent', handler);
    const consumeCb = mockChannel.consume.mock.calls[0][1];
    const msgContent = { id: '123', name: 'test' };
    const headers = { 'X-Correlation-ID': 'abc', custom: 'value' };
    const msg = {
      content: Buffer.from(JSON.stringify(msgContent)),
      properties: { headers },
      ack: jest.fn(),
      nack: jest.fn(),
    } as any;
    consumeCb(msg);
    expect(handler).toHaveBeenCalledWith(msgContent, headers, 'abc');
    expect(mockChannel.ack).toHaveBeenCalledWith(msg);
  });

  it('nacks on handler error', async () => {
    const handler = jest.fn(() => {
      throw new Error('fail');
    });
    await bus.subscribe('TestEvent2', handler);
    const consumeCb = mockChannel.consume.mock.calls[0][1];
    const msg = {
      content: Buffer.from(JSON.stringify({})),
      ack: jest.fn(),
      nack: jest.fn(),
    } as any;
    consumeCb(msg);
    expect(handler).toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
  });

  it('nacks message with malformed JSON and logs error', async () => {
    const handler = jest.fn();
    await bus.subscribe('TestEvent', handler);
    const consumeCb = mockChannel.consume.mock.calls[0][1];
    const badContent = '{ invalid json';
    const msg = {
      content: Buffer.from(badContent),
      properties: {},
      ack: jest.fn(),
      nack: jest.fn(),
    } as any;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consumeCb(msg);
    expect(handler).not.toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Malformed JSON in message',
      expect.objectContaining({
        queue: 'test.exchange.TestEvent.queue',
        error: expect.any(SyntaxError),
        content: badContent,
      })
    );
    consoleSpy.mockRestore();
  });
});
