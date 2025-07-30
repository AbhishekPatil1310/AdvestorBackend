const Ad = require('../models/ad.model');
const { uploadToSupabase } = require('../services/supabase.service');
const User = require('../models/user.model');
const mongoose = require('mongoose');

async function uploadAdHandler(req, reply) {
  console.log('[uploadAdHandler] Handler triggered ✅');

  const parts = req.parts();
  let description = '', adType = '', advertiserEmail = '';
  let ageGroup = { min: 0, max: 0 };
  let fileName = '', fileType = '', fileBuffer;

  for await (const part of parts) {
    if (part.file) {
      fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${part.filename}`;
      fileType = part.mimetype;

      const chunks = [];
      for await (const chunk of part.file) {
        chunks.push(chunk);
      }
      fileBuffer = Buffer.concat(chunks);
    } else {
      const val = part.value;
      switch (part.fieldname) {
        case 'description': description = val; break;
        case 'adType': adType = val; break;
        case 'advertiserId': advertiserEmail = val; break; // it's email here
        case 'ageMin': ageGroup.min = Number(val); break;
        case 'ageMax': ageGroup.max = Number(val); break;
      }
    }
  }

  // ✅ Lookup user by email
  const user = await User.findOne({ email: advertiserEmail });
  if (!user) {
    console.error('[uploadAdHandler] No user found for email:', advertiserEmail);
    return reply.badRequest('Invalid advertiser email');
  }

  if (!fileBuffer || !fileType) {
    return reply.badRequest('Image file is required');
  }

  let imageUrl;
  try {
    imageUrl = await uploadToSupabase(fileBuffer, fileName, fileType);
  } catch (err) {
    console.error('[uploadAdHandler] Supabase upload failed ❌', err);
    return reply.internalServerError('Failed to upload image');
  }

  try {
    const ad = await Ad.create({
      advertiserId: user._id, // ✅ Use _id here
      imageUrl,
      description,
      adType,
      targetAgeGroup: ageGroup,
    });
    return reply.send({ success: true, ad });
  } catch (err) {
    console.error('[uploadAdHandler] MongoDB save failed ❌', err);
    return reply.internalServerError('Failed to save ad');
  }
}


async function getAdvertiserAdsHandler(req, reply) {
  try {
    const advertiserId = req.userData._id;

    const ads = await Ad.find({ advertiserId })
      .populate('feedbacks.userId', 'name') // populate user's name in feedback
      .sort({ createdAt: -1 });

    reply.send({ ads });
  } catch (err) {
    req.log.error({ err }, '[getAdvertiserAdsHandler] Failed to get advertiser ads');
    reply.internalServerError('Failed to fetch ads');
  }
}
async function updateCreditHandler(req, reply) {
  try {
    const userId = req.userData._id;
    const { credit } = req.body;

    if (typeof credit !== 'number') {
      return reply.badRequest('Invalid credit value');
    }

    const user = await User.findById(userId);
    if (!user) return reply.notFound('User not found');

    user.credit = credit;
    await user.save();

    return reply.send({
      message: 'Credit updated successfully',
      credit: user.credit,
    });
  } catch (err) {
    req.log.error({ err }, '[updateCreditHandler] Failed to update credit');
    return reply.internalServerError('Could not update credit');
  }
}

module.exports = { uploadAdHandler,getAdvertiserAdsHandler,updateCreditHandler };
