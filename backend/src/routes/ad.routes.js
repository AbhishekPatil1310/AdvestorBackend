const { 
  uploadAdHandler, 
  getAdvertiserAdsHandler,updateCreditHandler
} = require('../controllers/ad.controller');
const{getAdsForUserHandler, 
  submitFeedbackHandler,getAdHistoryForUserHandler } = require('../controllers/user.controller')
  const { logAdView } = require('../controllers/AdView.controller');
  const { getAdvertiserAnalytics } = require('../controllers/adAnalytics.controller');

async function adRoutes(app) {
  // Upload ad (no auth used here, add preHandler if needed)
  app.post('/api/v1/upload-ad', uploadAdHandler);

  // Get ads for a user based on age group
  app.get('/api/v1/ads/for-user/:id', getAdsForUserHandler);
  app.get('/api/v1/ads/history/:userId', getAdHistoryForUserHandler);


  // ✅ Track ad view (increment view count)
  app.post('/api/v1/ads/view',{preHandler: [app.authenticate],handler:logAdView} );

app.get(
  '/api/v1/ads/analytics',
  { preHandler: [app.authenticate], handler: getAdvertiserAnalytics }
);
  // ✅ Submit feedback on ad
  app.post('/api/v1/ads/feedback/:adId', {
    preHandler: [app.authenticate],
    handler: submitFeedbackHandler,
  });

  // ✅ Get ads created by the advertiser (with feedback & views)
  app.get('/api/v1/ads/my-ads', {
    preHandler: [app.authenticate],
    handler: getAdvertiserAdsHandler,
  });
  app.post('/api/v1/advertiser/updateCredit', {
    preHandler: [app.authenticate],
    handler: updateCreditHandler,
  });
}

module.exports = adRoutes;
