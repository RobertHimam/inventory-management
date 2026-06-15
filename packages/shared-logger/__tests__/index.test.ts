import pino from 'pino';
import { createLogger } from '../src';

// Mock pino module
jest.mock('pino', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    write: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockedPino = pino as any;
let mockWrite: jest.Mock;

describe('createLogger', () => {
  beforeEach(() => {
    mockWrite = jest.fn();
    mockedPino.mockImplementation(() => ({
      write: mockWrite,
      info: mockWrite,
      warn: mockWrite,
      error: mockWrite,
      debug: mockWrite,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns logger with required methods including debug', () => {
    const logger = createLogger();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.setCorrelationId).toBe('function');
  });

  it('respects level filtering', () => {
    const logger = createLogger({ level: 'warn' });
    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');

    expect(mockWrite).toHaveBeenCalledTimes(2);
    const calls = mockWrite.mock.calls.map((call) => call[0] as any);
    expect(calls[0].level).toBe('warn');
    expect(calls[1].level).toBe('error');
  });

  it('logs at or above default level (info)', () => {
    const logger = createLogger();
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(mockWrite).toHaveBeenCalledTimes(3);
  });

  it('does not log debug when default level (info)', () => {
    const logger = createLogger();
    logger.debug('debug');
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('includes correlationId when provided in options', () => {
    const logger = createLogger({ correlationId: 'c123' });
    logger.info('msg');

    const entry = mockWrite.mock.calls[0][0] as any;
    expect(entry.correlationId).toBe('c123');
  });

  it('allows changing correlationId via setCorrelationId', () => {
    const logger = createLogger();
    logger.setCorrelationId('c456');
    logger.warn('msg');

    const entry = mockWrite.mock.calls[0][0] as any;
    expect(entry.correlationId).toBe('c456');
  });

  it('includes meta when provided', () => {
    const logger = createLogger();
    logger.info('msg', { foo: 'bar' });

    const entry = mockWrite.mock.calls[0][0] as any;
    expect(entry.meta).toEqual({ foo: 'bar' });
  });

  it('outputs structured JSON with required fields', () => {
    const logger = createLogger({ level: 'debug' });
    logger.error('oops', { code: 500 });

    const entry = mockWrite.mock.calls[0][0] as any;
    expect(entry).toHaveProperty('level', 'error');
    expect(entry).toHaveProperty('message', 'oops');
    expect(entry).toHaveProperty('timestamp');
    expect(typeof entry.timestamp).toBe('string');
    expect(entry).toHaveProperty('meta', { code: 500 });
    expect(entry).not.toHaveProperty('correlationId');
  });

  it('logs debug when level is debug', () => {
    const logger = createLogger({ level: 'debug' });
    logger.debug('debug msg');

    expect(mockWrite).toHaveBeenCalledTimes(1);
    const entry = mockWrite.mock.calls[0][0] as any;
    expect(entry.level).toBe('debug');
  });
});
