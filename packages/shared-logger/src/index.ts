import pino from 'pino';

export interface Logger {
  setCorrelationId(id: string): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

const levelOrder: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function createLogger(options?: { level?: string; correlationId?: string }): Logger {
  const pinoLogger = pino({ level: 'debug' });
  const minLevel = levelOrder[options?.level ?? 'info'];
  let currentCorrId = options?.correlationId ?? null;

  function shouldLog(lvl: string): boolean {
    return (levelOrder[lvl] ?? 0) >= minLevel;
  }

  function buildEntry(
    lvl: string,
    msg: string,
    meta?: Record<string, unknown>
  ): Record<string, unknown> {
    const entry: Record<string, unknown> = {
      level: lvl,
      message: msg,
      timestamp: new Date().toISOString(),
    };
    if (currentCorrId) entry.correlationId = currentCorrId;
    if (meta) entry.meta = meta;
    return entry;
  }

  function log(lvl: string, msg: string, meta?: Record<string, unknown>) {
    if (!shouldLog(lvl)) return;
    const entry = buildEntry(lvl, msg, meta);
    if (lvl === 'error') {
      pinoLogger.error(entry);
    } else if (lvl === 'warn') {
      pinoLogger.warn(entry);
    } else if (lvl === 'debug') {
      pinoLogger.debug(entry);
    } else {
      pinoLogger.info(entry);
    }
  }

  return {
    setCorrelationId(id: string) {
      currentCorrId = id;
    },
    info(msg: string, meta?: Record<string, unknown>) {
      log('info', msg, meta);
    },
    warn(msg: string, meta?: Record<string, unknown>) {
      log('warn', msg, meta);
    },
    error(msg: string, meta?: Record<string, unknown>) {
      log('error', msg, meta);
    },
    debug(msg: string, meta?: Record<string, unknown>) {
      log('debug', msg, meta);
    },
  };
}
