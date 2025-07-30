// routes/contact.routes.js
const { sendContactMessage } = require('../controllers/contact.controller');

async function contactRoutes(fastify, options) {
  fastify.post('/contact', sendContactMessage);
}

module.exports = contactRoutes;
