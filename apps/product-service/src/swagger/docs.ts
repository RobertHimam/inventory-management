import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Product Service API',
    version: '1.0.0',
  },
  servers: [{ url: '/api/v1' }],
  tags: [{ name: 'Products', description: 'Product operations' }],
};

const options = {
  swaggerDefinition,
  apis: ['./src/**/*.ts'],
};

const swaggerDocs = swaggerJsdoc(options);

export default swaggerDocs;
