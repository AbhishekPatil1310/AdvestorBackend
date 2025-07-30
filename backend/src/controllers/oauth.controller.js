const User = require('../models/user.model');
const { generateRefreshToken } = require('../utils/token.util');
const env = require('../config/env');
const axios = require('axios');

/**
 * Helper: sets HTTP‑only auth cookies.
 */
function setAuthCookies(reply, accessToken, refreshToken) {
  const accessMaxAge = 15 * 60; // 15 minutes in seconds
  const refreshMaxAge = 7 * 24 * 60 * 60; // 7 days in seconds

  reply
    .setCookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
      maxAge: accessMaxAge,
    })
    .setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/api/v1/auth',
      maxAge: refreshMaxAge,
    });
}

/* ───────────────── Google OAuth Login ───────────────── */
module.exports.googleOAuth = async function googleOAuth(request, reply) {
  const googleAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(env.GOOGLE_CALLBACK_URL)}&` +
    `response_type=code&` +
    `scope=profile email&` +
    `access_type=offline&` +
    `prompt=consent`;

  reply.redirect(googleAuthURL);
};

/* ───────────────── Google OAuth Callback ───────────────── */
module.exports.googleCallback = async function googleCallback(request, reply) {
  try {
    const { code } = request.query;

    if (!code) {
      return reply.redirect(`${env.FRONTEND_URL}/signin?error=oauth_cancelled`);
    }

    console.log('Google OAuth Debug Info:');
    console.log('CLIENT_ID:', env.GOOGLE_CLIENT_ID);
    console.log('CLIENT_SECRET length:', env.GOOGLE_CLIENT_SECRET?.length);
    console.log('CALLBACK_URL:', env.GOOGLE_CALLBACK_URL);

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: env.GOOGLE_CALLBACK_URL,
    });

    const { access_token } = tokenResponse.data;

    // Get user info from Google
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const { id: googleId, email, name, verified_email } = userResponse.data;

    // Check if user exists
    let user = await User.findOne({
      $or: [
        { googleId },
        { email }
      ]
    });

    if (user) {
      // Update googleId if user exists but doesn't have it
      if (!user.googleId) {
        user.googleId = googleId;
        user.isEmailVerified = verified_email;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        googleId,
        name,
        email,
        password: 'google-oauth-user', // Placeholder password
        role: 'user',
        isEmailVerified: verified_email,
      });
    }

    // Generate JWT tokens
    const accessToken = await reply.jwtSign({ 
      sub: user._id, 
      role: user.role 
    });
    const refreshToken = await generateRefreshToken(user._id, reply);

    // Set auth cookies
    setAuthCookies(reply, accessToken, refreshToken);

    // Redirect to frontend dashboard
    reply.redirect(`${env.FRONTEND_URL}/dashboard`);

  } catch (error) {
    console.error('Google OAuth callback error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    reply.redirect(`${env.FRONTEND_URL}/signin?error=oauth_failed`);
  }
};
