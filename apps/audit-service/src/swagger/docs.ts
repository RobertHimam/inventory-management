import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Audit Service API',
    version: '1.0.0',
  },
  servers: [{ url: '/api/v1' }],
  tags: [{ name: 'Audit', description: 'Audit trail operations' }],
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
