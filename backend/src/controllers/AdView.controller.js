// controllers/adView.controller.js
const Ad = require('../models/ad.model');
const AdViewLog = require('../models/AdView.model');

const User = require('../models/user.model');

async function logAdView(req, reply) {
  const { adId } = req.body;
  const userId = req.user?.sub || null; 
  const ip = req.ip;

  console.log('Logging view:', { adId, userId, ip }); 

  const recentView = await AdViewLog.findOne({
    adId,
    $or: [{ userId: userId || null }, { ip }],
    viewedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 1 day window
  });

  if (recentView) {
    return reply.send({ counted: false, message: 'Already viewed recently' });
  }

  
  const view = await AdViewLog.create({ adId, userId, ip });
  await Ad.findByIdAndUpdate(adId, { $inc: { views: 1 } });

  // Add 0.3 credit to the user
  if (userId) {
    await User.findByIdAndUpdate(userId, { $inc: { credit: 0.3 } });
  }

  return reply.send({ counted: true, message: 'View recorded' });
}


module.exports = { logAdView };
