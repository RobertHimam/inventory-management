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
  'AUTH_DB',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'RABBITMQ_URL',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const config = {
  nodeEnv: process.env.NODE_ENV!,
  port: getInt('PORT'),
  mongodbUri: process.env.MONGODB_URI!,
  authDb: process.env.AUTH_DB!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN!,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN!,
  rabbitmqUrl: process.env.RABBITMQ_URL!,
};
