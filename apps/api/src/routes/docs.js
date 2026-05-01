const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const router = express.Router();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Collaborative Team Hub API',
      version: '1.0.0',
      description: 'REST API for Collaborative Team Hub - Team collaboration platform',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'JWT access token stored in httpOnly cookie',
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
    paths: {
      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new user',
          responses: { 201: { description: 'User registered successfully' } },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login with email and password',
          responses: { 200: { description: 'Login successful' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get current authenticated user',
          responses: { 200: { description: 'Current user profile' } },
        },
      },
      '/workspaces': {
        get: {
          tags: ['Workspaces'],
          summary: 'List user workspaces',
          responses: { 200: { description: 'Workspace list' } },
        },
        post: {
          tags: ['Workspaces'],
          summary: 'Create a workspace',
          responses: { 201: { description: 'Workspace created' } },
        },
      },
      '/workspaces/{id}': {
        get: {
          tags: ['Workspaces'],
          summary: 'Get workspace details',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Workspace details' } },
        },
      },
      '/goals/workspace/{workspaceId}': {
        get: {
          tags: ['Goals'],
          summary: 'List workspace goals',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Goal list' } },
        },
      },
      '/goals': {
        post: {
          tags: ['Goals'],
          summary: 'Create a goal',
          responses: { 201: { description: 'Goal created' } },
        },
      },
      '/announcements/workspace/{workspaceId}': {
        get: {
          tags: ['Announcements'],
          summary: 'List workspace announcements',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Announcement list' } },
        },
      },
      '/action-items/workspace/{workspaceId}': {
        get: {
          tags: ['Action Items'],
          summary: 'List workspace action items',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Action item list' } },
        },
      },
      '/analytics/workspace/{workspaceId}': {
        get: {
          tags: ['Analytics'],
          summary: 'Get workspace analytics',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Workspace analytics' } },
        },
      },
    },
  },
  apis: [path.join(__dirname, '*.js')],
};

const specs = swaggerJsdoc(options);

router.use('/', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Team Hub API Docs',
}));

module.exports = router;
