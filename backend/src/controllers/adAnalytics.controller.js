const Ad = require('../models/ad.model');
const AdViewLog = require('../models/AdView.model');

async function getAdvertiserAnalytics(req, reply) {
  try {
    const advertiserId = req.user.sub;

    // Fetch only ad _id and title (metadata only)
const ads = await Ad.find({ advertiserId }).select('_id description feedbacks');

    const adIds = ads.map(ad => ad._id);

    // 1. Views over time (grouped by date)
    const viewsOverTime = await AdViewLog.aggregate([
      { $match: { adId: { $in: adIds } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' } },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // 2. Most viewed ads
    const mostViewedRaw = await AdViewLog.aggregate([
      { $match: { adId: { $in: adIds } } },
      {
        $group: {
          _id: '$adId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Create title lookup
    const adTitleMap = {};
    ads.forEach(ad => {
adTitleMap[ad._id.toString()] = ad.description;
    });

    const mostViewed = mostViewedRaw.map(view => ({
      title: adTitleMap[view._id.toString()] || 'Unknown',
      count: view.count,
    }));

    // 3. Feedbacks (like/dislike) from embedded arrays
const feedbackCounts = ads.map(ad => {
  const feedbacks = ad.feedbacks || [];
  const like = feedbacks.filter(f => f.sentiment === 'like').length;
  const dislike = feedbacks.filter(f => f.sentiment === 'dislike').length;
  return {
    title: ad.description, // fix: use description
    like,
    dislike,
  };
});


    const mostLiked = [...feedbackCounts]
      .sort((a, b) => b.like - a.like)
      .slice(0, 5)
      .map(f => ({ title: f.title, count: f.like }));

    const mostDisliked = [...feedbackCounts]
      .sort((a, b) => b.dislike - a.dislike)
      .slice(0, 5)
      .map(f => ({ title: f.title, count: f.dislike }));

    // Send all data
    reply.send({
      viewsOverTime,
      mostViewed,
      mostLiked,
      mostDisliked,
    });
  } catch (err) {
    req.log.error(err);
    reply.internalServerError('Failed to load analytics');
  }
}

module.exports = { getAdvertiserAnalytics };
