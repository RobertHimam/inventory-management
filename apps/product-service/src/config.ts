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

const required = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'PRODUCT_DB',
  'RABBITMQ_URL',
  'RABBITMQ_EXCHANGE',
  'JWT_SECRET',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const config = {
  nodeEnv: process.env.NODE_ENV!,
  port: getInt('PORT'),
  mongodbUri: process.env.MONGODB_URI!,
  productDb: process.env.PRODUCT_DB!,
  rabbitmqUrl: process.env.RABBITMQ_URL!,
  rabbitmqExchange: process.env.RABBITMQ_EXCHANGE!,
  jwtSecret: process.env.JWT_SECRET!,
};
