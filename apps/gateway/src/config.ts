function getInt(key: string): number {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid integer for environment variable ${key}: ${value}`);
  }
  return num;
}

function getBool(key: string): boolean {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid boolean for environment variable ${key}: ${value}`);
}

const required = [
  'NODE_ENV',
  'PORT',
  'AUTH_SERVICE_URL',
  'PRODUCT_SERVICE_URL',
  'INVENTORY_SERVICE_URL',
  'REPORT_SERVICE_URL',
  'NOTIFICATION_SERVICE_URL',
  'AUDIT_SERVICE_URL',
  'SSE_SERVICE_URL',
  'RABBITMQ_URL',
  'MONGODB_URI',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const config = {
  nodeEnv: process.env.NODE_ENV!,
  port: getInt('PORT'),
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
  authServiceUrl: process.env.AUTH_SERVICE_URL!,
  productServiceUrl: process.env.PRODUCT_SERVICE_URL!,
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL!,
  reportServiceUrl: process.env.REPORT_SERVICE_URL!,
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL!,
  auditServiceUrl: process.env.AUDIT_SERVICE_URL!,
  sseServiceUrl: process.env.SSE_SERVICE_URL!,
  rabbitmqUrl: process.env.RABBITMQ_URL!,
  mongodbUri: process.env.MONGODB_URI!,
  rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS ? getInt('RATE_LIMIT_WINDOW_MS') : 60000,
  rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ? getInt('RATE_LIMIT_MAX_REQUESTS') : 100,
  rateLimitAuthMax: process.env.RATE_LIMIT_AUTH_MAX ? getInt('RATE_LIMIT_AUTH_MAX') : 10,
  sseEnabled: process.env.SSE_ENABLED ? getBool('SSE_ENABLED') : true,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
};
