process.env.NODE_ENV = 'test';
process.env.PORT = '3006';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/audit-test';
process.env.AUDIT_DB = 'audit-test';
process.env.JWT_SECRET = 'test-jwt-secret-key-1234';
process.env.RABBITMQ_URL = 'amqp://localhost:5672';
process.env.RABBITMQ_EXCHANGE = 'test-exchange';
process.env.RABBITMQ_DLQ_SUFFIX = '-dlq';
