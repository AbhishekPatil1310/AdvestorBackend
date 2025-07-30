const { getAllUser, getUserBymail,updateUser,deleteUser,banUser,sendMailToUser,addCredit,getAllAdsAnalytics,getAds,deleteAd } = require('../controllers/admin.controller');
const fp = require('fastify-plugin');
async function adminRoutes(fastify) {
    fastify.get('/admin/users', getAllUser);
    fastify.get('/admin/users/search', getUserBymail);
    fastify.put('/admin/users/:id', updateUser);
    fastify.put('/admin/users/:id/ban', banUser);
    fastify.delete('/admin/users/:id', deleteUser);
    fastify.delete('/admin/ads/:id', deleteAd);
    fastify.post('/admin/mail', sendMailToUser);
    fastify.post('/admin/credit', addCredit);
    fastify.get('/admin/ads/analytics', getAllAdsAnalytics);
    fastify.get('/admin/ads/:id', getAds);
}

module.exports = fp(adminRoutes);