const { models } = require('mongoose');
const User = require('../models/user.model');
const AD = require('../models/ad.model');
const { sendMail } = require('../utils/mailer');
const AdViewLog = require('../models/AdView.model');

async function getAllUser(req, reply) {
  try {
    const user = await User.find().select('-password');
    return reply.send({ users: user });
  } catch (err) {
    req.log.error(err, '[getAllUser] failed to fetch users')
    return reply.internalServerError('Failed to fetch users');
  }
}

async function getUserBymail(req, reply) {
  const { email } = req.query;

  if (!email) {
    return reply.status(400).send({ message: 'Email query is required' });
  }

  try {
    const users = await User.find({ email: { $regex: email, $options: 'i' } }).select('-password');
    reply.send(users);
  } catch (err) {
    reply.status(500).send({ message: 'Server error' });
  }
}
async function updateUser(req, reply) {
  const { id } = req.params;
  const updates = req.body;

  try {
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) return reply.status(404).send({ message: 'User not found' });
    reply.send(user);
  } catch (err) {
    reply.status(500).send({ message: 'Update failed' });
  }
};

// Delete user
async function deleteUser(req, reply) {
  const { id } = req.params;
  try {
    await User.findByIdAndDelete(id);
    reply.send({ message: 'User deleted' });
  } catch (err) {
    reply.status(500).send({ message: 'Deletion failed' });
  }
};

// Ban user
async function banUser(req, reply) {
  const { id } = req.params;
  const { days } = req.body;

  try {
    const bannedUntil = new Date();
    bannedUntil.setDate(bannedUntil.getDate() + days);

    const user = await User.findByIdAndUpdate(id, {
      ban: {
        isBanned: true,
        bannedUntil,
      },
    }, { new: true });

    reply.send(user);
  } catch (err) {
    reply.status(500).send({ message: 'Ban failed' });
  }
};




async function sendMailToUser(req, reply) {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return reply.code(400).send({ error: 'Missing fields' });
  }

  try {
    await sendMail({
      to,
      subject,
      html: `<p>${message}</p>`, // You can customize with rich HTML
    });

    reply.send({ success: true, message: 'Mail sent successfully' });
  } catch (err) {
    reply.code(500).send({ error: 'Failed to send mail' });
  }
}
async function addCredit(req, reply) {
  const { userId, amount } = req.body;
  if (!userId || !amount) {
    return reply.status(400).send({ message: 'User ID and amount are required' });
  }
  try {
    const user = await User.findById(userId)
    if (!user || user.role !== 'advertiser'){
      return reply.notFound('Advertiser not found');
    }
    user.credit += amount;
    await user.save();
        reply.send({ success: true, message: 'Credit added successfully', credit: user.credit });
  } catch (err) {
    console.error('Error adding credit:', err);
    reply.internalServerError('Failed to add credit');
  }

  }

  async function getAllAdsAnalytics(req, reply) {
  try {
    // Fetch all ads with _id, description, feedbacks
    const ads = await AD.find().select('_id description feedbacks');

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

    // Map adId to description for lookup
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
        title: ad.description,
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

    // Send analytics
    reply.send({
      viewsOverTime,
      mostViewed,
      mostLiked,
      mostDisliked,
    });
  } catch (err) {
    req.log.error(err);
    reply.internalServerError('Failed to load admin analytics');
  }
}

async function getAds(req, reply) {
  try {
    const { id } = req.params;
    console.log('Fetching ads for advertiser ID:', id);

    if (!id) {
      return reply.badRequest('Missing advertiser ID');
    }

    const ads = await AD.find({ advertiserId: id })
      .populate('advertiserId', 'name email');

    return reply.send({ ads });
  } catch (err) {
    req.log.error(err, '[getAds] failed to fetch ads');
    return reply.internalServerError('Failed to fetch ads');
  }
}


// Delete an ad by ID
async function deleteAd(req, reply) {
  try {
    const { id } = req.params;
    console.log('Deleting ad with ID:', id);

    if (!id) {
      return reply.badRequest('Missing ad ID');
    }

    const deleted = await AD.findByIdAndDelete(id);

    if (!deleted) {
      return reply.notFound('Ad not found');
    }

    return reply.send({ success: true, message: 'Ad deleted successfully' });
  } catch (err) {
    req.log.error(err, '[deleteAd] Failed to delete ad');
    return reply.internalServerError('Failed to delete ad');
  }
}





module.exports = { getAllUser, getUserBymail, updateUser, deleteUser, banUser, sendMailToUser,addCredit,getAllAdsAnalytics,getAds,deleteAd };