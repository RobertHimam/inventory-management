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

const required = ['NODE_ENV', 'PORT', 'RABBITMQ_URL', 'RABBITMQ_EXCHANGE'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const config = {
  nodeEnv: process.env.NODE_ENV!,
  port: getInt('PORT'),
  rabbitmqUrl: process.env.RABBITMQ_URL!,
  rabbitmqExchange: process.env.RABBITMQ_EXCHANGE!,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://admin:admin123@mongodb:27017/audit',
  auditDb: process.env.AUDIT_DB || 'audit',
  jwtSecret: process.env.JWT_SECRET || 'test-secret',
};
