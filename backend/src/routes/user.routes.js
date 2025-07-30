const fp = require('fastify-plugin');
const userController = require('../controllers/user.controller');

async function userRoutes(fastify) {
  fastify.get('/profile', {
    preHandler: [fastify.authenticate],
    handler: userController.getUserProfile,
  });

  fastify.put('/edit-profile', {
    preHandler: [fastify.authenticate],
    handler: userController.updateUserProfile,
  });

  fastify.post('/diary',{
    preHandler: [fastify.authenticate],
    handler: userController.addDiaryEntry,
  });
  fastify.get('/diaryget',{
    preHandler: [fastify.authenticate],
    handler: userController.getDiaryEntries,
  });
    fastify.delete('/diary/:index',{
    preHandler: [fastify.authenticate],
    handler: userController.deleteDiaryEntry,
  });
}

module.exports = fp(userRoutes); // ✅ THIS IS REQUIRED
