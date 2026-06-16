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

const required = ['NODE_ENV', 'PORT', 'RABBITMQ_URL', 'JWT_SECRET', 'RABBITMQ_EXCHANGE'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const config = {
  nodeEnv: process.env.NODE_ENV!,
  port: getInt('PORT'),
  rabbitmqUrl: process.env.RABBITMQ_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  rabbitmqExchange: process.env.RABBITMQ_EXCHANGE!,
};
