import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Inventory Service API',
    version: '1.0.0',
    description: 'Inventory operations for Inventory Management',
    contact: {
      name: 'API Support',
      email: 'support@inventory-management.local',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Gateway',
    },
  ],
  tags: [{ name: 'Inventory', description: 'Inventory operations' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ['./src/**/*.ts'],
};

const swaggerDocs = swaggerJsdoc(options);

export default swaggerDocs;
