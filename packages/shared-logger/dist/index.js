"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
const levelOrder = { debug: 0, info: 1, warn: 2, error: 3 };
function createLogger(options) {
    const pinoLogger = (0, pino_1.default)({ level: 'debug' });
    const minLevel = levelOrder[options?.level ?? 'info'];
    let currentCorrId = options?.correlationId ?? null;
    function shouldLog(lvl) {
        return (levelOrder[lvl] ?? 0) >= minLevel;
    }
    function buildEntry(lvl, msg, meta) {
        const entry = { level: lvl, message: msg, timestamp: new Date().toISOString() };
        if (currentCorrId)
            entry.correlationId = currentCorrId;
        if (meta)
            entry.meta = meta;
        return entry;
    }
    function log(lvl, msg, meta) {
        if (!shouldLog(lvl))
            return;
        const entry = buildEntry(lvl, msg, meta);
        pinoLogger.write(entry);
    }
    return {
        setCorrelationId(id) { currentCorrId = id; },
        info(msg, meta) { log('info', msg, meta); },
        warn(msg, meta) { log('warn', msg, meta); },
        error(msg, meta) { log('error', msg, meta); },
        debug(msg, meta) { log('debug', msg, meta); }
    };
}
//# sourceMappingURL=index.js.map