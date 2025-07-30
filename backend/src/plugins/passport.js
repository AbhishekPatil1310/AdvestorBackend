const fp = require('fastify-plugin');
const passport = require('../config/passport');

async function passportPlugin(fastify) {
  // Initialize Passport
  await fastify.register(require('@fastify/session'), {
    secret: fastify.config.COOKIE_SECRET || 'fallback-secret',
    cookie: { 
      secure: fastify.config.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    saveUninitialized: false,
    resave: false
  });

  // Add passport to fastify instance
  fastify.decorate('passport', passport);
  
  // Initialize passport
  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.session.passport) {
      request.session.passport = {};
    }
  });
}

module.exports = fp(passportPlugin);
