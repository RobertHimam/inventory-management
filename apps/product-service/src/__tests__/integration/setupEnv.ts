process.env.NODE_ENV = 'test';
process.env.PORT = '3005';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/product-test-auth';
process.env.PRODUCT_DB = 'product-test-auth';
process.env.RABBITMQ_URL = 'amqp://localhost:5672';
process.env.RABBITMQ_EXCHANGE = 'test-exchange';
process.env.JWT_SECRET = 'test-auth-secret-key-1234';
