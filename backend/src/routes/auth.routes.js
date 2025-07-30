const fp = require('fastify-plugin');
const { setAgeHandler } = require('../controllers/user.controller');
const authController = require('../controllers/auth.controller');
const oauthController = require('../controllers/oauth.controller');

async function authRoutes(fastify) {
  fastify.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['user', 'advertiser', 'admin'] },
        },
      },
    },
    handler: authController.register,
  });

  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
    handler: authController.login,
  });

  fastify.put('/auth/set-age', {
    preHandler: [fastify.authenticate],
    handler: setAgeHandler,
  });

  fastify.post('/auth/refresh', authController.refresh);

  fastify.post('/auth/logout', authController.logout);

  fastify.get(
    '/auth/me',
    { preHandler: [fastify.authenticate] },
    authController.getCurrentUser
  );

  // Google OAuth routes
  fastify.get('/auth/google', oauthController.googleOAuth);
  
  fastify.get('/auth/google/callback', oauthController.googleCallback);
}

module.exports = fp(authRoutes);
